const TOKEN_KEY = "ndd_token";
const USER_KEY = "ndd_user";

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function saveAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
}

export function updateAuthUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getAuthUser() {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function getDefaultRouteForRole(role) {
  return "/dashboard";
}

export function hasAnyRole(userRole, allowedRoles = []) {
  if (!allowedRoles.length) {
    return true;
  }

  const normalizedUserRole = normalizeRole(userRole);
  return allowedRoles.map((role) => normalizeRole(role)).includes(normalizedUserRole);
}
