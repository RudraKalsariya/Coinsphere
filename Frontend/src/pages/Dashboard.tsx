// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import walletService from "../utils/walletService";

type DisplayCoin = { id: string; symbol: string; name: string };
type PricesMap = Record<string, { usd?: number }>;

const DISPLAY_COINS: DisplayCoin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

export default function DashboardPage(): JSX.Element {
  // readBalances now lives in walletService and returns default/fallbacks
  const [balances, setBalances] = useState<Record<string, number>>(
    (walletService as any).readBalances?.() || {}
  );
  const [prices, setPrices] = useState<PricesMap>({});
  const [totalUSD, setTotalUSD] = useState<number>(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // txs: use state so it can be refreshed when wallet-updated fires
  const [txs, setTxs] = useState<any[]>(() => (walletService as any).readTxs?.() || []);

  useEffect(() => {
    setUserName(localStorage.getItem("userName"));
  }, []);

  async function fetchPrices(): Promise<void> {
    const ids = DISPLAY_COINS.map((c) => c.id).join(",");
    setLoadingPrices(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      const data = await res.json();
      setPrices(data || {});
    } catch (err) {
      console.error("Price fetch error", err);
      setError("Failed to fetch prices.");
    } finally {
      setLoadingPrices(false);
    }
  }

  useEffect(() => {
    // initial load + interval
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);

    // listen for wallet updates (balances, txs, walletInfo)
    const onUpdate = () => {
      setBalances((walletService as any).readBalances?.() || {});
      setTxs((walletService as any).readTxs?.() || []);
    };

    window.addEventListener("wallet-updated", onUpdate as EventListener);

    // also call once to sync immediately (in case external changes happened before mount)
    onUpdate();

    return () => {
      clearInterval(interval);
      window.removeEventListener("wallet-updated", onUpdate as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recalc total whenever balances or prices change
  useEffect(() => {
    let total = 0;
    DISPLAY_COINS.forEach((c) => {
      const amt = Number(balances[c.symbol] || 0);
      const p = prices[c.id]?.usd || 0;
      total += amt * p;
    });
    total += Number(balances.USDT || 0);
    setTotalUSD(total);
  }, [balances, prices]);

  // helper to short wallet address or other strings
  function short(n: string, len = 8) {
    if (!n) return "";
    return n.length > len ? `${n.slice(0, 6)}...${n.slice(-4)}` : n;
  }

  // wallet info (address) - use walletService.getWalletInfo() which also falls back to account
  const walletInfo = (walletService as any).getWalletInfo?.() || {};

  return (
    <>
      {/* ---------- PAGE ---------- */}
      <div className="dashboard-container" style={{ paddingTop: 96, paddingBottom: 40 }}>
        <div style={styles.topRow}>
          <div style={styles.portfolioCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Portfolio value</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>${totalUSD.toFixed(2)}</div>
                <div style={{ marginTop: 8, color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                  USDT: <strong>{(Number(balances.USDT || 0)).toFixed(2)}</strong> — Wallets:{" "}
                  <strong>{Object.keys(balances).length}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={fetchPrices} style={styles.smallBtn} title="Refresh prices">
                  {loadingPrices ? "Refreshing…" : "Refresh"}
                </button>

                <button onClick={() => { window.location.href = "/buy"; }} style={styles.primaryBtn}>
                  Buy
                </button>
              </div>
            </div>

            {error && <div style={{ marginTop: 12, color: "#ffb3b3" }}>{error}</div>}
          </div>

          <div style={styles.quickCards}>
            {DISPLAY_COINS.map((c) => {
              const amt = Number(balances[c.symbol] || 0);
              const price = prices[c.id]?.usd || 0;
              const usd = amt * price;
              return (
                <div key={c.symbol} style={styles.coinCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{c.name}</div>
                      <div style={{ fontWeight: 800, marginTop: 6 }}>{amt.toFixed(6)} {c.symbol}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800 }}>{price ? `$${price.toFixed(2)}` : "—"}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                        ${usd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 18, marginTop: 22 }}>
          {/* Left — Balances & actions */}
          <div>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={{ margin: 0 }}>Balances</h3>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>Manage your tokens</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 12 }}>
                {/* USDT card */}
                <div style={styles.balanceTile}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>USDT</div>
                  <div style={{ fontWeight: 800, fontSize: 20, marginTop: 6 }}>${(Number(balances.USDT || 0)).toFixed(2)}</div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => { (walletService as any).credit?.("USDT", 50); window.dispatchEvent(new Event("wallet-updated")); }}
                      style={styles.smallBtn}
                    >
                      + Add demo USDT
                    </button>
                    <button onClick={() => (walletService as any).readBalances && console.log("balances:", (walletService as any).readBalances())} style={{ ...styles.smallBtn, marginLeft: 8 }}>
                      Debug
                    </button>
                  </div>
                </div>

                {/* other coins */}
                {DISPLAY_COINS.map((c) => (
                  <div key={c.symbol} style={styles.balanceTile}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{c.symbol}</div>
                    <div style={{ fontWeight: 800, fontSize: 20, marginTop: 6 }}>
                      {(Number(balances[c.symbol] || 0)).toFixed(6)} {c.symbol}
                    </div>
                    <div style={{ marginTop: 8, color: "rgba(255,255,255,0.7)" }}>
                      {( (Number(balances[c.symbol] || 0)) * (prices[c.id]?.usd || 0) ).toFixed(2)} USD
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions section */}
            <div style={{ ...styles.section, marginTop: 16 }}>
              <div style={styles.sectionHeader}>
                <h3 style={{ margin: 0 }}>Recent Transactions</h3>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>{txs.length} total</div>
              </div>

              {txs.length === 0 ? (
                <div style={{ padding: 18, color: "rgba(255,255,255,0.7)" }}>No transactions yet. Buy or sell to create activity.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 10 }}>
                  {txs.map((tx: any) => (
                    <li key={tx.id} style={styles.txRow}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{tx.type}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                          {tx.coin ? `${tx.coinAmount?.toFixed(6)} ${tx.coin}` : ""} {tx.paidUSD ? `— $${tx.paidUSD}` : tx.receivedUSD ? `— $${tx.receivedUSD}` : ""}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{new Date(tx.date).toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: tx.type === "BUY" ? "#aef3c0" : "#ffd2d2" }}>{tx.type === "BUY" ? "Bought" : "Sold"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right — account info */}
          <aside>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={{ margin: 0 }}>Account</h3>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>{userName ?? "Guest"}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Wallet address</div>
                <div style={{ marginTop: 8, wordBreak: "break-word", background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 8 }}>
                  {walletInfo?.address ? short(walletInfo.address) : "No wallet created"}
                </div>

                <div style={{ marginTop: 12 }}>
                  <button onClick={() => window.location.href = "/generate-wallet"} style={styles.primaryBtnFull}>Create / Replace Wallet</button>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h4 style={{ marginTop: 0 }}>Quick actions</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={styles.smallBtn} onClick={() => window.location.href = "/buy"}>Buy Crypto</button>
                <button style={styles.smallBtn} onClick={() => window.location.href = "/sell"}>Sell Crypto</button>
                <button style={styles.smallBtn} onClick={() => window.location.href = "/market"}>Open Market</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ---------- styles ---------- */
/* (styles unchanged from your original) */
const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    background: "linear-gradient(90deg,#0b0710,#150426)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    zIndex: 50,
    boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    width: "100%",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontWeight: 700,
    fontSize: 18,
    cursor: "pointer",
    color: "#f1e6ff",
  },
  nav: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  topRow: {
    display: "flex",
    gap: 16,
    alignItems: "stretch",
  },

  portfolioCard: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.03)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },

  quickCards: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    width: 360,
    minWidth: 260,
  },

  coinCard: {
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.03)",
  },

  section: {
    padding: 14,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))",
    border: "1px solid rgba(255,255,255,0.03)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  balanceTile: {
    padding: 14,
    borderRadius: 10,
    background: "rgba(255,255,255,0.02)",
  },

  txRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    background: "rgba(0,0,0,0.18)",
  },

  smallBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#00c853,#00e676)",
    color: "#081014",
    fontWeight: 800,
    cursor: "pointer",
  },

  primaryBtnFull: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 8,
  },
};
