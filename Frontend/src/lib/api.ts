// src/lib/api.ts
import axios from "axios";

// Use Vite env var if provided; fallback to localhost:5000
const BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // set true only if your backend uses cookies
});

// Interceptor: attach JWT token from localStorage or sessionStorage
api.interceptors.request.use((config) => {
  try {
    // prefer localStorage (persistent), but allow sessionStorage for "remember me" choice
    let token = localStorage.getItem("token") || sessionStorage.getItem("token") || null;

    // ignore placeholder tokens used in dev/demo flows
    if (token && token !== "google-login" && token !== "undefined" && token !== "null") {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    } else {
      // ensure old/invalid header not sent accidentally
      if (config.headers) delete (config.headers as Record<string, any>)["Authorization"];
    }
  } catch (err) {
    // localStorage/sessionStorage might be unavailable in some envs (SSR/tests) — ignore
  }
  return config;
});

export default api;
