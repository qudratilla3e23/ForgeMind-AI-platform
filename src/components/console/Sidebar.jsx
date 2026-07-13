import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx"; // loyihaning o'z i18n tizimi
import AccountMenu from "./AccountMenu.jsx";

// Navigatsiya bo'limlari uchun ikonkalarning doimiy xaritasi
const navIcons = {
  home: "fa-solid fa-house",
  projects: "fa-solid fa-folder",
  images: "fa-solid fa-wand-magic-sparkles",
  templates: "fa-solid fa-cubes",
  archive: "fa-solid fa-box-archive",
  admin: "fa-solid fa-shield-halved",
  wallet: "fa-solid fa-wallet",
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  page,
  onNavigate,
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  user,
  onSignOut,
  onRenameChat,
  onDeleteChat,
  onArchiveChat,
  onPinChat,
  onPublish
}) {
  const { t, lang } = useLanguage();
  const currentLang = lang || "uz"; 

  const [localChats, setLocalChats] = useState(chats);
  useEffect(() => {
    if (chats && chats.length >= 0) {
      setLocalChats(chats);
    }
  }, [chats]);

  // Holatlar (States)
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ chatId: null, x: 0, y: 0, openUpward: false });
  const [shareModalChat, setShareModalChat] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, chatId: null });
  const [renameModal, setRenameModal] = useState({ show: false, chatId: null, currentTitle: "" });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 2500);
  };

  const handleCopyLink = (chat) => {
    const shareUrl = `${window.location.origin}/chat/${chat?.id || "share"}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      triggerToast(t("copied"), "success");
    });
  };

  const confirmDeleteChat = () => {
    if (deleteModal.chatId) {
      const targetId = deleteModal.chatId;
      setLocalChats(prev => prev.filter(c => c.id !== targetId));
      if (onDeleteChat) onDeleteChat(targetId);
      triggerToast(t("deleted"), "danger");
      setDeleteModal({ show: false, chatId: null });
    }
  };

  const confirmRenameChat = () => {
    if (renameModal.chatId && renameModal.currentTitle.trim()) {
      const targetId = renameModal.chatId;
      const newTitle = renameModal.currentTitle.trim();
      setLocalChats(prev => prev.map(c => c.id === targetId ? { ...c, title: newTitle } : c));
      if (onRenameChat) onRenameChat(targetId, newTitle);
      triggerToast(t("renamed"), "success");
      setRenameModal({ show: false, chatId: null, currentTitle: "" });
    }
  };

  const handlePinClick = (chatId) => {
    setLocalChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
    if (onPinChat) onPinChat(chatId);
    const chatItem = localChats.find(c => c.id === chatId);
    triggerToast(chatItem?.isPinned ? t("unpin") : t("pin"), "success");
    setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false });
  };

  const handleArchiveClick = (chatId) => {
    setLocalChats(prev => prev.map(c => c.id === chatId ? { ...c, isArchived: !c.isArchived } : c));
    if (onArchiveChat) onArchiveChat(chatId);
    const chatItem = localChats.find(c => c.id === chatId);
    triggerToast(chatItem?.isArchived ? t("removeFromArchive") : t("addToArchive"), "success");
    setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false });
  };

  const handlePublishClick = () => {
    if (onPublish) onPublish();
    triggerToast(t("published"), "success");
  };

  const handleMenuToggle = (e, chatId) => {
    e.stopPropagation();
    if (contextMenu.chatId === chatId) {
      setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false });
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const menuHeight = 220;
      const openUpward = (rect.top + menuHeight) > windowHeight;
      const computedY = openUpward ? rect.top - menuHeight + 5 : rect.top + rect.height + 5;

      setContextMenu({ chatId, x: rect.left - 140, y: computedY, openUpward });
    }
  };

  const displayName = user?.name && !user.name.includes("console.") ? user.name : "Foydalanuvchi";
  const activeChats = localChats.filter(chat => page === "archive" ? chat.isArchived : !chat.isArchived);
  const pinnedChats = activeChats.filter(chat => chat.isPinned);
  const unpinnedChats = activeChats.filter(chat => !chat.isPinned);

  return (
    <>
      {/* 🌟 YUQORI NAVBAR PANEL */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0d0d0d] border-b border-white/10 flex items-center justify-between px-4 z-[100]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-colors border border-white/5"
          >
            <i className="fa-solid fa-comments text-indigo-400"></i>
            {t("chat")}
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="text-sm font-semibold text-white/90 capitalize flex items-center gap-2">
            <i className={`${navIcons[page] || "fa-solid fa-circle-nodes"} text-xs text-white/40`}></i>
            {t(page)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
             <button 
            onClick={() => onNavigate("wallet")} 
            className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            Upgrade <i class="fa-solid fa-credit-card"></i>
          </button>

          
          <button 
            onClick={() => onNavigate("wallet")} 
            className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            Upgrade <i class="fa-solid fa-credit-card"></i>
          </button>

          <button 
            onClick={() => setShareModalChat({ title: t(page) })} 
            className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 px-3 py-1.5 rounded-lg font-medium transition-all"
          >
            Share
          </button>
          <button 
            onClick={handlePublishClick} 
            className="bg-white text-black px-3 py-1.5 rounded-lg font-bold hover:bg-white/90 transition-all active:scale-95 shadow-lg"
          >
            Publish
          </button>
        </div>
      </div>

      {toast.show && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div className={`flex flex-col items-center justify-center gap-3 px-6 py-5 rounded-2xl shadow-2xl pointer-events-auto transform transition-all scale-100 min-w-[240px] text-center border ${toast.type === "danger" ? "bg-[#2a1415] border-red-500/30 text-red-400" : "bg-[#142a1e] border-emerald-500/30 text-emerald-400"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${toast.type === "danger" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {toast.type === "danger" ? <i className="fa-solid fa-trash-can animate-bounce"></i> : <i className="fa-solid fa-check animate-bounce"></i>}
            </div>
            <span className="text-sm font-medium text-white/90 px-2">{toast.message}</span>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[380px] bg-[#1c1c1e] border border-white/10 text-white rounded-[24px] p-6 shadow-2xl text-left">
            <h3 className="text-lg font-bold text-white mb-2">{t("deleteTitle")}</h3>
            <p className="text-sm text-white/60 mb-6">{t("deleteConfirm")}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteModal({ show: false, chatId: null })} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white/80">{t("cancel")}</button>
              <button onClick={confirmDeleteChat} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold text-white">{t("delete")}</button>
            </div>
          </div>
        </div>
      )}

      {renameModal.show && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[380px] bg-[#1c1c1e] border border-white/10 text-white rounded-[24px] p-6 shadow-2xl text-left">
            <h3 className="text-lg font-bold text-white mb-2">{t("renameTitle")}</h3>
            <input 
              type="text" value={renameModal.currentTitle}
              onChange={(e) => setRenameModal({ ...renameModal, currentTitle: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white mb-5 focus:outline-none focus:border-indigo-500 font-medium"
              placeholder={t("renamePlaceholder")} autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmRenameChat()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameModal({ show: false, chatId: null, currentTitle: "" })} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white/80">{t("cancel")}</button>
              <button onClick={confirmRenameChat} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold text-white shadow-sm">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`shrink-0 border-r border-white/10 flex flex-col h-screen bg-[#0d0d0d] transition-all duration-200 select-none pt-14 md:pt-0 ${collapsed ? "w-[68px] items-center" : "w-64"}`}>
        <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col pb-4 w-full pt-2">
          <button
            onClick={onNewChat}
            className={`mb-4 flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white transition-colors rounded-xl p-3 text-sm font-medium shrink-0 ${collapsed ? "mx-auto justify-center w-11 h-11" : "mx-3 text-left"}`}
          >
            <i className="fa-solid fa-pen text-xs"></i> 
            {!collapsed && t("newChat")}
          </button>

          <nav className={`px-2 space-y-1 text-white/70 shrink-0 ${collapsed ? "flex flex-col items-center w-full" : ""}`}>
            {["home", "projects", "images", "templates", "archive", ...(user?.is_admin ? ["admin"] : [])].map((key) => {
              const isActive = page === key;
              return (
                <button
                  key={key} onClick={() => onNavigate(key)}
                  className={`flex items-center gap-3 rounded-xl hover:bg-white/5 hover:text-white transition-all text-sm ${collapsed ? "justify-center w-11 h-11 p-0" : "w-full px-3 py-2.5"} ${isActive ? "bg-white/10 text-white font-semibold shadow-sm" : ""}`}
                >
                  <span className={`${collapsed ? "text-base" : "w-4 text-center text-sm"}`}><i className={navIcons[key]}></i></span>
                  {!collapsed && <span>{t(key)}</span>}
                </button>
              );
            })}
          </nav>

          {/* CHATLAR RO'YXATI */}
          {!collapsed && activeChats.length > 0 && (
            <div className="mt-6 flex flex-col">
              {pinnedChats.length > 0 && (
                <div className="mb-4">
                  <p className="px-5 mb-1.5 text-xs font-semibold tracking-wider text-white/30 uppercase flex items-center gap-1.5">
                    <i className="fa-solid fa-thumbtack text-[10px]"></i> {t("pinned")}
                  </p>
                  <div className="px-2 space-y-0.5">
                    {pinnedChats.map((chat) => (
                      <div key={chat.id} className={`w-full group/chat relative flex items-center justify-between rounded-lg transition-colors ${page === "chat" && chat.id === activeChatId ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}`}>
                        <button onClick={() => onSelectChat(chat.id)} className="flex-1 block truncate text-left px-3 py-2 text-sm pr-8">{chat.title || t("noName")}</button>
                        <div className="absolute right-2 flex items-center gap-1">
                          <i className="fa-solid fa-thumbtack text-white/30 text-[10px] group-hover/chat:hidden"></i>
                          <button onClick={(e) => handleMenuToggle(e, chat.id)} className="p-1 text-white/40 hover:text-white invisible group-hover/chat:visible transition-all rounded"><i className="fa-solid fa-ellipsis text-xs"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unpinnedChats.length > 0 && (
                <div>
                  <p className="px-5 mb-1.5 text-xs font-semibold tracking-wider text-white/30 uppercase">{page === "archive" ? t("archive") : t("recent")}</p>
                  <div className="px-2 space-y-0.5">
                    {unpinnedChats.map((chat) => (
                      <div key={chat.id} className={`w-full group/chat relative flex items-center justify-between rounded-lg transition-colors ${page === "chat" && chat.id === activeChatId ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}`}>
                        <button onClick={() => onSelectChat(chat.id)} className="flex-1 block truncate text-left px-3 py-2 text-sm pr-8">{chat.title || t("noName")}</button>
                        <div className="absolute right-2 flex items-center"><button onClick={(e) => handleMenuToggle(e, chat.id)} className="p-1 text-white/40 hover:text-white invisible group-hover/chat:visible transition-all rounded"><i className="fa-solid fa-ellipsis text-xs"></i></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`relative border-t border-white/10 pt-2 pb-2 shrink-0 bg-[#0d0d0d] w-full ${collapsed ? "flex justify-center px-0" : "px-2"}`}>
          {menuOpen && <AccountMenu user={{...user, name: displayName}} onNavigate={onNavigate} onSignOut={onSignOut} onClose={() => setMenuOpen(false)} />}
        <button
  onClick={() => setMenuOpen((v) => !v)}
  className={`flex items-center gap-2.5 rounded-xl hover:bg-white/5 text-white transition-colors ${
    collapsed ? "justify-center w-11 h-11 p-0" : "w-full px-2 py-2"
  }`}
>
  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-white/10">
    {user?.picture || user?.avatar ? (
      <img 
        src={user.picture || user.avatar} 
        alt={user?.name || "User"} 
        className="w-full h-full object-cover" 
      />
    ) : (
      <span className="text-white">
        {(user?.name || "U").charAt(0).toUpperCase()}
      </span>
    )}
  </div>

  {!collapsed && (
    <span className="leading-tight text-left flex-1 min-w-0">
      <span className="block text-sm font-medium truncate text-white">
        {user?.name || "Foydalanuvchi"}
      </span>
      <span className="block text-[11px] text-white/40">
        {user?.plan || t("freePlan")}
      </span>
    </span>
  )}
</button>
        </div>
      </aside>

      {contextMenu.chatId && (
        <div ref={menuRef} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[300] w-56 bg-[#1e1e1f] border border-white/10 rounded-xl shadow-2xl py-1.5 text-xs text-white/90">
          <button onClick={() => { const selectedChat = localChats.find(c => c.id === contextMenu.chatId); setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false }); if (selectedChat) setShareModalChat(selectedChat); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left font-medium"><i className="fa-solid fa-share text-white/50 w-4 text-center"></i> {t("share")}</button>
          <button onClick={() => { const selectedChat = localChats.find(c => c.id === contextMenu.chatId); setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false }); if (selectedChat) setRenameModal({ show: true, chatId: selectedChat.id, currentTitle: selectedChat.title || "" }); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left font-medium"><i className="fa-solid fa-pen text-white/50 w-4 text-center"></i> {t("rename")}</button>
          <div className="h-px bg-white/5 my-1" />
          <button onClick={() => handlePinClick(contextMenu.chatId)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left font-medium"><i className="fa-solid fa-thumbtack text-white/50 w-4 text-center"></i> {localChats.find(c => c.id === contextMenu.chatId)?.isPinned ? t("unpin") : t("pin")}</button>
          <button onClick={() => handleArchiveClick(contextMenu.chatId)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left font-medium"><i className="fa-solid fa-box-archive text-white/50 w-4 text-center"></i> {localChats.find(c => c.id === contextMenu.chatId)?.isArchived ? t("removeFromArchive") : t("addToArchive")}</button>
          <button onClick={() => { const id = contextMenu.chatId; setContextMenu({ chatId: null, x: 0, y: 0, openUpward: false }); setDeleteModal({ show: true, chatId: id }); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-400 text-left font-medium"><i className="fa-solid fa-trash-can w-4 text-center"></i> {t("delete")}</button>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareModalChat && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setShareModalChat(null)}>
          <div className="w-full max-w-md bg-[#161617] border border-white/10 rounded-2xl p-6 text-white relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShareModalChat(null)} className="absolute top-4 right-4 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5"><i className="fa-solid fa-xmark text-base"></i></button>
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center text-xl mx-auto mb-3"><i className="fa-solid fa-share-nodes"></i></div>
            <h3 className="text-base font-bold text-center mb-1 truncate px-4">{shareModalChat.title || t("noName")}</h3>
            <p className="text-xs text-center text-white/50 mb-5">Ushbu havola orqali boshqalar loyihani ko'ra olishadi.</p>
            <div className="grid grid-cols-4 gap-3 text-center mb-2">
              <button onClick={() => { handleCopyLink(shareModalChat); setShareModalChat(null); }} className="flex flex-col items-center gap-1.5 group"><div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base group-hover:bg-white group-hover:text-black transition-all"><i className="fa-solid fa-link"></i></div><span className="text-[10px] text-white/60 group-hover:text-white truncate w-full">{t("copyLink")}</span></button>
              <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareModalChat.title || "")}`)} className="flex flex-col items-center gap-1.5 group"><div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-base group-hover:bg-blue-500 group-hover:text-white transition-all"><i className="fa-brands fa-telegram"></i></div><span className="text-[10px] text-white/60 group-hover:text-white truncate w-full">Telegram</span></button>
              <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent((shareModalChat.title || "") + " " + window.location.origin)}`)} className="flex flex-col items-center gap-1.5 group"><div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-base group-hover:bg-emerald-500 group-hover:text-white transition-all"><i className="fa-brands fa-whatsapp"></i></div><span className="text-[10px] text-white/60 group-hover:text-white truncate w-full">WhatsApp</span></button>
              <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`)} className="flex flex-col items-center gap-1.5 group"><div className="w-11 h-11 rounded-xl bg-sky-600/10 text-sky-400 border border-sky-600/20 flex items-center justify-center text-base group-hover:bg-sky-600 group-hover:text-white transition-all"><i className="fa-brands fa-linkedin"></i></div><span className="text-[10px] text-white/60 group-hover:text-white truncate w-full">LinkedIn</span></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}