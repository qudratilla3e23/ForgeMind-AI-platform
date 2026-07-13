import React from 'react';
import { useLanguage } from "../context/LanguageContext";

export default function Profil() {
  const { t } = useLanguage();

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0c0c0c] overflow-hidden">
      
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
      <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-screen" />

      {/* --- PARALLAX CONTENT --- */}
      <div className="relative z-10 p-12 text-center max-w-lg group">
        
        <div className="cursor-pointer mx-auto w-24 h-24 bg-white/5 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10 animate-float">
          <span className="text-5xl"><i class="fa-solid fa-moon"></i></span>
        </div>

        <h1 className="p-3.5 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-4 tracking-tighter">
          {t("Coming soon")}
        </h1>

        <button 
          onClick={() => window.history.back()} 
          className="cursor-pointer relative px-8 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {t("profile.backBtn")}
        </button>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}