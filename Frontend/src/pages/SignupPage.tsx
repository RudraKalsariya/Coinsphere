// src/pages/SignupPage.tsx
import React, { useState } from "react";
import API from "../lib/api";
import { auth, googleProvider, signInWithPopup } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

type SignupForm = { name: string; email: string; password: string };
type SignupResponse = { token?: string; user?: { name?: string; email?: string } };

export default function SignupPage(): JSX.Element {
  const [form, setForm] = useState<SignupForm>({ name: "", email: "", password: "" });
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = (): string | null => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!form.email.includes("@")) return "Please enter a valid email address.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
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
      const res = await API.post("/api/auth/signup", form);
      const data = res.data as SignupResponse;
      const token = data?.token;
      if (token) {
        localStorage.setItem("token", token);
        if (data.user?.name) localStorage.setItem("userName", data.user.name);
        setMessage({ text: "✅ Signup successful — redirecting to wallet setup...", type: "success" });
        setTimeout(() => navigate("/generate-wallet"), 900);
      } else {
        console.warn("Signup response no token:", data);
        setMessage({ text: "Signup failed. No token returned.", type: "error" });
      }
    } catch (err: any) {
      console.error("Signup error:", err?.response ?? err?.message ?? err);
      const serverMsg = err?.response?.data?.error ?? err?.response?.data ?? err?.message;
      setMessage({ text: String(serverMsg ?? "Signup failed. Check console."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // If you implement Google server exchange, do it here; for now we use placeholder token
      localStorage.setItem("token", "google-login");
      if (result.user?.displayName) localStorage.setItem("userName", result.user.displayName);
      setMessage({ text: "✅ Google signup successful — redirecting...", type: "success" });
      setTimeout(() => navigate("/generate-wallet"), 900);
    } catch (err: any) {
      console.error("Google signup error:", err);
      setMessage({ text: "Google signup failed.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ margin: 0 }}>Create your account</h2>
        <p style={{ marginTop: 8, color: "rgba(255,255,255,0.75)" }}>
          Sign up to create a non-custodial wallet and start exploring crypto.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <label style={styles.label}>Full name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" style={styles.input} autoComplete="name" required disabled={loading} />

          <label style={styles.label}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={styles.input} autoComplete="email" required disabled={loading} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Password</label>
              <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Create a password (min 6 chars)" style={styles.input} autoComplete="new-password" required disabled={loading} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowPassword((s) => !s)} style={styles.toggleBtn} aria-pressed={showPassword} disabled={loading}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: 12 }} disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 12, textAlign: "center", color: "rgba(255,255,255,0.75)" }}>OR</div>

        <button onClick={handleGoogle} style={styles.googleBtn} disabled={loading} aria-label="Sign up with Google">
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

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          Already have an account? <Link to="/login" style={{ color: "#c6a9ff", textDecoration: "none" }}>Log in</Link>
        </div>
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
