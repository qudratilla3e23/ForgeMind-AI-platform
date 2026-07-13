import { useRef, useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import * as fflate from "fflate";

// ==========================================
// 1. VOICE PLAYER COMPONENT (Optimized)
// ==========================================
function VoicePlayer({ audioUrl, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsPlaying(false);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Audio ijro etilmadi:", err));
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5 mt-1 w-fit min-w-[160px]">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-[#6d5dfc] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play text-[11px] ml-0.5"}`} />
      </button>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-white/80">Ovozli xabar</span>
        <span className="text-[10px] text-white/40 font-mono">
          0:{String(duration || 0).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 2. FILE RENDERER COMPONENT
// ==========================================
function FileRenderer({ file }) {
  if (!file || !file.url) return null;
  const type = file.type || "";

  if (file.isImage || type.startsWith("image/")) {
    return (
      <img src={file.url} alt="attachment" className="rounded-xl mb-2 max-h-60 object-cover shadow-md border border-white/10" />
    );
  }

  if (file.isVideo || type.startsWith("video/")) {
    return (
      <video src={file.url} controls className="rounded-xl mb-2 max-h-64 w-full object-contain bg-black shadow-md border border-white/10" />
    );
  }

  if (type === "application/pdf") {
    return (
      <a 
        href={file.url} 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors rounded-xl p-3 mb-2 text-white max-w-sm"
      >
        <i className="fa-solid fa-file-pdf text-red-400 text-2xl" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-medium truncate">{file.name || "Hujjat.pdf"}</span>
          <span className="text-[10px] text-white/40">PDF Fayl • Ochish uchun bosing</span>
        </div>
      </a>
    );
  }

  if (file.isZip) {
    return (
      <div className="flex flex-col bg-[#1e1a0a] border border-yellow-500/20 rounded-xl mb-2 max-w-xl overflow-hidden shadow-lg">
        <div className="bg-white/5 px-3 py-1.5 flex items-center justify-between border-b border-white/5">
          <span className="text-[11px] font-mono text-yellow-400 flex items-center gap-1.5">
            <i className="fa-solid fa-file-zipper" /> {file.name || "arxiv.zip"}
          </span>
        </div>
        {file.zipContents && (
          <div className="p-3 font-mono text-[11px] text-yellow-200/80 max-h-32 overflow-y-auto bg-black/20">
            {file.zipContents.map((path, idx) => (
              <div key={idx} className="truncate">• {path}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (
    file.isCode ||
    type.startsWith("text/") ||
    file.name?.endsWith(".py") || 
    file.name?.endsWith(".js") ||
    file.name?.endsWith(".jsx") ||
    file.name?.endsWith(".ts") ||
    file.name?.endsWith(".tsx") ||
    file.name?.endsWith(".json")
  ) {
    return (
      <div className="flex flex-col bg-[#141414] border border-white/10 rounded-xl mb-2 max-w-xl overflow-hidden shadow-lg">
        <div className="bg-white/5 px-3 py-1.5 flex items-center justify-between border-b border-white/5">
          <span className="text-[11px] font-mono text-white/60 flex items-center gap-1.5">
            <i className="fa-solid fa-code text-purple-400" /> {file.name || "kod_fayli"}
          </span>
          <a href={file.url} download={file.name} className="text-[10px] text-purple-400 hover:underline">Yuklab olish</a>
        </div>
        {file.content && (
          <pre className="p-3 text-[11px] font-mono text-emerald-400 max-h-40 overflow-y-auto whitespace-pre overflow-x-auto bg-black/30">
            <code>{file.content}</code>
          </pre>
        )}
      </div>
    );
  }

  return (
    <a 
      href={file.url} 
      download={file.name}
      className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-xl p-3 mb-2 text-white max-w-sm"
    >
      <i className="fa-solid fa-file-lines text-purple-400 text-2xl" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium truncate">{file.name || "Fayl"}</span>
        <span className="text-[10px] text-white/40">Yuklab olish uchun bosing</span>
      </div>
    </a>
  );
}

// ==========================================
// 3. MESSAGE BUBBLE COMPONENT
// ==========================================
function MessageBubble({ m, index, cc, currentModel, customModels, onDelete, onRetry, totalMessages }) {
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function clickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (isSpeaking) window.speechSynthesis.cancel();
    };
  }, [isSpeaking]);

  const handleCopy = async () => {
    if (!m.text) return;
    await navigator.clipboard.writeText(m.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleListen = () => {
    if (!m.text) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(m.text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleExportToDocs = () => {
    if (!m.text) return;
    const encodedText = encodeURIComponent(m.text);
    window.open(`https://docs.google.com/document/u/0/create?title=AI_Response&body=${encodedText}`, "_blank");
    setShowMoreMenu(false);
  };

  const handleDraftInGmail = () => {
    if (!m.text) return;
    const encodedBody = encodeURIComponent(m.text);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=AI+Asistent+Javobi&body=${encodedBody}`, "_blank");
    setShowMoreMenu(false);
  };

  return (
    <div className="group relative flex flex-col space-y-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 whitespace-pre-line relative shadow-sm transition-all ${
          m.role === "user"
            ? "ml-auto bg-[#4b4453] text-white max-w-xs rounded-tr-sm"
            : m.role === "system-error"
            ? "bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm w-full"
            : "bg-white/5 text-white/90 rounded-tl-sm border border-white/[0.03]"
        }`}
      >
        {m.role === "system-error" && (
          <p className="flex items-center gap-2 mb-1 font-medium">
            <i className="fa-solid fa-triangle-exclamation text-amber-500" />
            {cc?.aiNotConfigured || "AI sozlanmagan"}
          </p>
        )}

        {m.role === "assistant" && (
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-purple-300 mb-2 opacity-80 font-semibold select-none">
            <span>
              {customModels[m.usedProvider]?.name || m.usedProvider || currentModel?.name}
              {m.reason && <span className="text-white/40 normal-case tracking-normal"> · {m.reason}</span>}
            </span>
            {m.agentMode && (
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Agent Mode
              </span>
            )}
          </div>
        )}

        {m.demo && (
          <p className="text-[11px] uppercase tracking-wide text-white/30 mb-1.5">{cc?.demoBadge || "DEMO"}</p>
        )}

        {m.role === "assistant" && m.thinking && (
          <div className="mb-3 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.02] transition-colors font-medium"
            >
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-brain text-purple-400 animate-pulse" />
                Agent fikrlash jarayoni...
              </span>
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${thinkingExpanded ? "rotate-180" : ""}`} />
            </button>
            {thinkingExpanded && (
              <div className="px-3 pb-2.5 pt-1 text-xs text-white/40 border-t border-white/[0.03] italic font-mono max-h-40 overflow-y-auto bg-black/10">
                {m.thinking}
              </div>
            )}
          </div>
        )}

        {m.files && m.files.map((file, idx) => <FileRenderer key={idx} file={file} />)}
        {m.file && !m.files && <FileRenderer file={m.file} />}
        {m.image && !m.file && !m.files && <img src={m.image} alt="attachment" className="rounded-lg mb-2 max-h-48 object-cover shadow-md" />}
        {m.voice && <VoicePlayer audioUrl={m.voice} duration={m.voiceDuration} />}

        {m.text && (
          <div className="text-[14.5px] leading-relaxed text-white/95 mt-1 select-text">
            {m.text}
          </div>
        )}
      </div>

      {m.role !== "system-error" && (
        <div className={`flex items-center gap-1.5 text-xs text-white/40 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {m.role === "assistant" && m.text && (
            <button
              onClick={handleListen}
              className={`hover:text-white p-1 rounded transition-colors flex items-center gap-1 ${isSpeaking ? "text-purple-400 font-medium" : ""}`}
              title="Ovozli eshitish"
            >
              <i className={`fa-solid ${isSpeaking ? "fa-volume-high animate-pulse" : "fa-volume-low"}`} />
              <span className="text-[11px]">Eshitish</span>
            </button>
          )}

          {m.text && (
            <button
              onClick={handleCopy}
              className="hover:text-white p-1 rounded transition-colors flex items-center gap-1"
              title="Nusxalash"
            >
              <i className={`fa-solid ${copied ? "fa-check text-emerald-400" : "fa-copy"}`} />
              <span className="text-[11px]">{copied ? "Nusxalandi!" : "Nusxa"}</span>
            </button>
          )}

          {m.role === "user" && index === totalMessages - 1 && onRetry && (
            <button
              onClick={() => onRetry(m)}
              className="hover:text-amber-400 p-1 rounded transition-colors flex items-center gap-1"
              title="Qayta yuborish"
            >
              <i className="fa-solid fa-arrows-rotate" />
              <span className="text-[11px]">Qayta yuborish</span>
            </button>
          )}

          <button
            onClick={() => onDelete(index)}
            className="hover:text-red-400 p-1 rounded transition-colors flex items-center gap-1"
            title="O'chirish"
          >
            <i className="fa-solid fa-trash-can" />
            <span className="text-[11px]">O'chirish</span>
          </button>

          {m.role === "assistant" && m.text && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="hover:text-white p-1 rounded transition-colors flex items-center justify-center"
                title="Ko'proq"
              >
                <i className="fa-solid fa-ellipsis" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 bottom-full mb-1 w-44 bg-[#1e1e1e] border border-white/10 rounded-xl py-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={handleExportToDocs}
                    className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-file-word text-blue-400" />
                    <span>Export to Docs</span>
                  </button>
                  
                  <button
                    onClick={handleDraftInGmail}
                    className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-envelope text-red-400" />
                    <span>Draft in Gmail</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. MAIN CHAT PAGE COMPONENT
// ==========================================
export default function ChatPage({ messages, onSend, onDeleteMessage, onRetryMessage, provider, onProviderChange, loading, agentStatus }) {
  const { t, language } = useLanguage();
  const cc = t ? t("console.chat") : null;
  
  const [value, setValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [effortMenuOpen, setEffortMenuOpen] = useState(false);
  const [selectedEffort, setSelectedEffort] = useState("Medium");
  const [isAgentActive, setIsAgentActive] = useState(true);

  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const menuRef = useRef(null);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Effort menyusi sekinroq yopilishi uchun mo'ljallangan ref
  const effortTimeoutRef = useRef(null);

  const agentData = {
    uz: {
      fable: { name: "Fable 5", badge: "Pro", desc: "Eng qiyin vazifalar va loyihalar uchun", isPro: true, basePower: 90 },
      opus: { name: "Opus 4.8", badge: "Pro", desc: "Murakkab mantiqiy kodlash va tahlil", isPro: true, basePower: 85 },
      sonnet: { name: "Sonnet 5", badge: "", desc: "Kundalik vazifalar uchun eng samarali model", isPro: false, basePower: 75 },
      haiku: { name: "Haiku 4.5", badge: "", desc: "Tezkor savol-javoblar uchun juda chaqqon", isPro: false, basePower: 60 }
    },
    en: {
      fable: { name: "Fable 5", badge: "Pro", desc: "For your toughest challenges", isPro: true, basePower: 90 },
      opus: { name: "Opus 4.8", badge: "Pro", desc: "For complex tasks", isPro: true, basePower: 85 },
      sonnet: { name: "Sonnet 5", badge: "", desc: "Most efficient for everyday tasks", isPro: false, basePower: 75 },
      haiku: { name: "Haiku 4.5", badge: "", desc: "Fastest for quick answers", isPro: false, basePower: 60 }
    },
    ru: {
      fable: { name: "Fable 5", badge: "Pro", desc: "Для ваших самых сложных задач", isPro: true, basePower: 90 },
      opus: { name: "Opus 4.8", badge: "Pro", desc: "Для сложных комплексных задач", isPro: true, basePower: 85 },
      sonnet: { name: "Sonnet 5", badge: "", desc: "Наиболее эффективен для повседневных задач", isPro: false, basePower: 75 },
      haiku: { name: "Haiku 4.5", badge: "", desc: "Самый быстрый для коротких ответов", isPro: false, basePower: 60 }
    }
  };

  const customModels = agentData[language] || agentData["uz"];

  const getEffortBonus = (effort) => {
    switch (effort) {
      case "Low": return -15;
      case "Medium": return 0;
      case "High": return 10;
      case "Max": return 15;
      default: return 0;
    }
  };

  const localPlaceholders = {
    uz: [
      "Bugun qanday ajoyib loyiha yaratamiz? 🚀",
      "Istalgan g'oyangizni yozing, AI uni dasturga aylantiradi...",
      "React komponent yarat yoki xatolarni to'g'rilab ver..."
    ],
    en: [
      "What amazing project are we building today? 🚀",
      "Type any idea, and AI will turn it into software...",
      "Create a React component or fix bugs..."
    ],
    ru: [
      "Какой отличный проект мы создадим сегодня? 🚀",
      "Напишите любую идею, и ИИ превратит ее в код...",
      "Создай React компонент или исправь ошибки..."
    ]
  };

  const currentPlaceholders = localPlaceholders[language] || localPlaceholders["uz"];
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    let textIndex = 0, charIndex = 0, deleting = false;
    const speed = 70, deleteSpeed = 35, wait = 1500;
    let timeout;

    const animate = () => {
      const current = currentPlaceholders[textIndex] || "";
      if (!deleting) {
        setPlaceholder(current.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === current.length) { deleting = true; timeout = setTimeout(animate, wait); return; }
      } else {
        setPlaceholder(current.substring(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) { deleting = false; textIndex = (textIndex + 1) % currentPlaceholders.length; }
      }
      timeout = setTimeout(animate, deleting ? deleteSpeed : speed);
    };

    animate();
    return () => clearTimeout(timeout);
  }, [language]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setEffortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [value]);

  const handleEffortMouseEnter = () => {
    if (effortTimeoutRef.current) {
      clearTimeout(effortTimeoutRef.current);
    }
    setEffortMenuOpen(true);
  };

  const handleEffortMouseLeave = () => {
    effortTimeoutRef.current = setTimeout(() => {
      setEffortMenuOpen(false);
    }, 100);
  };

  const getFileIcon = (file) => {
    if (file.isImage) return <i className="fa-solid fa-file-image text-green-400"></i>;
    if (file.isVideo) return <i className="fa-solid fa-file-video text-blue-400"></i>;
    if (file.isZip) return <i className="fa-solid fa-file-zipper text-yellow-500"></i>;
    if (file.isCode || file.type?.includes("json")) return <i className="fa-solid fa-file-code text-cyan-400"></i>;
    return <i className="fa-solid fa-file-lines text-gray-400"></i>;
  };

  const handleFiles = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isZip = file.type.includes("zip") || file.name.endsWith(".zip");
      const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css", ".json", ".cpp", ".c", ".cs", ".go", ".php", ".rb", ".java"];
      const isCode = codeExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) || file.type.startsWith("text/");

      const reader = new FileReader();
      reader.onload = () => {
        let fileData = reader.result;
        let zipContents = null;

        if (isZip) {
          try {
            const uint8 = new Uint8Array(reader.result);
            const unzipped = fflate.unzipSync(uint8);
            zipContents = Object.keys(unzipped);
          } catch (err) {
            zipContents = ["ZIP xatolik."];
          }
        }

        setPendingFiles((prev) => [
          ...prev,
          { id: crypto.randomUUID(), url: fileData, name: file.name, type: file.type, isImage, isVideo, isZip, isCode, zipContents }
        ]);
      };

      if (isZip) reader.readAsArrayBuffer(file);
      else if (isCode) reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeFile = (id, e) => {
    e.stopPropagation();
    setPendingFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);
      
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert("Mikrofondan foydalanishga ruxsat bering!");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !recording) return;
    clearInterval(timerRef.current);
    const finalSeconds = seconds;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordedAudio({ blob: audioBlob, url: audioUrl, duration: finalSeconds });
      
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      setRecording(false);
      setSeconds(0);
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || !recording) return;
    clearInterval(timerRef.current);
    mediaRecorderRef.current.ondataavailable = null;
    mediaRecorderRef.current.stop();

    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setRecording(false);
    setSeconds(0);
    setRecordedAudio(null);
    audioChunksRef.current = [];
  };

  const handleSend = () => {
    if (!value.trim() && pendingFiles.length === 0 && !recordedAudio) return;
    
    onSend({
      role: "user",
      text: value.trim() || undefined,
      files: pendingFiles.length > 0 ? pendingFiles : undefined,
      voice: recordedAudio ? recordedAudio.url : undefined, 
      voiceDuration: recordedAudio ? recordedAudio.duration : undefined,
      effort: selectedEffort,
      agentMode: isAgentActive,
    });
    
    setValue("");
    setPendingFiles([]);
    setRecordedAudio(null);
  };

  const currentModel = customModels[provider] || customModels["sonnet"];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d]">
      {/* Xabarlar maydoni */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id || i}
            index={i}
            m={m}
            cc={cc}
            currentModel={currentModel}
            customModels={customModels}
            onDelete={onDeleteMessage}
            onRetry={onRetryMessage}
            totalMessages={messages.length}
          />
        ))}
        
        {loading && (
          <div className="max-w-md rounded-2xl px-4 py-3 bg-white/5 border border-white/[0.03] text-sm w-fit flex flex-col gap-2 shadow-sm animate-pulse">
            <div className="flex items-center gap-2.5 text-white/60">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
              </div>
              <span className="text-xs font-mono text-purple-300">
                {agentStatus || "Agent fikrlash jarayonida..."}
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input boshqaruv paneli */}
      <div className="p-4 bg-[#0d0d0d] border-t border-white/5">
        
        {recordedAudio && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5 mb-3 w-full max-w-md">
            <span className="text-cyan-400 text-base pl-1"><i className="fa-solid fa-volume-high"></i></span>
            <audio src={recordedAudio.url} controls className="h-8 flex-1 accent-white" />
            <button onClick={() => setRecordedAudio(null)} className="text-white/40 hover:text-red-400 p-1 transition-colors">
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto p-1">
            {pendingFiles.map((file) => (
              <div key={file.id} onClick={() => setPreviewFile(file)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 w-fit cursor-pointer transition-colors">
                {file.isImage ? <img src={file.url} alt="" className="w-6 h-6 rounded object-cover" /> : <span className="text-sm">{getFileIcon(file)}</span>}
                <span className="text-xs text-white/60 max-w-[120px] truncate">{file.name}</span>
                <button onClick={(e) => removeFile(file.id, e)} className="text-white/40 hover:text-red-400 text-xs ml-1"><i className="fa-solid fa-xmark"></i></button>
              </div>
            ))}
          </div>
        )}

        {recording ? (
          <div className="flex items-center justify-between bg-[#1e1e1e] border border-white/5 rounded-2xl px-4 py-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-sm text-white/90">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{language === "ru" ? "Запись голоса..." : language === "en" ? "Recording voice..." : "Ovoz yozilmoqda..."} 0:{String(seconds).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={cancelRecording} className="bg-white/5 hover:bg-white/10 text-red-400 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 border border-white/5 transition-colors">
                <i className="fa-solid fa-ban text-[10px]" /> {language === "ru" ? "Отмена" : language === "en" ? "Cancel" : "Bekor qilish"}
              </button>
              <button onClick={stopRecording} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
                <i className="fa-solid fa-check text-[10px]" /> {language === "ru" ? "Готово" : language === "en" ? "Done" : "Bo'ldi"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl px-4 py-3.5 shadow-xl relative" ref={menuRef}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={value ? "" : placeholder + "|"}
              className="w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-white/20 text-white/90 max-h-36 min-h-[24px] overflow-y-auto py-1"
            />
            
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.03]">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="bg-white/5 hover:bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 transition-colors">
                    <span>{currentModel?.name || "Model"}</span>
                    <i className="fa-solid fa-chevron-down text-[9px] text-white/40" />
                  </button>

                  {menuOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-80 bg-[#1a1a1a] border border-white/10 rounded-xl py-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      {Object.keys(customModels).map((key) => {
                        const m = customModels[key];
                        const isSelected = provider === key;
                        const currentPower = Math.min(100, Math.max(10, m.basePower + getEffortBonus(selectedEffort)));

                        return (
                          <div key={key} className="px-4 py-2.5 hover:bg-white/[0.02] flex flex-col gap-0.5 transition-colors">
                            <div className="flex items-center justify-between">
                              <button 
                                onClick={() => { 
                                  onProviderChange(key); 
                                  setMenuOpen(false); 
                                }} 
                                className="flex items-center gap-2 text-sm font-semibold text-white/90 text-left flex-1"
                              >
                                <span>{m.name}</span>
                                {m.badge && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{m.badge}</span>}
                              </button>
                              
                              {m.isPro ? (
                                <button 
                                  onClick={() => {
                                    onProviderChange(key);
                                    setMenuOpen(false);
                                  }}
                                  className="border border-white/20 text-white/90 text-xs font-medium px-3 py-1 rounded-full bg-white/[0.02] hover:bg-white/10 transition-colors"
                                >
                                  {language === "ru" ? "Продлить" : language === "en" ? "Upgrade" : "Yangilash"}
                                </button>
                              ) : isSelected && (
                                <i className="fa-solid fa-check text-blue-500 text-sm" />
                              )}
                            </div>
                            <p className="text-xs text-white/40 pr-8">{m.desc}</p>
                            
                            {isSelected && (
                              <div className="w-full mt-2 animate-fade-in">
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden relative">
                                  <div 
                                    className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-500 rounded-full"
                                    style={{ width: `${currentPower}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-cyan-400/60 mt-1 font-mono">
                                  <span>{language === "ru" ? "Текущая сила:" : language === "en" ? "Current Power:" : "Joriy quvvat:"}</span>
                                  <span className="font-bold">{currentPower}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="border-t border-white/10 my-1.5" />
                      
                      <div 
                        className="relative"
                        onMouseEnter={handleEffortMouseEnter}
                        onMouseLeave={handleEffortMouseLeave}
                      >
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEffortMenuOpen(!effortMenuOpen); 
                          }} 
                          className="w-full px-4 py-2 hover:bg-white/[0.04] text-sm text-white/90 flex items-center justify-between transition-colors"
                        >
                          <span>{language === "ru" ? "Усилие" : language === "en" ? "Effort" : "Kuchlanish"}</span>
                          <span className="text-blue-500 text-xs font-medium">{selectedEffort}</span>
                        </button>

                        {effortMenuOpen && (
                          <div 
                            className="absolute left-full bottom-0 ml-1 w-40 bg-[#2c2c2c] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 flex flex-col gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {["Low", "Medium", "High", "Max"].map((level) => (
                              <button
                                key={level}
                                onClick={(e) => { 
                                  e.stopPropagation();
                                  setSelectedEffort(level); 
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${selectedEffort === level ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/5'}`}
                              >
                                <span>{level}</span>
                                {selectedEffort === level && <i className="fa-solid fa-check text-xs"></i>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                <button onClick={() => setIsAgentActive(!isAgentActive)} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${isAgentActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/40 border-white/5"}`}>
                  <i className={`fa-solid fa-robot text-[11px] ${isAgentActive ? "animate-bounce" : ""}`} />
                  <span>Agent: {isAgentActive ? "ON" : "OFF"}</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={startRecording} className="text-white/40 hover:text-white/80 text-base transition-colors" title="Ovoz yozish">
                  <i className="fa-solid fa-microphone" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="text-white/40 hover:text-white/80 text-base transition-colors" title="Fayl biriktirish">
                  <i className="fa-solid fa-paperclip" />
                </button>

                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple
                  onChange={handleFiles} 
                  className="hidden" 
                />

                <button onClick={handleSend} className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/90 shadow-md transition-all active:scale-95 disabled:opacity-50" disabled={!value.trim() && pendingFiles.length === 0 && !recordedAudio}>
                  <i className="fa-solid fa-arrow-up text-sm stroke-[2px]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewFile(null)}>
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2.5">
                {getFileIcon(previewFile)}
                <span className="text-sm font-medium text-white/80 truncate max-w-md">{previewFile.name}</span>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-white/40 hover:text-white p-1 transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div className="p-6 overflow-y-auto bg-[#181818] flex-1 min-h-[300px]">
              {previewFile.isImage && <div className="flex justify-center"><img src={previewFile.url} alt="" className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-2xl" /></div>}
              {previewFile.isVideo && <div className="flex justify-center"><video src={previewFile.url} controls className="max-w-full max-h-[50vh] rounded-lg shadow-2xl" /></div>}
              {previewFile.isCode && <pre className="w-full text-left bg-black/50 p-4 rounded-xl border border-white/5 text-xs font-mono text-cyan-400 overflow-x-auto whitespace-pre-wrap max-h-[50vh]"><code>{previewFile.url}</code></pre>}
              {previewFile.isZip && (
                <div className="text-left w-full">
                  <h3 className="text-sm text-white/40 mb-3"><i className="fa-solid fa-folder-open mr-2 text-yellow-500"></i> Arxiv ichidagi fayllar ro'yxati:</h3>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-xs max-h-[40vh] overflow-y-auto">
                    {previewFile.zipContents?.map((path, idx) => (
                      <div key={idx} className="py-1.5 text-yellow-400/80 hover:text-white border-b border-white/[0.02] flex items-center gap-2"><i className="fa-solid fa-file text-[10px] text-gray-500"></i> {path}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}