const key = (userId, stallId) => `cart:${userId ?? "guest"}:${stallId}`;

export function loadCart(userId, stallId) {
  try {
    const raw = sessionStorage.getItem(key(userId, stallId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCart(userId, stallId, cart) {
  try {
    if (Object.keys(cart).length > 0) {
      sessionStorage.setItem(key(userId, stallId), JSON.stringify(cart));
    } else {
      sessionStorage.removeItem(key(userId, stallId));
    }
  } catch {
    return;
  }
}

export function clearCart(userId, stallId) {
  try {
    sessionStorage.removeItem(key(userId, stallId));
  } catch {
    return;
  }
}
