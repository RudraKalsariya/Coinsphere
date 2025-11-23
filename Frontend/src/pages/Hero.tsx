import React from "react";
import CryptoCubes from "../assets/CryptoCubes.png";

export default function Hero(): JSX.Element {
  const go = (path: string) => {
    // simple navigation (same pattern used in your other pages)
    window.location.href = path;
  };

  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-2 items-center gap-8">
      {/* Left Text Section */}
      <div className="space-y-7">
        <h2 className="text-5xl md:text-6xl font-extrabold leading-tight text-white">
          Buy and Trade Crypto like never before.
        </h2>

        <div className="flex gap-4">
          <button
            onClick={() => go("/signup")}
            style={{ backgroundColor: "#6055F3" }}
            className="px-6 py-3 rounded-lg text-white font-semibold shadow hover:bg-[#4b3cf2] transition-all duration-300"
          >
            Get Started
          </button>

          <button
            onClick={() => go("/login")}
            className="px-6 py-3 rounded-lg border border-[#6055F3] text-sm text-[#6055F3] hover:bg-[#6055F3] hover:text-white transition-all duration-300"
          >
            Sign in
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
          <div>✔️ No custodial keys</div>
          <div>✔️ Fast sync</div>
          <div>✔️ Live market</div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="flex justify-center md:justify-end relative">
        <img
          src={CryptoCubes}
          alt="3D Crypto Illustration"
          className="w-full max-w-[720px] drop-shadow-xl hover:scale-105 transition-transform duration-700 ease-out mix-blend-lighten"
        />
      </div>
    </section>
  );
}
