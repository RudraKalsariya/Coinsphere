import Navbar from "../components/Navbar";

export default function LandingPage() {
  return (
    <>
      <Navbar loggedIn={false} />
      <div className="hero">
        <h1>Welcome to CoinSphere</h1>
        <p>
          Your secure decentralized wallet to store, buy, sell and explore crypto assets.
          Join the future of finance today 🚀
        </p>

        <div className="hero-buttons">
          <button onClick={() => window.location.href = "/signup"}>Get Started</button>
          <button onClick={() => window.location.href = "/login"}>Login</button>
        </div>
      </div>
    </>
  );
}