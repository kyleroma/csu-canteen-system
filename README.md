# CSU Canteen Pre-Order & Pickup System

A two-sided web platform for Caraga State University. Students pre-order from campus canteen stalls and reserve a pickup time slot, so a short break is spent eating instead of queueing. Vendors manage their menu and stock and work incoming orders through a shared status queue.

**CSC 107 — Software Engineering 2 · Caraga State University**

---

## The problem

Campus food service is entirely walk-up. A student with a 15-minute break has to stand in line just to find out what is available, order, and then wait for it to be cooked. Vendors cook reactively, with no idea what demand looks like until someone is standing in front of them.

Three gaps:

1. **No advance ordering** — preparation only starts when the student reaches the counter
2. **No stock visibility** — sold-out items are discovered at the front of the line
3. **No shared order status** — neither side knows where an order stands until the food is handed over

## The solution

Students order against a stall's live menu and reserve a pickup slot. Vendors work those same orders through one queue. Every order moves through four states:

```
PENDING  →  PREPARING  →  READY  →  CLAIMED     (plus CANCELLED)
```

Both sides read the same status, so nobody has to ask the counter.

## Roles

| Role        | Can do                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Student** | Browse verified stalls, view menus with live stock, add to cart, reserve a pickup slot, place and track orders, cancel while still pending |
| **Vendor**  | Manage menu items and stock, toggle sold-out, generate pickup slots, work the order queue, view a daily summary                            |
| **Admin**   | Onboard stalls, verify them, open or close them, view platform totals                                                                      |

## Deliberately out of scope

- **In-app payment** — cash on pickup. A gateway means refunds, reconciliation, and dispute handling.
- **Delivery** — the food never leaves campus.
- **Native mobile apps** — mobile-friendly web only.
- **Multi-campus** — CSU Main Campus only.

---

## Stack

| Layer    | Technology                                      | Why                                                       |
| -------- | ----------------------------------------------- | --------------------------------------------------------- |
| Frontend | React (Vite), Tailwind CSS, Axios, React Router | Reusable components across three role-specific interfaces |
| Backend  | ExpressJS on Node.js                            | One language across the whole stack                       |
| Database | PostgreSQL + Sequelize ORM                      | Real transactions and row-level locking — required here   |
| Auth     | JWT (8-hour expiry) + bcryptjs                  | Stateless tokens carrying the user's role                 |

### Three-layer architecture

```
PRESENTATION   React screens
      │  HTTP + JSON, JWT in the Authorization header
APPLICATION    Express: routes → middleware → controllers → services
      │  Sequelize
DATA           PostgreSQL, six tables
```

The client never touches the database directly. Every request passes authentication and a role check before any business logic runs.

### Database

```
users ──1:1──> vendors ──1:N──> menu_items
  │               │                  │
  │               └──1:N──> pickup_slots
  │                              │
  └──1:N──> orders <──1:N────────┘
              │
              └──1:N──> order_items ──N:1──> menu_items
```

Key design decisions:

1. **One `users` table with a `role` column** — one authentication path, not three. `vendors` is a 1:1 extension for stall-specific fields.
2. **Stock lives on `menu_items`** (`stock_qty`, `is_sold_out`) — an MVP needs a count and a toggle, not stock history.
3. **`unit_price` is snapshotted onto `order_items`** — a later price change must never rewrite a past receipt.
4. **`DECIMAL(10,2)` for money, never `FLOAT`** — floating point cannot represent ₱35.10 exactly.
5. **`CASCADE` where a child is meaningless alone** (stall → menu), **`RESTRICT` on transactional records** (a user with orders cannot be deleted).

---

## The part that matters: no overselling

Two students tap "order" in the same instant. One serving is left. Naively, both requests read `stock = 1`, both succeed, and the stall has sold food it does not have.

`services/orderService.js` runs order creation inside a single transaction with row-level locks:

```js
return await sequelize.transaction(async (t) => {
  const slot = await PickupSlot.findByPk(slotId, {
    transaction: t,
    lock: t.LOCK.UPDATE, // SELECT ... FOR UPDATE
  });

  const item = await MenuItem.findByPk(line.item_id, {
    transaction: t,
    lock: t.LOCK.UPDATE, // the line that matters
  });

  if (item.stock_qty < line.quantity) throw new Error("INSUFFICIENT_STOCK");
  // ... decrement stock, book the slot, insert the order and its lines
});
```

The second request **blocks** at the lock until the first transaction commits, then re-reads the row, sees `stock = 0`, and fails cleanly with a message the student can act on. If any step fails, the whole thing rolls back.

**Verified:** two simultaneous requests against one remaining unit produced exactly one successful order and one refusal.

Cancellation runs the same pattern in reverse — stock returns, the slot frees a place, and the status changes together or not at all — and is only permitted while an order is still `PENDING`.

---

## API

All routes are prefixed with `/api`.

| Method   | Route                       | Role    | Purpose                                               |
| -------- | --------------------------- | ------- | ----------------------------------------------------- |
| POST     | `/auth/register`            | —       | Students must use `@carsu.edu.ph`                     |
| POST     | `/auth/login`               | —       | Returns a JWT carrying user id and role               |
| GET      | `/auth/me`                  | any     | Current user                                          |
| GET      | `/browse/stalls`            | student | Verified stalls only                                  |
| GET      | `/browse/stalls/:id/menu`   | student | Items with a computed `available` flag                |
| GET      | `/browse/stalls/:id/slots`  | student | Future slots with `remaining` and `is_full`           |
| POST     | `/orders`                   | student | **The transaction with row locks**                    |
| GET      | `/orders/mine`              | student | Order history                                         |
| PATCH    | `/orders/:id/cancel`        | student | Restores stock and slot capacity                      |
| GET/POST | `/vendor/menu`              | vendor  | List and create items                                 |
| PATCH    | `/vendor/menu/:id`          | vendor  | Price, stock, sold-out                                |
| GET      | `/vendor/slots`             | vendor  | Today's slots                                         |
| POST     | `/vendor/slots/generate`    | vendor  | Generate from open/close time, interval, capacity     |
| GET      | `/vendor/orders`            | vendor  | Queue grouped by status                               |
| PATCH    | `/vendor/orders/:id/status` | vendor  | Server-validated transitions                          |
| GET      | `/vendor/orders/summary`    | vendor  | Daily count and revenue                               |
| GET      | `/admin/overview`           | admin   | Platform totals                                       |
| GET      | `/admin/vendors`            | admin   | All stalls                                            |
| POST     | `/admin/vendors/onboard`    | admin   | Creates the vendor login and stall in one transaction |
| PATCH    | `/admin/vendors/:id/verify` | admin   | Make a stall visible to students                      |
| PATCH    | `/admin/vendors/:id/status` | admin   | Open or close a stall                                 |

Illegal status jumps (for example `PREPARING → CLAIMED`) are refused with `409` and the list of legal moves. Every vendor handler checks stall ownership, so a vendor cannot touch another stall's data.

`server/api.http` documents every endpoint and is runnable with the VS Code **REST Client** extension.

---

## Running it locally

**Requirements:** Node.js LTS, PostgreSQL, Git.

```bash
git clone https://github.com/kyleroma/csu-canteen-system.git
cd csu-canteen-system
```

### 1. Backend

Create the database `canteen_db` in pgAdmin, then create `server/.env`:

```
DB_NAME=canteen_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5433
JWT_SECRET=csu_canteen_dev_secret
PORT=5000
```

> **Check your port.** PostgreSQL uses 5432 by default, but installs alongside an existing server on 5433. pgAdmin → right-click the server → Properties → Connection shows the real one. Getting this wrong is the most common setup failure.

```bash
cd server
npm install
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

The API runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend

```bash
cd client
npm install
npm run dev -- --host
```

The app runs on `http://localhost:5173`. `--host` also exposes it on the local network, which is how the two-device demo is run.

### Note on time zones

`pickup_slots.start_time` is `timestamp without time zone`, so Sequelize is pinned to `+08:00` in `server/config/config.js`. Without it, a 5:00 PM slot is stored as 09:00 UTC and displays eight hours early. On a UTC host, also set `TZ=Asia/Manila`.

---

## Project status

**Built and working**

- Six-table schema with migrations and seed data
- Authentication with role-based guards
- Transactional order creation, verified under concurrency
- Order cancellation with stock and slot restore
- Student screens: browse, menu with live stock, cart, slot picker, order tracker
- Vendor screens: order queue, menu and stock, pickup times
- Admin panel: onboarding, verification, open/close

**Remaining**

- Deployment to Render
- Mobile responsive pass
- SUS usability evaluation
- One-vendor pilot run

**Known limitations**

- Pickup slots are generated per day; recurring schedules are future work
- Status updates use polling (8–10 s), not push
- Vendors are onboarded by an admin; there is no vendor self-registration

---

## Repository layout

```
client/     React app (Vite)
  src/
    api/           Axios instance with token interceptor
    context/       AuthContext
    components/    ProtectedRoute
    pages/         Login, Register, student/, vendor/, admin/
server/     Express API
  config/        Database connection
  controllers/   HTTP handling
  middleware/    Auth guards
  migrations/    Versioned schema changes
  models/        Table definitions and relationships
  routes/        URL → controller
  services/      Business logic (the order transaction)
  api.http       Runnable API documentation
```
