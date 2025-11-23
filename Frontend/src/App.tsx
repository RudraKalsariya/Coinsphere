// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Hero from "./pages/Hero";
import Logo from "./assets/logo.png";
import GradientBG from "./assets/bg-gradiant.png";

/* Page imports — ensure these files exist under src/pages/ and are .tsx */
import BuyPage from "./pages/BuyPage";
import SellPage from "./pages/SellPage";
import MarketPage from "./pages/MarketPage";
import GenerateWalletPage from "./pages/GenerateWalletPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/Dashboard";
import AccountPage from "./pages/AccountPage";

export default function App(): JSX.Element {
  const location = useLocation();
  const pathname = location.pathname;

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem("token")));
  const [hasAccount, setHasAccount] = useState<boolean>(() => Boolean(localStorage.getItem("account")));

  // Hide main nav during onboarding (generate-wallet)
  const hideMainNavOnGenerate = pathname === "/generate-wallet";

  useEffect(() => {
    // update state when localStorage changes in other tabs
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "token" || e.key === "account") {
        setIsLoggedIn(Boolean(localStorage.getItem("token")));
        setHasAccount(Boolean(localStorage.getItem("account")));
      }
    };

    // fallback for same-tab changes: short poll to keep navbar reactive without requiring manual reload
    const interval = setInterval(() => {
      setIsLoggedIn(Boolean(localStorage.getItem("token")));
      setHasAccount(Boolean(localStorage.getItem("account")));
    }, 700);

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="min-h-screen text-white bg-cover bg-center"
      style={{ backgroundImage: `url(${GradientBG})` }}
    >
      {/* ---------- HEADER ---------- */}
      <header className="max-w-7xl mx-auto p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img
              src={Logo}
              alt="CoinSphere logo"
              className="w-auto h-10 md:h-12 object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* Main nav: hide some links when on generate-wallet */}
        <nav className="hidden md:flex gap-6 text-sm text-slate-300">
          {/* Wallet link: only show when not onboarding and not logged in */}
          {!hideMainNavOnGenerate && !isLoggedIn && (
            <Link to="/generate-wallet" className="hover:text-[#6055F3]">Wallet</Link>
          )}

          {/* Hide Buy/Sell while on generate-wallet page (clean onboarding) */}
          {!hideMainNavOnGenerate && (
            <>
              <Link to="/buy" className="hover:text-[#6055F3]">Buy</Link>
              <Link to="/sell" className="hover:text-[#6055F3]">Sell</Link>
            </>
          )}

          {/* Market is fine to show */}
          <Link to="/market" className="hover:text-[#6055F3]">Market</Link>

          {/* Show Account when logged-in OR has local onboarded account */}
          {(isLoggedIn || hasAccount) && (
            <Link to="/account" className="hover:text-[#6055F3]">Account</Link>
          )}

          <Link to="/about" className="hover:text-[#6055F3]">About</Link>
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {/* If no token AND no local account — show Sign in + Get Started */}
          {!isLoggedIn && !hasAccount ? (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-md border border-[#6055F3] text-sm text-[#6055F3] hover:bg-[#6055F3] hover:text-white"
              >
                Sign in
              </Link>

              <Link
                to="/signup"
                className="px-4 py-2 rounded-md bg-[#6055F3] text-white text-sm hover:bg-[#4b3cf2]"
              >
                Get Started
              </Link>
            </>
          ) : (
            // When logged in OR has local account show "My Account"
            <Link
              to="/account"
              className="px-4 py-2 rounded-md bg-[#6055F3] text-white text-sm hover:bg-[#4b3cf2]"
            >
              My Account
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {/* top-level route - landing */}
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <>
                  <Hero />
                  <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <article
                      className="cursor-pointer p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                      onClick={() => (window.location.href = "/generate-wallet")}
                    >
                      <h3 className="text-lg font-semibold text-white">Secure Wallet</h3>
                      <p className="mt-2 text-sm text-slate-300">Control keys on your device...</p>
                    </article>

                    <article
                      className="cursor-pointer p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                      onClick={() => (window.location.href = "/market")}
                    >
                      <h3 className="text-lg font-semibold text-white">Live Market</h3>
                      <p className="mt-2 text-sm text-slate-300">Real-time prices and trends</p>
                    </article>

                    <article
                      className="cursor-pointer p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                      onClick={() => (window.location.href = "/buy")}
                    >
                      <h3 className="text-lg font-semibold text-white">Buy and Sell</h3>
                      <p className="mt-2 text-sm text-slate-300">Demo on-chain-like trades</p>
                    </article>
                  </section>
                </>
              )
            }
          />

          {/* app pages */}
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/generate-wallet" element={<GenerateWalletPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/account" element={<AccountPage />} />

          {/* fallback */}
          <Route
            path="*"
            element={<div className="py-40 text-center">Page not found — <Link to="/">Go home</Link></div>}
          />
        </Routes>

        <footer className="mt-16 py-12 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} CoinSphere — Built with ❤️ by Team
        </footer>
      </main>
    </div>
  );
}
