# CSU Canteen — Where We Left Off

**Session ended:** ~1:40 AM, 7 Sept 2026
**Commit:** `7623ff7` — "Sprint 1: schema, migrations, models, auth with JWT and role guards"
**17 files, 3,428 lines committed.**

---

## Your environment (the details that bite if forgotten)

| Thing             | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Project path      | `C:\canteen\server`                                                                           |
| Database          | `canteen_db`                                                                                  |
| **Postgres port** | **5433** — not 5432. Webots-style gotcha, always specify it.                                  |
| DB password       | whatever you set via pgAdmin (`ALTER USER postgres...`)                                       |
| API port          | 5000                                                                                          |
| Terminal          | Git Bash inside VS Code                                                                       |
| `node` command    | use **`node.exe`** — Webots shadows plain `node` on PATH. `npm run dev` avoids this entirely. |

**Start the server:**

```
cd /c/canteen/server
npm run dev
```

Then open a _second_ terminal tab for everything else.

---

## What works right now

Six tables in PostgreSQL: `users`, `vendors`, `menu_items`, `pickup_slots`, `orders`, `order_items` — plus `SequelizeMeta`.

Three working endpoints:

| Method | Route                | Notes                                                  |
| ------ | -------------------- | ------------------------------------------------------ |
| POST   | `/api/auth/register` | bcrypt hash, rejects non-CSU email, rejects duplicates |
| POST   | `/api/auth/login`    | returns JWT, 8h expiry                                 |
| GET    | `/api/auth/me`       | protected — requires `Authorization: Bearer <token>`   |

Middleware in `middleware/auth.js`: `verifyToken` and `requireRole(...roles)`.

**Test accounts** (all password `password123`):

- `student1@carsu.edu.ph` — STUDENT
- `vendor1@carsu.edu.ph` — VENDOR
- `admin@carsu.edu.ph` — ADMIN

**Login curl, for when you need a fresh token:**

```
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"csu_email":"student1@carsu.edu.ph","password":"password123"}'
```

---

## Two things left to close Sprint 1

**1. Push to GitHub (~10 min).** The repo is local only. Create an empty repo on github.com, then:

```
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

Do this first — it's the only real risk you're carrying.

**2. Seed data (~20 min).** You have users but no stalls, menu items, or pickup slots. Sprint 2 can't be tested against an empty menu.

Also pending, but not blocking: models exist only for `User`. The other five get written as Sprint 2 needs them.

---

## Sprint 2 (next session)

The centerpiece: **`services/orderService.js`** — order creation inside one `sequelize.transaction()` with `lock: t.LOCK.UPDATE` row locks. Checks stock, decrements it, books the slot, writes the order and its lines, all atomically. Two students hitting the last serving simultaneously → exactly one succeeds.

That function is the most defensible thing in your entire project. Build it with a fresh brain.

Around it:

- Vendor: menu CRUD, stock update, sold-out toggle
- Vendor: order queue by status, one-step status advance
- Student: browse stalls, view menu with live stock, place order, track status

---

## Things you learned tonight worth remembering

- **`RESTRICT` vs `CASCADE`** — you saw Postgres refuse to delete a user with orders. That's your ERD defending itself, and it's a ready-made Q&A answer.
- **Read error stacks bottom-up** — the `config.json` crash listed `server.js → authRoutes → authController → models/index.js`. The deepest file was the actual problem.
- **`$2b$10$REPLACEME` isn't a hash** — placeholder seed rows can't log in. Real accounts must go through the API.
- **Backticks, not quotes**, for `${PORT}` template literals.
- Alarming-looking terminal output is usually fine. `npm warn deprecated`, LF/CRLF warnings, and "moderate severity vulnerabilities" are all noise. **Never run `npm audit fix --force`.**

---

Sleep well. You turned an empty folder into an authenticated API in one night.
