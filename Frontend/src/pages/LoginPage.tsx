// src/pages/LoginPage.tsx
import React, { useState } from "react";
import API from "../lib/api"; // <- use centralized API client
import { auth, googleProvider, signInWithPopup } from "../firebase";

type FormState = { email: string; password: string };
type LoginResponse = { token?: string; user?: { name?: string; email?: string } };

export default function LoginPage(): JSX.Element {
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = (): string | null => {
    if (!form.email.includes("@")) return "Please enter a valid email address.";
    if (form.password.length < 4) return "Please enter your password.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setMessage({ text: v, type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await API.post("/api/auth/login", form);
      const data = res.data as LoginResponse;
      const token = data?.token;
      if (token) {
        if (remember) localStorage.setItem("token", token);
        else sessionStorage.setItem("token", token);

        if (data.user?.name) localStorage.setItem("userName", data.user.name);

        setMessage({ text: "✅ Login successful — redirecting...", type: "success" });
        setTimeout(() => (window.location.href = "/dashboard"), 800);
      } else {
        console.warn("Login response no token:", data);
        setMessage({ text: "Login failed. No token returned.", type: "error" });
      }
    } catch (err: any) {
      console.error("Login error:", err?.response ?? err?.message ?? err);
      const serverMsg = err?.response?.data?.error || err?.response?.data || err?.message;
      setMessage({ text: String(serverMsg ?? "Login failed. Check credentials."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // For a proper flow you'd exchange result.user.getIdToken() with your backend to create an app token.
      // For now we keep the placeholder flow if your backend doesn't support Google exchange.
      localStorage.setItem("token", "google-login");
      if (result.user?.displayName) localStorage.setItem("userName", result.user.displayName);
      setMessage({ text: "✅ Google login successful — redirecting...", type: "success" });
      setTimeout(() => (window.location.href = "/dashboard"), 800);
    } catch (err: any) {
      console.error("Google login error:", err);
      setMessage({ text: "Google login failed.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ margin: 0 }}>Welcome back</h2>
        <p style={{ marginTop: 8, color: "rgba(255,255,255,0.75)" }}>
          Sign in to access your CoinSphere wallet.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <label style={styles.label}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={styles.input} autoComplete="email" required />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Password</label>
              <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Your password" style={styles.input} autoComplete="current-password" required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowPassword((s) => !s)} style={styles.toggleBtn} aria-pressed={showPassword}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>

            <a href="/forgot-password" style={{ color: "#c6a9ff", fontSize: 13, textDecoration: "none" }}>
              Forgot?
            </a>
          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: 12 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 12, textAlign: "center", color: "rgba(255,255,255,0.75)" }}>OR</div>

        <button onClick={handleGoogle} style={styles.googleBtn} disabled={loading} aria-label="Sign in with Google">
          <span style={{ marginRight: 8 }}>🔴</span> Continue with Google
        </button>

        {message && (
          <div role="status" aria-live="polite" style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 10,
            background: message.type === "error" ? "rgba(255,80,80,0.08)" : message.type === "success" ? "rgba(120,255,180,0.06)" : "rgba(200,180,255,0.04)",
            color: message.type === "error" ? "#ffdede" : "#e8f9ef", fontSize: 14, textAlign: "center"
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

/* styles */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "#fff",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.03)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
  },
  label: {
    display: "block",
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    fontSize: 14,
  },
  toggleBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  primaryBtn: {
    width: "100%",
    padding: "10px 14px",
    marginTop: 8,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  googleBtn: {
    width: "100%",
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};
