// src/utils/walletService.ts
export const STORAGE_KEYS = {
  // legacy single-store keys (kept for backwards compatibility)
  BALANCES: "cs_balances_v1",
  TXS: "cs_txs_v1",
  WALLET_INFO: "cs_walletinfo_v1",

  // new per-address keys / prefixes
  BALANCES_PREFIX: "cs_balances_addr:",
  TXS_PREFIX: "cs_txs_addr:",
  ACTIVE_ADDRESS: "cs_active_address_v1",
} as const;

// Demo default balances — adjust as you like.
// NOTE: newly created wallets should be initialised when you create the wallet.
// DEFAULT_BALANCES kept for legacy fallback.
export const DEFAULT_BALANCES = {
  USDT: 1000.0,
  ETH: 0,
  BTC: 0,
  SOL: 0,
};

type Balances = Record<string, number>;

/* -------------------------
   Helper key builders
   ------------------------- */
function _keyBalancesFor(address: string) {
  return `${STORAGE_KEYS.BALANCES_PREFIX}${address.toLowerCase()}`;
}
function _keyTxsFor(address: string) {
  return `${STORAGE_KEYS.TXS_PREFIX}${address.toLowerCase()}`;
}

/* -------------------------
   Active address helpers
   ------------------------- */
export function setActiveAddress(address: string | null) {
  if (address) localStorage.setItem(STORAGE_KEYS.ACTIVE_ADDRESS, address.toLowerCase());
  else localStorage.removeItem(STORAGE_KEYS.ACTIVE_ADDRESS);
  // notify listeners
  window.dispatchEvent(new Event("wallet-updated"));
}
export function getActiveAddress(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_ADDRESS) || null;
}

/* =========================
   Per-address balances API
   ========================= */
export function readBalancesForAddress(address?: string): Balances {
  try {
    if (!address) return { ...DEFAULT_BALANCES };
    const raw = localStorage.getItem(_keyBalancesFor(address));
    if (raw) return JSON.parse(raw);

    // if nothing exists for this address, initialize with zeros (recommended)
    const init = { USDT: 0, ETH: 0, BTC: 0, SOL: 0 };
    localStorage.setItem(_keyBalancesFor(address), JSON.stringify(init));
    return init;
  } catch (e) {
    console.error("readBalancesForAddress error", e);
    return { ...DEFAULT_BALANCES };
  }
}

export function saveBalancesForAddress(address: string, balances: Balances) {
  try {
    localStorage.setItem(_keyBalancesFor(address), JSON.stringify(balances));
    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("saveBalancesForAddress error", e);
  }
}

export function clearBalancesForAddress(address: string) {
  try {
    localStorage.setItem(_keyBalancesFor(address), JSON.stringify({ USDT: 0, ETH: 0, BTC: 0, SOL: 0 }));
    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("clearBalancesForAddress error", e);
  }
}

export function creditForAddress(address: string, symbol: string, amount: number) {
  const b = readBalancesForAddress(address);
  b[symbol] = Number(b[symbol] || 0) + Number(amount);
  saveBalancesForAddress(address, b);
  return b[symbol];
}
export function debitForAddress(address: string, symbol: string, amount: number) {
  const b = readBalancesForAddress(address);
  const newVal = Number(b[symbol] || 0) - Number(amount);
  if (newVal < -1e-12) throw new Error("Insufficient balance");
  b[symbol] = newVal;
  saveBalancesForAddress(address, b);
  return b[symbol];
}

/* =========================
   Per-address txs API
   ========================= */
export function readTxsForAddress(address?: string) {
  try {
    if (!address) return [];
    const raw = localStorage.getItem(_keyTxsFor(address));
    if (raw) return JSON.parse(raw);
    localStorage.setItem(_keyTxsFor(address), JSON.stringify([]));
    return [];
  } catch (e) {
    console.error("readTxsForAddress error", e);
    return [];
  }
}

export function pushTxForAddress(address: string, tx: any) {
  try {
    const arr = readTxsForAddress(address);
    arr.unshift(tx);
    localStorage.setItem(_keyTxsFor(address), JSON.stringify(arr));
    window.dispatchEvent(new Event("wallet-updated"));
    return tx;
  } catch (e) {
    console.error("pushTxForAddress error", e);
    return tx;
  }
}

export function clearTxsForAddress(address: string) {
  try {
    localStorage.setItem(_keyTxsFor(address), JSON.stringify([]));
    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("clearTxsForAddress error", e);
  }
}

/* =========================
   Legacy single-store API
   kept for backward compatibility with existing code
   - These operate on the *active* address where applicable,
     or fall back to the old global keys.
   ========================= */

function _readBalancesLegacy(): Balances {
  try {
    // prefer explicit per-address store if active address exists
    const active = getActiveAddress();
    if (active) return readBalancesForAddress(active);

    const raw = localStorage.getItem(STORAGE_KEYS.BALANCES);
    if (raw) return JSON.parse(raw);

    // fallback to 'account' object if present
    const accRaw = localStorage.getItem("account");
    if (accRaw) {
      try {
        const acc = JSON.parse(accRaw);
        if (acc?.balances && typeof acc.balances === "object") {
          const normalized: Balances = {};
          Object.entries(acc.balances).forEach(([k, v]) => {
            normalized[k] = Number((v as any) || 0);
          });
          localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(normalized));
          return normalized;
        }
      } catch {}
    }

    // nothing found -> write & return defaults
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(DEFAULT_BALANCES));
    return { ...DEFAULT_BALANCES };
  } catch (e) {
    console.error("readBalances error", e);
    return { ...DEFAULT_BALANCES };
  }
}

function _writeBalancesLegacy(bal: Balances) {
  try {
    // if active address exists, persist per-address as well for compatibility
    const active = getActiveAddress();
    if (active) {
      saveBalancesForAddress(active, bal);
    }
    // still keep legacy key for older code
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(bal));
    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("writeBalances error", e);
  }
}

/* legacy wrappers */
export function readBalances() {
  return _readBalancesLegacy();
}
export function writeBalances(bal: Balances) {
  return _writeBalancesLegacy(bal);
}

export function saveBalances(bal: Balances | Map<string, number>) {
  const obj: Balances = bal instanceof Map ? Object.fromEntries(bal) : (bal as Balances);
  _writeBalancesLegacy(obj);
}

/* legacy single-symbol helpers operate using the active address if available */
export function getBalance(symbol: string) {
  const active = getActiveAddress();
  if (active) return readBalancesForAddress(active)[symbol] ?? 0;
  const b = _readBalancesLegacy();
  return Number(b[symbol] || 0);
}

export function setBalance(symbol: string, value: number) {
  const active = getActiveAddress();
  if (active) {
    const b = readBalancesForAddress(active);
    b[symbol] = Number(value);
    saveBalancesForAddress(active, b);
    return b[symbol];
  }
  const b = _readBalancesLegacy();
  b[symbol] = Number(value);
  _writeBalancesLegacy(b);
  return b[symbol];
}

export function credit(symbol: string, amount: number) {
  const active = getActiveAddress();
  if (active) return creditForAddress(active, symbol, amount);
  const b = _readBalancesLegacy();
  b[symbol] = Number(b[symbol] || 0) + Number(amount);
  _writeBalancesLegacy(b);
  return b[symbol];
}

export function debit(symbol: string, amount: number) {
  const active = getActiveAddress();
  if (active) return debitForAddress(active, symbol, amount);
  const b = _readBalancesLegacy();
  const newVal = Number(b[symbol] || 0) - Number(amount);
  if (newVal < -1e-12) {
    throw new Error("Insufficient balance");
  }
  b[symbol] = newVal;
  _writeBalancesLegacy(b);
  return b[symbol];
}

/* legacy txs */
export function readTxs() {
  const active = getActiveAddress();
  if (active) return readTxsForAddress(active);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TXS);
    if (raw) return JSON.parse(raw);

    // fallback to account.txs if present
    const accRaw = localStorage.getItem("account");
    if (accRaw) {
      try {
        const acc = JSON.parse(accRaw);
        if (acc?.txs) {
          localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(acc.txs));
          return acc.txs;
        }
      } catch {}
    }
    return [];
  } catch (e) {
    console.error("readTxs error", e);
    return [];
  }
}

export function pushTx(tx: any) {
  const active = getActiveAddress();
  if (active) return pushTxForAddress(active, tx);
  try {
    const arr = readTxs();
    arr.unshift(tx);
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(arr));
    window.dispatchEvent(new Event("wallet-updated"));
    return tx;
  } catch (e) {
    console.error("pushTx error", e);
    return tx;
  }
}

export function clearAll() {
  // clear both legacy and per-address active data
  try {
    localStorage.removeItem(STORAGE_KEYS.BALANCES);
    localStorage.removeItem(STORAGE_KEYS.TXS);
    localStorage.removeItem(STORAGE_KEYS.WALLET_INFO);

    const active = getActiveAddress();
    if (active) {
      localStorage.removeItem(_keyBalancesFor(active));
      localStorage.removeItem(_keyTxsFor(active));
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ADDRESS);
    }

    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("clearAll error", e);
  }
}

/* -------------------------
   Wallet info storage helpers
   ------------------------- */
export function saveWalletInfo(obj: any) {
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET_INFO, JSON.stringify(obj));
    // set active address (lowercase)
    if (obj?.address) setActiveAddress(obj.address.toLowerCase());

    // also try to mirror some info into `account` so Dashboard local fallback works consistently
    try {
      const accRaw = localStorage.getItem("account");
      const acc = accRaw ? JSON.parse(accRaw) : {};
      acc.walletAddress = obj?.address ?? acc.walletAddress;
      acc.walletCreatedAt = obj?.createdAt ?? acc.walletCreatedAt;
      localStorage.setItem("account", JSON.stringify(acc));
    } catch {}
    window.dispatchEvent(new Event("wallet-updated"));
  } catch (e) {
    console.error("saveWalletInfo error", e);
  }
}

export function getWalletInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET_INFO);
    if (raw) return JSON.parse(raw);

    // fallback: try 'account' structure
    const accRaw = localStorage.getItem("account");
    if (accRaw) {
      try {
        const acc = JSON.parse(accRaw);
        if (acc?.walletAddress) {
          // set active address as well (but do not overwrite store)
          // DO NOT call setActiveAddress here to avoid side-effects on read
          return {
            address: acc.walletAddress,
            createdAt: acc.walletCreatedAt,
          };
        }
      } catch {}
    }
    return null;
  } catch (e) {
    console.error("getWalletInfo error", e);
    return null;
  }
}

/* convenient default export so existing imports `import walletService from "../utils/walletService"` work */
const walletService = {
  STORAGE_KEYS,
  DEFAULT_BALANCES,

  // active address helpers
  setActiveAddress,
  getActiveAddress,

  // per-address API
  readBalancesForAddress,
  saveBalancesForAddress,
  clearBalancesForAddress,
  creditForAddress,
  debitForAddress,
  readTxsForAddress,
  pushTxForAddress,
  clearTxsForAddress,

  // legacy API (kept for compatibility)
  readBalances,
  writeBalances,
  saveBalances,
  getBalance,
  setBalance,
  credit,
  debit,
  readTxs,
  pushTx,
  clearAll,

  // wallet info
  saveWalletInfo,
  getWalletInfo,
};

export default walletService;
