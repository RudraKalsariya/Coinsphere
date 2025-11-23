// src/pages/GenerateWalletPage.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import API from "../lib/api"; // typed axios wrapper
import walletService from "../utils/walletService";
import { useNavigate } from "react-router-dom";

type LocalWallet = { address: string; privateKey: string; createdAt?: string } | null;
type Message = { text: string; type?: "info" | "success" | "error" } | null;

/** Account type returned by backend (and stored locally) */
type Account = {
  name?: string;
  email?: string;
  walletAddress?: string;
  createdAt?: string;
  balances?: Record<string, number>;
  txs?: any[];
};

function shortAddress(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GenerateWalletPage(): JSX.Element {
  const [wallet, setWallet] = useState<LocalWallet>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>(null);
  const [showKey, setShowKey] = useState<boolean>(false);
  const navigate = useNavigate();

  const [name, setName] = useState<string>(localStorage.getItem("userName") || "");
  const [email, setEmail] = useState<string>(localStorage.getItem("userEmail") || "");

  useEffect(() => {
    // keep the typed fields in localStorage while user edits them (persist across redirect flows)
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
  }, [name, email]);

  const token = localStorage.getItem("token");

  const generateWallet = async (): Promise<void> => {
    setMessage(null);
    setShowKey(false);

    try {
      setLoading(true);

      // create wallet locally (client-side only)
      const newWallet = ethers.Wallet.createRandom();
      const local: LocalWallet = {
        address: newWallet.address,
        privateKey: newWallet.privateKey,
        createdAt: new Date().toISOString(),
      };

      // save locally via walletService (private key retained client-side only)
      try {
        (walletService as any).saveWalletInfo?.(local);
      } catch {
        // ignore if walletService missing
      }

      setWallet(local);
// after setWallet(local);
try {
  // persist wallet info (already in your code but keep)
  (walletService as any).saveWalletInfo?.(local);
} catch (e) {
  console.warn("saveWalletInfo failed", e);
}

// initialize per-address balances & txs so the new wallet starts clean
try {
  const addr = local.address;
  (walletService as any).saveBalancesForAddress?.(addr, { USDT: 0, ETH: 0, BTC: 0, SOL: 0 });
  (walletService as any).clearTxsForAddress?.(addr);
} catch (e) {
  console.warn("initializing balances/txs failed", e);
}

// notify the app to refresh UI
window.dispatchEvent(new Event("wallet-updated"));

      // build account object (DO NOT include privateKey)
      const account: Account = {
        name: name || undefined,
        email: email || undefined,
        walletAddress: newWallet.address,
        createdAt: local.createdAt,
         balances: { ETH: 0, BTC: 0, USDT: 0 },         // 👈 initialize empty balances
         txs: []              // 👈 optional: initialize empty transactions
      };

      // Only attempt server save if we have a likely valid token (not placeholder)
      const hasValidToken = !!token && token !== "google-login" && token !== "undefined";

      if (hasValidToken) {
        try {
          // strongly type the expected response
          const res = await API.post<{ account?: Account; message?: string }>(
            "/api/user/account",
            account
          );

          // if backend returned an account, prefer that object for caching
          const returned = res.data?.account ?? account;

          // persist locally as offline fallback
          localStorage.setItem("account", JSON.stringify(returned));
          if (returned.name) localStorage.setItem("userName", returned.name);
          if (returned.email) localStorage.setItem("userEmail", returned.email);

          setMessage({ text: "✅ Wallet and account saved to server.", type: "success" });
        } catch (err: any) {
          console.warn("Backend account save failed:", err?.message ?? err);
          // fallback: save locally
          localStorage.setItem("account", JSON.stringify(account));
          setMessage({
            text: "✅ Wallet created locally (couldn't save account to backend).",
            type: "info",
          });
        }
      } else {
        // not logged in — save locally so AccountPage can show it
        localStorage.setItem("account", JSON.stringify(account));
        setMessage({
          text: "✅ Wallet created locally. Login to save it to your account.",
          type: "info",
        });
      }
    } catch (err: any) {
      console.error("Wallet generation failed:", err?.message ?? err);
      setMessage({ text: "❌ Error generating wallet", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ text: "Copied to clipboard", type: "success" });
      window.setTimeout(() => setMessage(null), 1600);
    } catch {
      setMessage({ text: "Unable to copy", type: "error" });
    }
  };

  const downloadWallet = (w: LocalWallet) => {
    if (!w) return;
    const payload = {
      address: w.address,
      // DO NOT include privateKey when sending to server — file is for user's download only
      privateKey: w.privateKey,
      createdAt: w.createdAt,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coinsphere-wallet-${shortAddress(w.address)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>
        <div style={pageStyles.header}>
          <h1 style={{ margin: 0 }}>🔐 Generate Your Wallet</h1>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.78)" }}>
            Create a non-custodial Ethereum wallet. The private key stays in your browser unless you
            download it — do not share it.
          </p>
        </div>

        <div style={pageStyles.card}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={pageStyles.input}
            />
            <input
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={pageStyles.input}
            />
            <small style={{ alignSelf: "center", color: "rgba(255,255,255,0.6)" }}>
              These values will be saved with your account (server) if logged in.
            </small>
          </div>

          {!wallet && (
            <div style={pageStyles.centerColumn}>
              <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: 18 }}>
                Click the button below to create a fresh wallet. You can download or copy the key
                after generation.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={generateWallet}
                  disabled={loading}
                  style={{
                    ...pageStyles.button,
                    background: loading
                      ? "linear-gradient(90deg,#6b4cff,#3f00c2)"
                      : "linear-gradient(90deg,#8b19ff,#4e00c9)",
                    opacity: loading ? 0.9 : 1,
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? "Generating…" : "Generate Wallet"}
                </button>

                <button
                  onClick={() => {
                    try {
                      const tmp = ethers.Wallet.createRandom();
                      setMessage({ text: `Sample address: ${shortAddress(tmp.address)}`, type: "info" });
                      window.setTimeout(() => setMessage(null), 2200);
                    } catch {
                      setMessage({ text: "Could not create sample wallet", type: "error" });
                    }
                  }}
                  style={{ ...pageStyles.button, background: "transparent", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {wallet && (
            <>
              <div style={pageStyles.walletRow}>
                <div style={pageStyles.addrBox}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={pageStyles.smallLogo}>🪙</div>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Address</div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>{shortAddress(wallet.address)}</div>
                      <a
                        href={`https://etherscan.io/address/${wallet.address}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "rgba(198,169,255,0.95)", textDecoration: "none" }}
                      >
                        View on Etherscan
                      </a>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleCopy(wallet.address)} style={pageStyles.smallBtn}>
                      Copy Address
                    </button>

                    <button onClick={() => setShowKey((s) => !s)} style={pageStyles.smallBtn}>
                      {showKey ? "Hide Key" : "Show Private Key"}
                    </button>

                    <button onClick={() => downloadWallet(wallet)} style={pageStyles.smallBtn}>
                      Download JSON
                    </button>

                    {wallet && (
                      <button
                        onClick={() => navigate("/account")}
                        style={{
                          marginTop: 16,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        View Account
                      </button>
                    )}
                  </div>
                </div>

                <div style={pageStyles.keyBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 12 }}>Private Key</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      Created: {new Date(wallet.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>

                  <div style={pageStyles.keyValue}>
                    {showKey ? (
                      <code style={{ wordBreak: "break-all", fontSize: 13 }}>{wallet.privateKey}</code>
                    ) : (
                      <code style={{ letterSpacing: 2, fontSize: 13 }}>●●●●●●●●●●●●●●●●</code>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleCopy(wallet.privateKey)} style={pageStyles.importantBtn}>
                      Copy Private Key
                    </button>

                    <button
                      onClick={() => {
                        setMessage({
                          text: "Tip: Store this JSON file offline and never share the private key.",
                          type: "info",
                        });
                        window.setTimeout(() => setMessage(null), 2600);
                      }}
                      style={{ ...pageStyles.smallBtn, marginLeft: 4 }}
                    >
                      Backup Tips
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 16,
                padding: "10px 12px",
                borderRadius: 8,
                background:
                  message.type === "error"
                    ? "rgba(255,80,80,0.12)"
                    : message.type === "success"
                    ? "rgba(120, 255, 180, 0.08)"
                    : "rgba(160,140,255,0.06)",
                color: message.type === "error" ? "#ffb3b3" : "#e7e0ff",
                fontSize: 13,
              }}
            >
              {message.text}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center" }}>
          <small>
            This creates a local non-custodial wallet (private key is stored only in your browser unless you download it).
            Be careful — losing the private key means losing access to funds.
          </small>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const pageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "28px 18px",
  },
  container: {
    width: "100%",
    maxWidth: 980,
  },
  header: {
    marginBottom: 18,
  },
  card: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
  },
  centerColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  button: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    color: "white",
    fontWeight: 700,
    fontSize: 14,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "white",
    fontSize: 14,
    minWidth: 200,
  },
  walletRow: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
  },
  addrBox: {
    flex: 1,
    minWidth: 260,
    padding: 14,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.008))",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  keyBox: {
    flex: 1,
    minWidth: 320,
    padding: 14,
    borderRadius: 12,
    background: "rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  smallLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  smallBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "white",
    fontSize: 13,
    cursor: "pointer",
  },
  importantBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#ff6b6b,#ff9a6b)",
    color: "#11050f",
    fontWeight: 700,
    cursor: "pointer",
  },
  keyValue: {
    padding: 12,
    borderRadius: 8,
    background: "rgba(0,0,0,0.35)",
    border: "1px dashed rgba(255,255,255,0.03)",
    minHeight: 56,
    display: "flex",
    alignItems: "center",
  },
};
