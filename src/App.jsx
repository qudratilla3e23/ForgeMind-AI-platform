import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import LogoBar from "./components/LogoBar.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import ModelsSection from "./components/ModelsSection.jsx";
import AgentMarketplace from "./components/AgentMarketplace.jsx";
import WhyForgeMind from "./components/WhyForgeMind.jsx";
import Integrations from "./components/Integrations.jsx";
import WhatsAppAgents from "./components/WhatsAppAgents.jsx";
import Testimonials from "./components/Testimonials.jsx";
import CTA from "./components/CTA.jsx";
import FAQ from "./components/FAQ.jsx";
import Footer from "./components/Footer.jsx";
import Console from "./components/Console.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { completeOAuthRedirect } from "./lib/oauth.js";

function loadUser() {
  try {
    const raw = window.localStorage.getItem("cw-session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Bosh sahifa (Landing Page) komponenti alohida ajratib olindi
function LandingPage({ oauthError, setOauthError, handleLogin }) {
  return (
    <div id="top">
      {oauthError && (
        <div className="bg-red-500/10 text-red-400 text-sm text-center py-2 px-4">
          {oauthError}{" "}
          <button onClick={() => setOauthError("")} className="underline ml-2">
            ✕
          </button>
        </div>
      )}
      <Header onLogin={handleLogin} />
      <main>
        <Hero />
        <LogoBar />
        <HowItWorks />
        <ModelsSection />
        <AgentMarketplace />
        <WhyForgeMind />
        <Integrations />
        <WhatsAppAgents />
        <Testimonials />
        <CTA />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [oauthError, setOauthError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (u, token) => {
    if (token) window.localStorage.setItem("cw-token", token);
    setUser(u);
    window.localStorage.setItem("cw-session", JSON.stringify(u));
    navigate("/console"); // Kirgandan keyin panelga o'tkazish
  };

  const handleSignOut = () => {
    setUser(null);
    window.localStorage.removeItem("cw-session");
    window.localStorage.removeItem("cw-token");
    navigate("/"); // Chiqqandan keyin bosh sahifaga qaytarish
  };

  useEffect(() => {
    completeOAuthRedirect().then((result) => {
      if (!result) return;
      if (result.ok) {
        handleLogin(result.data.user, result.data.token);
      } else {
        setOauthError(result.error);
      }
    });
  }, []);

  useEffect(() => {
    if (!user && window.location.hash === "#hero") {
      const timer = setTimeout(() => {
        const heroSection = document.getElementById("hero");
        if (heroSection) {
          heroSection.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState(null, null, " ");
        }
      }, 200); 

      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <Routes>
          {/* Bosh sahifa */}
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to="/console" replace />
              ) : (
                <LandingPage 
                  oauthError={oauthError} 
                  setOauthError={setOauthError} 
                  handleLogin={handleLogin} 
                />
              )
            } 
          />

          {/* Console paneli (va uning ichki sahifalari :page uchun) */}
          <Route 
            path="/console" 
            element={user ? <Console user={user} onSignOut={handleSignOut} /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/console/:page" 
            element={user ? <Console user={user} onSignOut={handleSignOut} /> : <Navigate to="/" replace />} 
          />

          {/* Noto'g'ri link yozilsa bosh sahifaga otib yuboradi */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LanguageProvider>
    </ThemeProvider>
  );
}