// src/pages/SellPage.tsx
import React, { useEffect, useState } from "react";
import walletService from "../utils/walletService";

type CoinDef = { id: string; symbol: string; name: string };
type Tx = {
  id: number | string;
  type: string;
  receive?: string;
  receivedUSD?: number;
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

export default function SellPage(): JSX.Element {
  const [amountUSD, setAmountUSD] = useState<string>("");
  const [selected, setSelected] = useState<string>("ETH");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // live values
  const [priceUSD, setPriceUSD] = useState<number | null>(null);
  const [qtyNeeded, setQtyNeeded] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState<boolean>(false);

  const [coinBalance, setCoinBalance] = useState<number>(0);

  useEffect(() => {
    refreshBalance();
    const onUpdate = () => refreshBalance();
    window.addEventListener("wallet-updated", onUpdate as EventListener);
    return () => window.removeEventListener("wallet-updated", onUpdate as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (!amountUSD) {
      setQtyNeeded(null);
      setPriceUSD(null);
      return;
    }
    const t = setTimeout(() => fetchPriceAndEstimate(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountUSD, selected]);

  async function refreshBalance() {
    const bal = (walletService as any).getBalance?.(selected) ?? 0;
    setCoinBalance(Number(bal));
  }

  async function fetchPriceAndEstimate() {
    const coin = COINS.find((c) => c.symbol === selected);
    if (!coin) return;
    setFetchingPrice(true);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      const data = await res.json();
      const p = data[coin.id]?.usd as number | undefined;
      if (!p) {
        setPriceUSD(null);
        setQtyNeeded(null);
        setStatus("Could not fetch price.");
        return;
      }
      setPriceUSD(p);
      const usd = Number(amountUSD || "0");
      if (usd > 0) setQtyNeeded(usd / p);
      else setQtyNeeded(null);
      setStatus("");
    } catch (err) {
      console.error("Price fetch failed", err);
      setPriceUSD(null);
      setQtyNeeded(null);
      setStatus("Price fetch failed. Check console.");
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSell(): Promise<void> {
    const usd = Number(amountUSD);
    if (!usd || usd <= 0) {
      setStatus("Enter a valid USD amount to receive.");
      return;
    }

    setLoading(true);
    setStatus("Fetching price...");

    try {
      const coin = COINS.find((c) => c.symbol === selected);
      if (!coin) throw new Error("Unsupported coin");

      // get price
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      const data = await res.json();
      const price = data[coin.id]?.usd as number | undefined;
      if (!price) throw new Error("Price fetch failed");

      const qty = usd / price;
      const have = (walletService as any).getBalance?.(selected) ?? 0;
      if (have + 1e-12 < qty) {
        setStatus(`Insufficient ${selected}. You have ${Number(have).toFixed(6)} ${selected}`);
        setLoading(false);
        return;
      }

      // perform sell in walletService: debit coin, credit USDT
      (walletService as any).debit(selected, qty);
      (walletService as any).credit("USDT", usd);

      const tx: Tx = {
        id: Date.now(),
        type: "SELL",
        receive: "USDT",
        receivedUSD: usd,
        coin: selected,
        coinAmount: qty,
        priceUSD: price,
        date: new Date().toISOString(),
      };
      (walletService as any).pushTx(tx);
      window.dispatchEvent(new Event("wallet-updated"));

      setStatus(`✅ Sold ${qty.toFixed(6)} ${selected} for $${usd.toFixed(2)}`);
      setAmountUSD("");
      refreshBalance();
      setQtyNeeded(null);
    } catch (err) {
      console.error(err);
      setStatus("Error while selling. See console.");
    } finally {
      setLoading(false);
    }
  }

  const disableSell =
    loading || !amountUSD || Number(amountUSD) <= 0 || (coinBalance <= 0 && !qtyNeeded);

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h2 style={{ margin: 0 }}>Sell Crypto (to USDT)</h2>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.75)" }}>
                Convert your coins to USDT. This is a demo — transactions are local only.
              </p>
            </div>

            <div style={styles.balanceBox}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Selected Coin Balance</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{coinBalance.toFixed(6)} {selected}</div>
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

              <label style={{ ...styles.label, marginTop: 12 }}>Amount to receive (USD)</label>
              <input
                type="number"
                placeholder="Amount in USD you want to receive"
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                min="0"
                style={styles.input}
              />

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={handleSell}
                  disabled={disableSell}
                  style={{
                    ...styles.primaryBtn,
                    opacity: disableSell ? 0.6 : 1,
                    cursor: disableSell ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Processing..." : `Receive $${Number(amountUSD || 0).toFixed(2)}`}
                </button>

                <button
                  onClick={() => { setAmountUSD(""); setQtyNeeded(null); setStatus(""); }}
                  style={styles.ghostBtn}
                >
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
                  Estimated coins required:
                  <div style={{ fontWeight: 700, marginTop: 6 }}>
                    {qtyNeeded ? `${qtyNeeded.toFixed(6)} ${selected}` : "—"}
                  </div>
                </div>

                <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
                  Quick notes:
                  <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                    <li style={{ marginBottom: 6 }}>Prices from CoinGecko (demo)</li>
                    <li style={{ marginBottom: 6 }}>Sells debit your local balance</li>
                    <li>Not a production exchange — demo only</li>
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
    minWidth: 200,
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
    background: "linear-gradient(90deg,#ff6b6b,#ff9a6b)",
    color: "#11050f",
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
    background: "rgba(255,120,120,0.04)",
    color: "#ffdede",
    fontSize: 13,
  },
};
