// src/pages/MarketPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";

type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price?: number;
  market_cap?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  [k: string]: any;
};

const SORT_OPTIONS = [
  { id: "market_cap_desc", label: "Market Cap (desc)" },
  { id: "market_cap_asc", label: "Market Cap (asc)" },
  { id: "change_24h_desc", label: "24h Change (desc)" },
  { id: "change_24h_asc", label: "24h Change (asc)" },
];

export default function MarketPage(): JSX.Element {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // query UI
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<string>(SORT_OPTIONS[0].id);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);

  // derived request params
  const ids = ""; // not used, we fetch /coins/markets with params
  const vs_currency = "usd";

  useEffect(() => {
    fetchMarketData();
    // fetch every 60s
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  async function fetchMarketData(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<CoinMarket[]>(
        "https://api.coingecko.com/api/v3/coins/markets",
        {
          params: {
            vs_currency,
            order: "market_cap_desc",
            per_page: perPage,
            page,
            sparkline: true,
            price_change_percentage: "1h,24h,7d",
          },
        }
      );
      setCoins(res.data || []);
    } catch (err: any) {
      console.error("Market fetch error:", err);
      setError("Failed to load market data. Try again later.");
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }

  // client-side search + sort (API gives most data, we further adjust)
  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = coins.slice();

    if (q) {
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.symbol || "").toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "market_cap_asc":
        list.sort((a, b) => (a.market_cap ?? 0) - (b.market_cap ?? 0));
        break;
      case "change_24h_desc":
        list.sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
        break;
      case "change_24h_asc":
        list.sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0));
        break;
      case "market_cap_desc":
      default:
        list.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
        break;
    }

    return list;
  }, [coins, search, sort]);

  function formatUSD(n?: number) {
    if (n == null || Number.isNaN(n)) return "—";
    if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${n.toFixed(6)}`;
  }

  function openCoinPage(id: string) {
    window.open(`https://www.coingecko.com/en/coins/${id}`, "_blank", "noopener");
  }

  return (
    <div className="dashboard-container" style={{ paddingBottom: 60 }}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={{ margin: 0 }}>🌐 Global Crypto Market</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Live prices and sparklines — data from CoinGecko (refreshed every 60s)
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            aria-label="Search coins"
            placeholder="Search coin or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />

          <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.select}>
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={styles.selectSmall}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            Page
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={styles.pagerBtn}
              aria-label="Previous page"
            >
              ‹
            </button>
            <strong style={{ margin: "0 6px" }}>{page}</strong>
            <button onClick={() => setPage((p) => p + 1)} style={styles.pagerBtn} aria-label="Next page">›</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ paddingTop: 28 }}>Loading market data…</div>
      ) : error ? (
        <div style={{ color: "#ffb3b3", marginTop: 16 }}>{error}</div>
      ) : (
        <div style={styles.grid}>
          {filteredAndSorted.length === 0 ? (
            <div style={{ padding: 20, color: "rgba(255,255,255,0.7)" }}>No coins match your search.</div>
          ) : (
            filteredAndSorted.map((coin) => (
              <div
                key={coin.id}
                style={styles.card}
                role="button"
                onClick={() => openCoinPage(coin.id)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") openCoinPage(coin.id); }}
              >
                <div style={styles.cardTop}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={coin.image} alt={coin.name} width="36" height="36" style={{ borderRadius: 8 }} />
                    <div>
                      <div style={{ fontWeight: 800 }}>{coin.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{coin.symbol?.toUpperCase()}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800 }}>{formatUSD(coin.current_price)}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {coin.market_cap ? `$${(coin.market_cap).toLocaleString()}` : "—"}
                    </div>
                  </div>
                </div>

                <div style={styles.metricsRow}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>24h</div>
                    <div style={{ fontWeight: 700, color: (coin.price_change_percentage_24h ?? 0) >= 0 ? "#00ff88" : "#ff6666" }}>
                      {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart
                        data={(coin.sparkline_in_7d?.price || []).map((p, i) => ({ i, p }))}
                        margin={{ top: 6, right: 6, left: 6, bottom: 6 }}
                      >
                        <Line
                          type="monotone"
                          dataKey="p"
                          dot={false}
                          stroke={(coin.price_change_percentage_24h ?? 0) >= 0 ? "#00ff88" : "#ff6666"}
                          strokeWidth={2}
                        />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip formatter={(value: any) => `$${Number(value).toFixed(4)}`} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ minWidth: 110, textAlign: "right" }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>7d</div>
                    <div style={{ fontWeight: 700, color: (coin.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "#00ff88" : "#ff6666" }}>
                      {(coin.price_change_percentage_7d_in_currency ?? 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* Inline styles */
const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingTop: 6,
  },
  search: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    minWidth: 220,
  },
  select: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
  },
  selectSmall: {
    padding: "8px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#fff",
    width: 72,
    textAlign: "center" as const,
  },
  pagerBtn: {
    marginLeft: 8,
    marginRight: 2,
    padding: "2px 8px",
    borderRadius: 6,
    border: "none",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
    marginTop: 18,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.006))",
    border: "1px solid rgba(255,255,255,0.03)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    minHeight: 120,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
};
