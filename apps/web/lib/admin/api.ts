import type { Me } from "./types";
import { API_URL } from "@/lib/apiUrl";

const ACCESS = "on-admin-access";
const REFRESH = "on-admin-refresh";
const ROLE = "on-admin-role";

export const API_BASE = API_URL;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function getStoredRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE);
}

export function isOwnerRole(role: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function saveSession(access: string, refresh: string, role: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  localStorage.setItem(ROLE, role);
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(ROLE);
}

function redirectToManagerLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/" && window.location.search.includes("manager=1")) return;
  window.location.assign("/?manager=1");
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH);
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearSession();
    return false;
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string; role: string };
  saveSession(data.access_token, data.refresh_token, data.role);
  return true;
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isForm) {
    headers.set("Content-Type", "application/json");
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const retry = new Headers(init.headers);
      retry.set("Authorization", `Bearer ${getAccessToken()}`);
      if (!retry.has("Content-Type") && init.body && !isForm) {
        retry.set("Content-Type", "application/json");
      }
      res = await fetch(`${API_BASE}${path}`, { ...init, headers: retry });
    }
    if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/refresh")) {
      redirectToManagerLogin();
    }
  }
  return res;
}

export async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  if (!res.ok) {
    let detail = `Erreur ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = JSON.stringify(body.detail);
    } catch {
      /* keep status */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Le serveur ne répond pas. Rechargez la page, puis réessayez.");
  }
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Identifiants invalides." : "Connexion impossible.");
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    role: string;
  };
  if (!isOwnerRole(data.role)) {
    throw new Error("Cet espace est réservé à la propriétaire.");
  }
  saveSession(data.access_token, data.refresh_token, data.role);
  return data;
}

export async function fetchMe(): Promise<Me> {
  return adminJson<Me>("/api/v1/auth/me");
}

export async function logout() {
  const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH) : null;
  try {
    if (refresh) {
      await adminFetch("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refresh }),
      });
    }
  } finally {
    clearSession();
  }
}
