// Feature flags. Flip to true when the backend route is mounted.
export const AUTH_ENABLED = false;

// Backend auth routes (assumed mount: server mounts auth.router at /auth).
export const AUTH_LOGIN_PATH = "/auth/google";
export const AUTH_ME_PATH = "/auth/me";
export const AUTH_LOGOUT_PATH = "/auth/logout";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
