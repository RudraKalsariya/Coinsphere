// src/pages/BuyPage.tsx
import React, { useEffect, useState } from "react";
import walletService from "../utils/walletService";

type CoinDef = { id: string; symbol: string; name: string };
type Tx = {
  id: number | string;
  type: string;
  payToken?: string;
  paidUSD?: number;
  coin?: string;
  coinAmount?: number;
  priceUSD?: number;
  date?: string;
  [k: string]: any;
};

const COINS: CoinDef[] = [
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

export default function BuyPage(): JSX.Element {
  const [amountUSD, setAmountUSD] = useState<string>("");
  const [selected, setSelected] = useState<string>("ETH");
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // price preview
  const [priceUSD, setPriceUSD] = useState<number | null>(null);
  const [estimatedQty, setEstimatedQty] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState<boolean>(false);

  useEffect(() => {
    // initial USDT balance
    refreshBalance();
    const onUpdate = () => refreshBalance();
    window.addEventListener("wallet-updated", onUpdate as EventListener);
    return () => window.removeEventListener("wallet-updated", onUpdate as EventListener);
  }, []);

  useEffect(() => {
    // whenever amount or selected coin changes, update estimate (debounce small)
    let t: any = null;
    if (!amountUSD) {
      setEstimatedQty(null);
      setPriceUSD(null);
      return;
    }
    t = setTimeout(() => fetchPriceAndEstimate(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountUSD, selected]);

  async function refreshBalance() {
    const b = (walletService as any).getBalance?.("USDT") || 0;
    setUsdtBalance(Number(b));
  }

  async function fetchPriceAndEstimate() {
    const coin = COINS.find((c) => c.symbol === selected);
    if (!coin) return setPriceUSD(null);
    setFetchingPrice(true);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      const data = await res.json();
      const p = data[coin.id]?.usd as number | undefined;
      if (!p) {
        setPriceUSD(null);
        setEstimatedQty(null);
        setStatus("Could not fetch price.");
        return;
      }
      setPriceUSD(p);
      const usd = Number(amountUSD || "0");
      if (usd > 0) setEstimatedQty(usd / p);
      else setEstimatedQty(null);
      setStatus("");
    } catch (err) {
      console.error("Price fetch failed", err);
      setPriceUSD(null);
      setEstimatedQty(null);
      setStatus("Price fetch failed. Check console.");
    } finally {
      setFetchingPrice(false);
    }
  }

  async function topUpUSDT(): Promise<void> {
    (walletService as any).credit("USDT", 100);
    refreshBalance();
    // small friendly non-blocking message
    setStatus("✅ Demo top-up: 100 USDT added.");
    setTimeout(() => setStatus(""), 2000);
  }

  async function handleBuy(): Promise<void> {
    const usd = Number(amountUSD);
    if (!usd || usd <= 0) {
      setStatus("Enter a valid USD amount.");
      return;
    }

    if ((walletService as any).getBalance("USDT") < usd) {
      setStatus("Insufficient USDT. Top up to proceed.");
      return;
    }

    setLoading(true);
    setStatus("Processing purchase...");

    try {
      const coin = COINS.find((c) => c.symbol === selected);
      if (!coin) throw new Error("Unsupported coin");

      // re-fetch price to avoid stale estimate
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      const data = await res.json();
      const price = data[coin.id]?.usd as number | undefined;
      if (!price) throw new Error("Price fetch failed");

      const qty = usd / price;

      // update local balances (walletService handles persistence)
      (walletService as any).debit("USDT", usd);
      (walletService as any).credit(selected, qty);

      const tx: Tx = {
        id: Date.now(),
        type: "BUY",
        payToken: "USDT",
        paidUSD: usd,
        coin: selected,
        coinAmount: qty,
        priceUSD: price,
        date: new Date().toISOString(),
      };
      (walletService as any).pushTx(tx);
      window.dispatchEvent(new Event("wallet-updated"));

      setStatus(`✅ Bought ${qty.toFixed(6)} ${selected} for $${usd.toFixed(2)}`);
      setAmountUSD("");
      refreshBalance();
      setEstimatedQty(null);
    } catch (err) {
      console.error(err);
      setStatus("Error while buying. See console.");
    } finally {
      setLoading(false);
    }
  }

  const disableBuy = loading || !amountUSD || Number(amountUSD) <= 0 || (walletService as any).getBalance("USDT") < Number(amountUSD);

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h2 style={{ margin: 0 }}>Buy Crypto (pay with USDT)</h2>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.75)" }}>
                Use your USDT balance to buy supported coins. This is a demo — no real chain interaction.
              </p>
            </div>

            <div style={styles.balanceBox}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>USDT Balance</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{usdtBalance.toFixed(2)}</div>
              <button onClick={topUpUSDT} style={styles.topUpBtn}>+ Top-up 100</button>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label style={styles.label}>Coin</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                style={styles.select}
              >
                {COINS.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>

              <label style={{...styles.label, marginTop: 12}}>Amount (USD)</label>
              <input
                type="number"
                placeholder="Amount in USD"
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                min="0"
                style={styles.input}
              />

              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={handleBuy}
                  disabled={disableBuy}
                  style={{
                    ...styles.primaryBtn,
                    opacity: disableBuy ? 0.6 : 1,
                    cursor: disableBuy ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Processing..." : `Buy ${selected}`}
                </button>

                <button onClick={() => { setAmountUSD(""); setEstimatedQty(null); setStatus(""); }} style={styles.ghostBtn}>
                  Reset
                </button>
              </div>

              {status && <div style={styles.status}>{status}</div>}
            </div>

            <div style={styles.infoCol}>
              <div style={styles.infoCard}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Live price</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {fetchingPrice ? "…" : priceUSD ? `$${priceUSD.toFixed(4)}` : "—"}
                </div>

                <div style={{ marginTop: 12, fontSize: 13 }}>
                  Estimated amount:
                  <div style={{ fontWeight: 700, marginTop: 6 }}>
                    {estimatedQty ? `${estimatedQty.toFixed(6)} ${selected}` : "—"}
                  </div>
                </div>

                <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
                  Quick info:
                  <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                    <li style={{ marginBottom: 6 }}>Prices from CoinGecko (demo)</li>
                    <li style={{ marginBottom: 6 }}>Transactions are stored locally</li>
                    <li>Not a production exchange — for learning/demo only</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    padding: 28,
    display: "flex",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: 980,
  },
  card: {
    padding: 20,
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.03)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  balanceBox: {
    textAlign: "right" as const,
    minWidth: 140,
  },
  topUpBtn: {
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(90deg,#8b19ff,#4e00c9)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  formRow: {
    display: "flex",
    gap: 18,
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
  },
  formCol: {
    flex: 1,
    minWidth: 260,
  },
  infoCol: {
    width: 300,
    minWidth: 260,
  },
  label: {
    display: "block",
    fontSize: 13,
    marginBottom: 6,
    color: "rgba(255,255,255,0.75)",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    fontSize: 14,
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
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#00c853,#00e676)",
    color: "#081014",
    fontWeight: 800,
  },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  infoCard: {
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.03)",
  },
  status: {
    marginTop: 12,
    padding: "8px 10px",
    borderRadius: 8,
    background: "rgba(198,169,255,0.06)",
    color: "#e7e0ff",
    fontSize: 13,
  },
};
