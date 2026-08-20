import { useEffect, useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import Sidebar from "./console/Sidebar.jsx";
import HomePage from "./console/HomePage.jsx";
import ChatPage from "./console/ChatPage.jsx";
import CodePanel from "./console/CodePanel.jsx";
import WalletPage from "./console/WalletPage.jsx";
import AdminPage from "./console/AdminPage.jsx";
import { buildCodyReply } from "./console/codyReply.js";
import Profil from "./Profil.jsx";
import Integrations from "./Integrations.jsx";

import { motion, AnimatePresence } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faShareNodes, 
  faCopy, 
  faTimes, 
  faCheckCircle, 
  faExclamationCircle 
} from "@fortawesome/free-solid-svg-icons";
import { 
  faTelegram, 
  faWhatsapp, 
  faLinkedin 
} from "@fortawesome/free-brands-svg-icons";

import {
  askAI,
  askAIAuto,
  listChats,
  createChatApi,
  getChatApi,
  updateChatApi,
  deleteChatApi,
  sendChatMessageApi,
} from "../lib/api.js";

function extractCode(text) {
  const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
  if (!match) return { text, code: null };
  const lang = match[1] || "text";
  const ext = { python: "py", javascript: "js", jsx: "jsx", html: "html", sql: "sql", bash: "sh", json: "json" }[lang] || "txt";
  return {
    text: text.replace(match[0], "").trim(),
    code: { lang, file: `snippet.${ext}`, content: match[2].trim() },
  };
}

function loadChats() {
  try {
    const raw = window.localStorage.getItem("cw-chats");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function truncate(str, n = 40) {
  if (!str) return "New Chat";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function mapBackendChat(c, existingMessages) {
  return {
    id: c.id,
    title: c.title,
    isPinned: c.is_pinned,
    isFavorite: c.is_favorite,
    isArchived: c.is_archived,
    messages: existingMessages ?? [],
    _remote: true,
  };
}

function mapBackendMessage(m) {
  if (m.role === "assistant") {
    const { text, code } = extractCode(m.content);
    return { role: "assistant", text, code, usedProvider: m.provider };
  }
  return { role: "user", text: m.content };
}

export default function Console({ user, onSignOut }) {
  const { t } = useLanguage();
  const [page, setPage] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [chats, setChats] = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeCode, setActiveCode] = useState(null);

  const modalRef = useRef(null);

  
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");
  const [currentChatTitle, setCurrentChatTitle] = useState("");

  const showCardNotify = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const token = window.localStorage.getItem("cw-token");
  const [backendMode, setBackendMode] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setChatsLoading(false);
      return;
    }
    listChats(token).then((res) => {
      if (res.ok) {
        setChats(res.data.map((c) => mapBackendChat(c)));
        setBackendMode(true);
      } else {
        setChats(loadChats());
        setBackendMode(false);
      }
      setChatsLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (!backendMode) {
      window.localStorage.setItem("cw-chats", JSON.stringify(chats));
    }
  }, [chats, backendMode]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const archivedChats = chats.filter((c) => c.isArchived);

  const appendMessage = (chatId, message) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c))
    );
  };

  const [provider, setProvider] = useState("auto");
  const [loading, setLoading] = useState(false);

  const sendMessage = (chatId, userMsg) => {
    appendMessage(chatId, userMsg);

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId && c.messages.length === 1
          ? { ...c, title: truncate(userMsg.text || (userMsg.image ? "Image" : "Voice message")) }
          : c
      )
    );

    const promptText = userMsg.text || (userMsg.image ? "describe this image" : "voice message");
    setLoading(true);

    const handleOfflineOrError = (result) => {
      setLoading(false);
      if (result && !result.offline) {
        appendMessage(chatId, { role: "system-error", text: result.error });
        return;
      }
      const demo = buildCodyReply(promptText, t);
      appendMessage(chatId, { role: "assistant", text: demo.text, code: demo.code, demo: true });
      setActiveCode(demo.code || null);
    };

    if (backendMode) {
      sendChatMessageApi(token, chatId, promptText, provider, userMsg.image).then((res) => {
        setLoading(false);
        if (res.ok) {
          const { text, code } = extractCode(res.data.assistant_message.content);
          appendMessage(chatId, {
            role: "assistant",
            text,
            code,
            usedProvider: res.data.provider,
            reason: res.data.reason,
          });
          setActiveCode(code);
        } else {
          handleOfflineOrError(res);
        }
      });
      return;
    }

    const history = [...(chats.find((c) => c.id === chatId)?.messages || []), { role: "user", text: promptText }];
    const handled = (result) => {
      setLoading(false);
      if (result?.ok) {
        const { text, code } = extractCode(result.reply);
        appendMessage(chatId, { role: "assistant", text, code, usedProvider: result.provider, reason: result.reason });
        setActiveCode(code);
        return;
      }
      handleOfflineOrError(result);
    };

    if (provider === "auto") {
      askAIAuto(history).then(handled);
    } else {
      askAI(provider, history).then(handled);
    }
  };

  const handleStartChatFromHome = (userMsg) => {
    const titleSource = userMsg.text || (userMsg.image ? "Image" : "Voice message");
    const title = truncate(titleSource);

    if (backendMode) {
      createChatApi(token, title).then((res) => {
        if (!res.ok) {
          setBackendMode(false);
          const id = `chat_${Date.now()}`;
          setChats((prev) => [{ id, title, messages: [] }, ...prev]);
          setActiveChatId(id);
          setActiveCode(null);
          setPage("chat");
          sendMessage(id, { role: "user", ...userMsg });
          return;
        }
        const chat = mapBackendChat(res.data);
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
        setActiveCode(null);
        setPage("chat");
        sendMessage(chat.id, { role: "user", ...userMsg });
      });
      return;
    }

    const id = `chat_${Date.now()}`;
    const chat = { id, title, messages: [] };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
    setActiveCode(null);
    setPage("chat");
    sendMessage(id, { role: "user", ...userMsg });
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setActiveCode(null);
    setPage("home");
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setPage("chat");
    const chat = chats.find((c) => c.id === id);

    if (backendMode && chat?._remote && !chat._loaded) {
      getChatApi(token, id).then((res) => {
        if (!res.ok) return;
        const messages = res.data.messages.map(mapBackendMessage);
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, messages, _loaded: true } : c)));
        const lastWithCode = [...messages].reverse().find((m) => m.code);
        setActiveCode(lastWithCode?.code || null);
      });
      return;
    }

    const lastWithCode = [...(chat?.messages || [])].reverse().find((m) => m.code);
    setActiveCode(lastWithCode?.code || null);
  };

  const handleNavigate = (target) => {
    if (target === "home") return setPage("home");
    if (target === "wallet") return setPage("wallet");
    setPage(target);
  };

  const handleRenameChat = (chatId, newTitle) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
    );
    if (backendMode) updateChatApi(token, chatId, { title: newTitle });
  };

  const handleDeleteChat = (chatId) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setPage("home");
    }
    if (backendMode) deleteChatApi(token, chatId);
  };

  const handleArchiveChat = (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    const nextArchived = !chat?.isArchived;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: nextArchived } : c))
    );
    if (backendMode) updateChatApi(token, chatId, { is_archived: nextArchived });
  };

  const handlePinChat = (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    const nextPinned = !chat?.isPinned;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: nextPinned } : c))
    );
    if (backendMode) updateChatApi(token, chatId, { is_pinned: nextPinned });
  };

  const handlePublishChat = () => {
    console.log("Chat successfully published to production.");
  };

  const handleDeleteMessage = (index) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: c.messages.filter((_, idx) => idx !== index) }
          : c
      )
    );
  };

  const handleRetryMessage = (msg) => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const msgs = [...c.messages];
        if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
          msgs.pop();
        }
        return { ...c, messages: msgs };
      })
    );
    sendMessage(activeChatId, msg);
  };

  const openShareInterface = () => {
    const currentChatId = activeChatId || (chats.length > 0 ? chats[0].id : null);
    const currentChat = chats.find(c => c.id === currentChatId);
    
    if (currentChatId) {
      const chatUrl = `${window.location.origin}/console?chat=${currentChatId}`;
      setGeneratedShareUrl(chatUrl);
      setCurrentChatTitle(currentChat?.title || "Loyihani ulashish");
      setIsShareModalOpen(true);
    } else {
      showCardNotify("Ulashish uchun avval xabar yozib, chatni boshlang!", "error");
    }
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setIsShareModalOpen(false);
    }
  };

  return (
    <div className="cw-console fixed inset-0 z-40 flex bg-[#0c0c0c] text-[#e9e7df] text-sm select-none font-sans">
      
      <AnimatePresence>
        {notification.show && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(2px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className={`pointer-events-auto flex items-center gap-3 bg-[#161616] border ${
                notification.type === "success" ? "border-emerald-500/40 shadow-emerald-950/20" : "border-red-500/40 shadow-red-950/20"
              } rounded-2xl px-6 py-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-w-sm`}
            >
              {notification.type === "success" ? (
                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-lg shrink-0" />
              ) : (
                <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 text-lg shrink-0" />
              )}
              <div>
                <p className="text-white font-medium text-sm tracking-wide leading-tight">
                  {notification.message}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================================= */}
      {/* 🏴‍☠️ REAL-TIME STUDIO SHARE MODAL INTERFACE (ANIMATED) */}
      {/* ======================================================================= */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick} 
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-[#121214] border border-white/[0.06] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative mx-4 text-center"
            >
              
              {/* Yopish tugmasi */}
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.03] hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/50 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>

              {/* Markaziy Ulashish Ikonkasi (Pulse Effektli) */}
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="w-14 h-14 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mx-auto mb-4"
              >
                <FontAwesomeIcon icon={faShareNodes} className="text-[#6366F1] text-xl" />
              </motion.div>

              {/* Sarlavha va Tavsif */}
              <h3 className="text-lg font-semibold text-white tracking-wide mb-1 truncate px-4">
                {currentChatTitle}
              </h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
                Ushbu havola orqali boshqalar loyihani ko‘ra olishadi
              </p>

              {/* Ikonkalar paneli (Staggered Pop-In Animatsiyasi) */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.15 } }
                }}
                className="grid grid-cols-4 gap-3 mb-2"
              >
                
                {/* Havolani nusxalash */}
                <motion.button
                  variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedShareUrl);
                    showCardNotify("Havola vaqtinchalik xotiraga ko'chirildi!", "success");
                  }}
                  className="flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] active:scale-95 py-3 rounded-xl transition-all group"
                >
                  <FontAwesomeIcon icon={faCopy} className="text-gray-400 group-hover:text-white text-lg mb-1.5 transition-colors" />
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 font-medium">Nusxalash</span>
                </motion.button>

                {/* Telegram — URL parametri ko'k rangli haqiqiy havola shaklida */}
                <motion.a
                  variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  href={`https://t.me/share/url?url=${encodeURIComponent(generatedShareUrl)}&text=${encodeURIComponent(currentChatTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] active:scale-95 py-3 rounded-xl transition-all group"
                >
                  <FontAwesomeIcon icon={faTelegram} className="text-[#24A1DE] text-lg mb-1.5" />
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 font-medium">Telegram</span>
                </motion.a>

                {/* WhatsApp */}
                <motion.a
                  variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(currentChatTitle + "\n\n" + generatedShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] active:scale-95 py-3 rounded-xl transition-all group"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="text-[#25D366] text-lg mb-1.5" />
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 font-medium">WhatsApp</span>
                </motion.a>

                {/* LinkedIn */}
                <motion.a
                  variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] active:scale-95 py-3 rounded-xl transition-all group"
                >
                  <FontAwesomeIcon icon={faLinkedin} className="text-[#0077B5] text-lg mb-1.5" />
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 font-medium">LinkedIn</span>
                </motion.a>

              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ======================================================================= */}

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        page={page}
        onNavigate={handleNavigate}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        user={user}
        onSignOut={onSignOut}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onArchiveChat={handleArchiveChat}
        onPinChat={handlePinChat}
        onPublish={handlePublishChat}
      />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <div className="hidden md:flex items-center justify-between border-b border-white/10 px-5 py-3 bg-[#0F0F11]">
          <div className="flex items-center gap-2 text-white/80 truncate">
            <span className="w-6 h-6 rounded-full bg-lavender-deep shrink-0" aria-hidden="true" />
            <span className="truncate">
              {page === "chat"
                ? activeChat?.title || t("console.newChat")
                : page === "wallet"
                ? t("console.wallet").title
                : page === "admin"
                ? t("console.admin").title
                : t(`console.${page}`) || t("console.newChat")}
            </span>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
          
            <button
              onClick={() => setPage("wallet")}
              className="cursor-pointer bg-lavender-deep text-ink text-xs font-medium px-3 py-1.5 rounded-full"
            >
              Upgrade 
            </button>

            <button
              onClick={openShareInterface}
              className="cursor-pointer bg-white/10 hover:bg-white/15 transition-colors text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5"
            >
              Share
            </button>

            <button
              onClick={() => {
                const currentChatId = activeChatId || (chats.length > 0 ? chats[0].id : null);
                if (currentChatId) {
                  handlePublishChat(currentChatId);
                  showCardNotify("Ushbu chat muvaffaqiyatli chop etildi!", "success");
                } else {
                  showCardNotify("Chop etish uchun avval xabar yozib, chatni boshlang!", "error");
                }
              }}
              className="cursor-pointer bg-white text-black text-xs font-medium px-3 py-1.5 rounded-full"
            >
              Publish
            </button>
          </div>
        </div>

        {page === "home" && <HomePage user={user} onStartChat={handleStartChatFromHome} />}
        {page === "wallet" && <WalletPage user={user} />}
        {page === "admin" && user.is_admin && <AdminPage />}
        {page === "profile" && <Profil user={user} />} 
        {page === "integrations" && <Integrations />} 

        {(page === "projects" || page === "activity" || page === "templates" || page === "images") && (
          <div className="flex-1 flex items-center justify-center text-white/40 dot-grid">
            <p>{t(`console.${page}`)} — coming soon</p>
          </div>
        )}

        {page === "archive" && (
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-medium mb-6">{t("archive")}</h1>
              {archivedChats.length === 0 ? (
                <p className="text-white/40">{t("console.archiveEmpty") || "—"}</p>
              ) : (
                <div className="space-y-1">
                  {archivedChats.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors"
                    >
                      <button onClick={() => handleSelectChat(c.id)} className="text-left flex-1 truncate text-sm">
                        {c.title || t("noName")}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleArchiveChat(c.id)}
                          className="text-xs text-white/50 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
                        >
                          {t("removeFromArchive")}
                        </button>
                        <button
                          onClick={() => handleDeleteChat(c.id)}
                          className="text-xs text-red-400/70 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {page === "chat" && activeChat && (
          <div className="flex-1 flex min-h-0">
            <div className="w-full max-w-xl border-r border-white/10 flex flex-col min-h-0">
              <ChatPage
                messages={activeChat.messages}
                onSend={(msg) => sendMessage(activeChat.id, msg)}
                onDeleteMessage={handleDeleteMessage}
                onRetryMessage={handleRetryMessage}
                provider={provider}
                onProviderChange={setProvider}
                loading={loading}
              />
            </div>
            <div className="hidden md:flex flex-1 min-h-0">
              {activeCode ? (
                <CodePanel code={activeCode} />
              ) : (
                <div className="flex-1 flex items-center justify-center relative dot-grid">
                  <div className="text-center">
                    <span className="text-4xl block mb-1 animate-pulse" aria-hidden="true">
                      ✳
                    </span>
                    <p className="text-[10px] tracking-widest text-white/30 mb-2">
                      {t("console.tips")}
                    </p>
                    <p className="text-white/60 text-sm max-w-xs mx-auto">{t("console.tipText")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}