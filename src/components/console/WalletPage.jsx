import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { createCheckout } from "../../lib/api.js";

const BASE_NUMERIC_PRICES = {
  monthly: { free: 0, pro: 150000, team: 450000 },
  annual: { free: 0, pro: 1440000, team: 4320000 }
};

const LOGOS = {
  payme: (
    <svg className="w-12 h-6" viewBox="0 0 54 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="54" height="24" rx="6" fill="#14C0CC" />
      <path d="M12 7h3v10h-3V7zm5 4h4v6h-4v-6zm9-4h3v10h-3V7zm5 4h4v6h-4v-6z" fill="#FFF" />
    </svg>
  ),
  click: (
    <svg className="w-12 h-6" viewBox="0 0 54 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="54" height="24" rx="6" fill="#00A5FF" />
      <path d="M10 7h4v2h-4V7zm0 4h4v6h-4v-6zm8-4h4v10h-4V7zm8 0h4v2h-4V7zm0 4h4v6h-4v-6z" fill="#FFF" />
    </svg>
  ),
  visa: (
    <svg className="w-10 h-6" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="16" rx="3" fill="#1A1F71" />
      <path d="M9.5 5h1.3l.8 3.4.4-2.2c.1-.6-.3-1.2-1-1.2H9.5v.2zm4.8 0h-1.1c-.3 0-.6.2-.7.5l-1.6 3.9h1.3l.3-.7h1.5l.1.7h1.2L14.3 5zm-1 2.3l.5-1.3.3 1.3h-.8zm4.5-2.3h-1c-.3 0-.5.2-.6.4l-1.2 2.5-.5-2.6c0-.2-.2-.3-.4-.3H15l.1.2 1.3 5.3h1.3l2-5.5h-1z" fill="#F79E1B" />
    </svg>
  ),
  mastercard: (
    <svg className="w-10 h-6" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="16" rx="3" fill="#222" />
      <circle cx="10" cy="8" r="4.5" fill="#EB001B" />
      <circle cx="14" cy="8" r="4.5" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  )
};

function CheckoutModal({ plan, planLabel, price, appliedPromo, onClose, w }) {
  const [state, setState] = useState({ loading: false, message: null, type: "error" });
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [confirmRedirect, setConfirmRedirect] = useState(false);
  const [cardData, setCardData] = useState({ number: "", expiry: "", cvc: "" });

  const isInternationalCard = selectedMethod === "visa" || selectedMethod === "mastercard";

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setState({ loading: false, message: null, type: "error" });

    if (method === "payme" || method === "click") {
      setConfirmRedirect(true);
    } else {
      setConfirmRedirect(false);
    }
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardData(prev => ({ ...prev, number: formatted }));
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) value = value.slice(0, 2) + "/" + value.slice(2);
    setCardData(prev => ({ ...prev, expiry: value }));
  };

  const processPayment = async (e) => {
    if (e) e.preventDefault();
    setState({ loading: true, message: null, type: "error" });

    const token = window.localStorage.getItem("cw-token");
    if (!token) {
      setState({ loading: false, message: "Sessiya topilmadi. Qaytadan kiring.", type: "error" });
      return;
    }

    let extraData = {};
    if (isInternationalCard) {
      const cleanCardNumber = cardData.number.replace(/\s/g, "");
      if (cleanCardNumber.length < 16 || cardData.expiry.length < 5 || cardData.cvc.length < 3) {
        setState({ loading: false, message: "Karta ma'lumotlarini to'liq kiriting!", type: "error" });
        return;
      }
      extraData = {
        cardType: selectedMethod,
        cardNumber: cleanCardNumber,
        cardExpiry: cardData.expiry,
        cardCvc: cardData.cvc
      };
    }

    try {


      const providerType = isInternationalCard ? "direct_card" : selectedMethod;
      const res = await createCheckout(plan, providerType, token, appliedPromo, extraData);

      if (res.ok) {
        setState({ loading: false, message: "So'rov muvaffaqiyatli bajarildi!", type: "success" });

        if (res.data?.redirect_url) {
          window.location.href = res.data.redirect_url;
        }
      } else {
        setState({ loading: false, message: res.error || "To'lovni shakllantirishda xatolik.", type: "error" });
      }
    } catch (err) {
      setState({ loading: false, message: "Tizim xatoligi yuz berdi.", type: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white text-base">
            To'lov tizimi — <span className="text-indigo-400">{planLabel}</span>
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-5">
          <div className="text-xs text-white/40 mb-1">To'lov miqdori:</div>
          <div className="text-3xl font-bold text-white tracking-tight">{price}</div>
        </div>

        {!confirmRedirect && !isInternationalCard && (
          <div className="mb-2">
            <label className="block text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">To'lov usulini tanlang</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(LOGOS).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleMethodSelect(method)}
                  className="flex flex-col items-center justify-center py-4 rounded-xl border bg-white/[0.02] border-white/10 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-white font-medium uppercase text-xs gap-2"
                >
                  {LOGOS[method]}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {confirmRedirect && (
          <div className="text-center py-4 animate-in fade-in duration-200">
            <div className="flex justify-center mb-3">{LOGOS[selectedMethod]}</div>
            <p className="text-sm text-white/80 mb-6 leading-relaxed">
              Ushbu tarifni <span className="text-indigo-400 font-bold uppercase">{selectedMethod}</span> orqali sotib olishni davom ettirasizmi? <br />
              <span className="text-xs text-white/40">Tasdiqlaganingizdan so'ng to'lov oynasiga o'tasiz.</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setSelectedMethod(null); setConfirmRedirect(false); }}
                className="bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-3 rounded-xl transition-all"
              >
                Yo'q, orqaga
              </button>
              <button
                onClick={() => processPayment()}
                disabled={state.loading}
                className={`bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-50 ${state.loading ? "cursor-wait" : "cursor-pointer"
                  }`}
              >
                {state.loading ? "Yuklanmoqda..." : "Ha, davom etish"}
              </button>
            </div>
          </div>
        )}

        {isInternationalCard && (
          <form onSubmit={processPayment} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">Xalqaro Karta Raqami</label>
                <button type="button" onClick={() => setSelectedMethod(null)} className="text-xs text-indigo-400 hover:underline">Usulni o'zgartirish</button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={cardData.number}
                  onChange={handleCardNumberChange}
                  placeholder="4000 •••• •••• ••••"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-4 pr-14 py-3.5 text-sm outline-none focus:border-indigo-500 text-white font-mono tracking-widest placeholder:text-white/10 transition-colors"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{LOGOS[selectedMethod]}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Muddati</label>
                <input
                  type="text"
                  value={cardData.expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl py-3.5 text-sm outline-none focus:border-indigo-500 text-white font-mono placeholder:text-white/10 text-center tracking-widest transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">CVC / CVV</label>
                <input
                  type="password"
                  maxLength="3"
                  value={cardData.cvc}
                  onChange={(e) => setCardData(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, "") }))}
                  placeholder="•••"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl py-3.5 text-sm outline-none focus:border-indigo-500 text-white font-mono placeholder:text-white/10 text-center tracking-widest transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={state.loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl text-sm font-semibold tracking-wide disabled:opacity-40 mt-3"
            >
              {state.loading ? "Xavfsiz bog'lanish..." : `Xalqaro karta orqali to'lash`}
            </button>
          </form>
        )}

        {state.message && (
          <div className={`text-xs border rounded-xl px-4 py-3 mt-4 flex items-start gap-2.5 ${state.type === "success" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-rose-500/5 border-rose-500/20 text-rose-400"}`}>
            <span>{state.type === "success" ? "✓" : "⚠️"}</span>
            <span className="leading-relaxed">{state.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage({ user }) {
  const { t } = useLanguage();
  const w = t("console.wallet");

  const [openFaq, setOpenFaq] = useState(null);
  const [annual, setAnnual] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoStatus, setPromoStatus] = useState({ loading: false, message: null, success: false, discount: 0 });
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const handleApplyPromo = async () => {
    const trimmedPromo = promo.trim().toUpperCase();
    if (!trimmedPromo) return;

    setPromoStatus({ loading: true, message: null, success: false, discount: 0 });

    setTimeout(() => {
      if (trimmedPromo === "SKIDKA20") {
        setPromoStatus({ loading: false, message: "Kupon kiritildi! (20% chegirma)", success: true, discount: 20 });
      } else {
        setPromoStatus({ loading: false, message: "Kupon xato yoki muddati o'tgan!", success: false, discount: 0 });
      }
    }, 600);
  };

  const calculateDisplayPrice = (planKey) => {
    const period = annual ? "annual" : "monthly";
    const originalPrice = BASE_NUMERIC_PRICES[period][planKey];
    if (originalPrice === 0) return "0 UZS";

    if (promoStatus.success && promoStatus.discount > 0) {
      const discounted = originalPrice - (originalPrice * promoStatus.discount) / 100;
      return `${discounted.toLocaleString("uz-UZ")} UZS`;
    }
    return `${originalPrice.toLocaleString("uz-UZ")} UZS`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#0b0b0c] text-white">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-3 mb-1">
          <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </span>
          <h1 className="text-2xl font-medium">{w?.title || "Hamyon balancesi"}</h1>
        </div>
        <p className="text-white/50 mb-6">{w?.subtitle}</p>

        <div className="flex items-center gap-6 border-b border-white/10 mb-8 text-sm text-white/50">
          {w?.tabs?.map((tab, i) => (
            <span key={tab} className={`pb-3 cursor-pointer transition-colors ${i === w.tabs.length - 1 ? "text-white border-b-2 border-white font-medium" : "hover:text-white/80"}`}>
              {tab}
            </span>
          ))}
        </div>

        <div className="grid md:grid-cols-[340px_1fr] gap-6 mb-10">
          <div className="bg-gradient-to-br from-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between min-h-[180px]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">{w?.balance || "Balans"}</span>
              <span className="text-2xl font-bold">4.43 {w?.credits || "Kredit"}</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                <span className="font-mono tracking-wider">{user?.name?.toUpperCase()}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded uppercase text-[10px] font-bold">{w?.freePlan || "FREE PLAN"}</span>
              </div>
              <button onClick={() => setAnnual(false)} className="w-full bg-white text-indigo-900 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-md">
                Balansni to'ldirish ✨
              </button>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
            <p className="mb-3 text-white/90">
              {w?.currentPlan || "Joriy tarif:"} <strong className="text-indigo-400">{w?.plans?.[0]?.name || "Free"}</strong>.
            </p>
            <div className="flex items-center justify-between text-sm text-white/70 mb-1.5">
              <span className="flex items-center gap-1">⚡ {w?.runsThisMonth || "Ushbu oydagi urinishlar"}</span>
              <span className="font-medium">0 / 100</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div className="h-full w-0 bg-indigo-500 transition-all duration-500" />
            </div>
            <p className="text-xs text-white/40 mb-4">{w?.resets}</p>
            <p className="text-sm text-white/60">{w?.topUpHint}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 bg-white/[0.03] border border-white/5 w-fit mx-auto px-4 py-2 rounded-2xl mb-10">
          <span className={`text-sm font-medium transition-colors ${!annual ? "text-white" : "text-white/40"}`}>{w?.monthly || "Oylik"}</span>
          <button onClick={() => setAnnual((v) => !v)} className={`w-11 h-6 rounded-full transition-colors relative ${annual ? "bg-indigo-600" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${annual ? "left-[21px]" : "left-0.5"}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${annual ? "text-white" : "text-white/40"}`}>{w?.annual || "Yillik"}</span>
          <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
            {w?.annualOff || "-20% Chegirma"}
          </span>
        </div>

        {/* PLANS GRID */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {w?.plans?.map((plan, i) => {
            const planKey = i === 1 ? "pro" : i === 2 ? "team" : "free";
            const finalPriceString = calculateDisplayPrice(planKey);

            return (
              <div key={plan.name} className={`bg-white/[0.03] border rounded-2xl p-6 relative flex flex-col justify-between transition-all duration-200 ${i === 1 ? "border-indigo-500 bg-indigo-500/[0.01] shadow-lg shadow-indigo-500/5" : "border-white/10"}`}>
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow-md">
                    {w?.mostPopular || "Tavsiya etiladi"}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-lg mb-2 text-white">{plan.name}</p>
                  <p className="text-3xl font-bold mb-1 text-white">{finalPriceString}</p>
                  <p className="text-xs text-white/40 mb-5">{plan.tag}</p>

                  <ul className="space-y-2.5 text-sm text-white/70 mb-8 border-t border-white/5 pt-4">
                    {plan.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span className="text-indigo-400 shrink-0 font-bold">✓</span> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={i === 0}
                  onClick={() => i !== 0 && setCheckoutPlan({ key: annual ? `${planKey}_yearly` : `${planKey}_monthly`, label: plan.name, price: finalPriceString })}
                  className={`w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${i === 0 ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]"}`}
                >
                  {i === 0 ? (w?.currentPlan || "Joriy tarif") : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {checkoutPlan && (
          <CheckoutModal
            plan={checkoutPlan.key}
            planLabel={checkoutPlan.label}
            price={checkoutPlan.price}
            appliedPromo={promoStatus.success ? promo.trim().toUpperCase() : null}
            onClose={() => setCheckoutPlan(null)}
            w={w}
          />
        )}

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-10 max-w-md shadow-inner">
          <p className="font-medium mb-3 flex items-center gap-1.5">✨ {w?.promoTitle || "Kupon kiritish"}</p>
          <div className="flex gap-2">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder={w?.promoPlaceholder || "PROMO KOD"} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 text-white" />
            <button onClick={handleApplyPromo} disabled={promoStatus.loading} className="bg-white/10 hover:bg-white/15 text-sm font-medium px-5 py-2.5 rounded-xl border border-white/5 text-white disabled:opacity-50">
              {promoStatus.loading ? "..." : (w?.apply || "Faollash")}
            </button>
          </div>
          {promoStatus.message && (
            <p className={`text-xs mt-3 font-medium ${promoStatus.success ? "text-emerald-400" : "text-amber-400"}`}>{promoStatus.message}</p>
          )}
        </div>

        <div className="divide-y divide-white/5 border-t border-white/10 mb-8">
          {w?.faq?.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={item.q} className="transition-all">
                <button onClick={() => setOpenFaq(isOpen ? null : i)} className="w-full flex items-center justify-between py-4.5 text-left text-white/90 hover:text-white font-medium">
                  <span>{item.q}</span>
                  <span className={`text-white/30 text-lg transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-400" : ""}`}>⌄</span>
                </button>
                {isOpen && <p className="text-sm text-white/50 pb-5 max-w-3xl leading-relaxed">{item.a}</p>}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}