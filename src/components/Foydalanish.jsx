import React from 'react';
import { useLanguage } from "../context/LanguageContext";

export default function ForgemindShowcase() {
  const { t } = useLanguage();

  return (
    <div className="w-full flex justify-center py-12 px-4">
      {/* MACBOOK FRAME */}
      <div className="relative w-full max-w-5xl aspect-[16/10] bg-[#1a1a1a] rounded-[30px] border-[8px] border-[#333] shadow-2xl overflow-hidden flex">
        
        <div className="w-1/3 bg-[#f4f1ea] p-6 flex flex-col justify-between border-r border-[#e0ddd5]">
          <div>
            <h2 className="font-bold text-black mb-4">{t("showcase.title")}</h2>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><span>✨</span> {t("showcase.point1")}</li>
              <li className="flex gap-2"><span>🚀</span> {t("showcase.point2")}</li>
              <li className="flex gap-2"><span>🧠</span> {t("showcase.point3")}</li>
            </ul>
          </div>
          <div className="h-20 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 italic">
            {t("showcase.inputPlaceholder")}
          </div>
        </div>

        <div className="w-2/3 bg-black relative flex items-center justify-center p-10">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-50 absolute" />
            <h1 className="text-white text-4xl font-bold mb-4 relative z-10">ForgeMind AI</h1>
            <p className="text-gray-400 mb-8">{t("showcase.heroDesc")}</p>
            
            {/* Display Area */}
            <div className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 font-bold uppercase tracking-widest">
              Interactive Display/Video
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}