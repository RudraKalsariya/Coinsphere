// src/pages/AccountPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import API from "../lib/api";
import walletService from "../utils/walletService";

type Account = {
  name?: string;
  email?: string;
  walletAddress?: string;
  createdAt?: string;
};

export default function AccountPage(): JSX.Element {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // read token from localStorage (API interceptor will attach it)
  const readToken = () => localStorage.getItem("token");

  const loadAccount = useCallback(
    async (token: string | null) => {
      setLoading(true);
      setErrorMsg(null);

      // attempt server fetch when token present
      if (token) {
        try {
          const res = await API.get("/api/user/me"); // API attaches Authorization header
          const serverAccount: Account = res.data || null;
          if (serverAccount) {
            setAccount(serverAccount);
            // cache locally
            localStorage.setItem("account", JSON.stringify(serverAccount));
            if (serverAccount.name) localStorage.setItem("userName", serverAccount.name);
            if (serverAccount.email) localStorage.setItem("userEmail", serverAccount.email);
            setLoading(false);
            return;
          }
        } catch (err: any) {
          // friendly message and fall back to local
          console.warn("Could not fetch account from backend, using local fallback.", err?.message ?? err);
          setErrorMsg("Couldn't reach server — showing local data (offline mode).");
        }
      }

      // local fallback (localStorage or walletService)
      try {
        const local = localStorage.getItem("account");
        if (local) {
          setAccount(JSON.parse(local));
        } else {
          const w = (walletService as any).readWalletInfo?.();
          setAccount({
            walletAddress: w?.address,
            createdAt: w?.createdAt,
            name: localStorage.getItem("userName") || undefined,
            email: localStorage.getItem("userEmail") || undefined,
          });
        }
      } catch (err) {
        console.warn("Failed to load local account:", err);
        setErrorMsg("Failed to load account locally.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // initial load
    const token = readToken();
    loadAccount(token);

    // listen for token / account changes from other tabs or flows
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        loadAccount(readToken());
      }
      if (e.key === "account") {
        try {
          const local = localStorage.getItem("account");
          if (local) setAccount(JSON.parse(local));
        } catch {
          // ignore parse errors
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadAccount]);

  const handleCopy = async (text?: string) => {
    if (!text) {
      alert("Nothing to copy.");
      return;
    }
    if (!navigator.clipboard) {
      // fallback older browsers
      try {
        (document.execCommand as any)("copy");
        alert("Copied.");
      } catch {
        alert("Copy not supported in this browser.");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard.");
    } catch {
      alert("Unable to copy to clipboard.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("account");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    // optional: also clear walletService data if you want
    try {
      (walletService as any).clear?.();
    } catch {
      // ignore if not available
    }
    window.location.href = "/";
  };

  if (loading) return <div style={{ padding: 24 }}>Loading account…</div>;
  if (errorMsg && !account) return <div style={{ padding: 24, color: "salmon" }}>{errorMsg}</div>;

  if (!account) {
    return (
      <div className="pt-20 px-6 text-center">
        <h2 className="text-3xl font-semibold mb-3">No Account Found</h2>
        <p className="text-slate-300 mb-4">Generate a wallet to create your account.</p>
        <button
          onClick={() => (window.location.href = "/generate-wallet")}
          className="px-6 py-3 rounded-lg bg-[#6055F3] hover:bg-[#4b3cf2] transition text-white"
        >
          Create Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 px-6 max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold mb-6">Your Account</h2>

      {errorMsg && (
        <div className="mb-4 text-yellow-300 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
          <h4 className="text-xl font-semibold mb-3">Profile</h4>
          <p className="text-slate-300">
            <strong className="text-white">Name:</strong> {account.name || "—"}
          </p>
          <p className="text-slate-300 mt-2">
            <strong className="text-white">Email:</strong> {account.email || "—"}
          </p>
        </div>

        {/* Wallet */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
          <h4 className="text-xl font-semibold mb-3">Wallet</h4>

          <p className="text-slate-300 break-all">
            <strong className="text-white">Address:</strong> {account.walletAddress || "—"}
          </p>

          <p className="text-slate-300 mt-2">
            <strong className="text-white">Created:</strong>{" "}
            {account.createdAt ? new Date(account.createdAt).toLocaleString() : "—"}
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleCopy(account.walletAddress)}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-white text-sm"
            >
              Copy Address
            </button>

            <button
              onClick={() => (window.location.href = "/generate-wallet")}
              className="px-4 py-2 rounded-md bg-[#6055F3] hover:bg-[#4b3cf2] transition text-white text-sm"
            >
              Replace Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-10 text-center">
        <button
          onClick={logout}
          className="px-6 py-3 rounded-lg bg-red-500/80 hover:bg-red-600 transition text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
