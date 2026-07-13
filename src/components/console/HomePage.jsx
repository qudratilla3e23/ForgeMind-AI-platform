import { useRef, useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import * as fflate from "fflate";

export default function HomePage({ user, onStartChat }) {
  const { t, language } = useLanguage(); 
  const h = t("console.homePage");
  const [value, setValue] = useState("");
  
  // Fayllar va Modal statelari
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  // Ovozli chat statelari
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);

  // AI Agentlar va Effort menyusi statelari
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [effortMenuOpen, setEffortMenuOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("sonnet");
  const [selectedEffort, setSelectedEffort] = useState("Medium"); 
  const [isEffortDropUp, setIsEffortDropUp] = useState(false); // Joy yetmaganda tepaga ochish uchun state

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const agentMenuRef = useRef(null);
  const effortTriggerRef = useRef(null); // Effort tugmasi elementi
  const effortSubMenuRef = useRef(null);  // Effort ichki oynasi elementi

  // Tashqariga bosganda asosiy va ichki menyularni yopish
  useEffect(() => {
    function handleClickOutside(event) {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target)) {
        setAgentMenuOpen(false);
        setEffortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effort oynasi ochilganda ekran pastiga sig'ishini tekshirish
  useEffect(() => {
    if (effortMenuOpen && effortTriggerRef.current) {
      const rect = effortTriggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const expectedMenuHeight = 160; // Ichki menyuning taxminiy balandligi (pikselda)
      
      // Agar pastda joy kam bo'lsa, tepaga ochish rejimini yoqamiz
      if (rect.top + expectedMenuHeight > viewportHeight) {
        setIsEffortDropUp(true);
      } else {
        setIsEffortDropUp(false);
      }
    }
  }, [effortMenuOpen]);

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
      haiku: { name: "Haiku 4.5", badge: "Самый быстрый для коротких ответов", isPro: false, basePower: 60 }
    }
  };

  const currentAgents = agentData[language] || agentData["uz"];

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
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudio({ blob: audioBlob, url: audioUrl, duration: seconds });
        }
        closeMicrophone();
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      alert("Microphone error!");
    }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && recording) mediaRecorderRef.current.stop(); };
  const cancelRecording = () => { if (mediaRecorderRef.current && recording) { audioChunksRef.current = []; mediaRecorderRef.current.stop(); setRecordedAudio(null); } };
  
  const closeMicrophone = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    setSeconds(0);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
  };

  const handleSubmit = () => {
    if (!value.trim() && pendingFiles.length === 0 && !recordedAudio) return;
    onStartChat({
      text: value.trim() || undefined,
      files: pendingFiles,
      voice: recordedAudio ? recordedAudio.blob : undefined,
      agent: selectedAgent,
      effort: selectedEffort
    });
    setValue("");
    setPendingFiles([]);
    setRecordedAudio(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (window.innerWidth > 768) {
        e.preventDefault();
        handleSubmit(); 
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-12 md:py-16 relative bg-[#0d0d0d]">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="font-display text-2xl md:text-3xl mb-6 md:mb-8 text-white">
          {h?.greeting || "Xush kelibsiz"} {user?.name?.split(" ")[0]}?
        </h1>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left relative shadow-xl">
          
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={value ? "" : placeholder + "|"}
            className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-white/30 mb-2 text-white/90"
          />

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
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
              <span className="flex items-center gap-2.5 text-sm text-white/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                {language === "ru" ? "Запись голоса..." : language === "en" ? "Recording voice..." : "Ovoz yozilmoqda..."} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onClick={cancelRecording} className="bg-white/5 hover:bg-red-500/20 text-red-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                  <i className="fa-solid fa-ban"></i> {language === "ru" ? "Отмена" : language === "en" ? "Cancel" : "Bekor qilish"}
                </button>
                <button onClick={stopRecording} className="bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1.5">
                  <i className="fa-solid fa-check"></i> {language === "ru" ? "Готово" : language === "en" ? "Done" : "Bo'ldi"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-4 border-t border-white/[0.05] pt-3 relative">
              
              <div className="relative" ref={agentMenuRef}>
                <button 
                  onClick={() => { setAgentMenuOpen(!agentMenuOpen); setEffortMenuOpen(false); }}
                  className={`text-xs bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-white/90 hover:bg-white/10 transition-all flex items-center gap-1.5 ${agentMenuOpen ? 'bg-white/10' : ''}`}
                >
                  <span className="font-sans font-medium text-xs text-white/80">{currentAgents[selectedAgent]?.name}</span>
                  <i className={`fa-solid fa-chevron-down text-[10px] text-white/40 transition-transform ${agentMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {agentMenuOpen && (
                  <div className="absolute top-full mt-2 left-0 w-72 md:w-80 bg-[#1a1a1a] border border-white/10 rounded-xl py-1.5 shadow-2xl z-50 animate-fade-in text-left">
                    
                    {Object.keys(currentAgents).map((key) => {
                      const agent = currentAgents[key];
                      const isSelected = selectedAgent === key;
                      const currentPower = Math.min(100, Math.max(10, agent.basePower + getEffortBonus(selectedEffort)));

                      return (
                        <div key={key} className="w-full px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                          <button
                            onClick={() => { 
                              setSelectedAgent(key); 
                              setAgentMenuOpen(false); 
                            }}
                            className="w-full text-left flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white/90">{agent.name}</span>
                                {agent.badge && <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-md">{agent.badge}</span>}
                              </div>
                              <span className="text-xs text-white/40 mt-0.5">{agent.desc}</span>
                            </div>
                            <div>
                              {agent.isPro ? (
                                <span className="text-xs border border-white/20 text-white/80 rounded-full px-2.5 py-1 bg-white/[0.02] hover:bg-white/[0.08] font-medium">
                                  {language === "ru" ? "Продлить" : language === "en" ? "Upgrade" : "Yangilash"}
                                </span>
                              ) : (
                                isSelected && <i className="fa-solid fa-check text-blue-500 text-sm"></i>
                              )}
                            </div>
                          </button>

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

                    <div className="border-t border-white/[0.06] my-1.5"></div>
                    
                    <div 
                      ref={effortTriggerRef}
                      className="relative"
                      onMouseEnter={() => setEffortMenuOpen(true)}
                      onMouseLeave={() => setEffortMenuOpen(false)}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEffortMenuOpen(!effortMenuOpen); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center justify-between text-sm text-white/90"
                      >
                        <span className="font-medium">{language === "ru" ? "Усилие" : language === "en" ? "Effort" : "Kuchlanish"}</span>
                        <div className="flex items-center gap-1.5 text-white/40 text-xs">
                          <span className="text-blue-400 font-semibold">{selectedEffort}</span>
                          <i className={`fa-solid fa-chevron-right text-[10px] transition-transform ${effortMenuOpen ? 'rotate-90 text-blue-400' : ''}`}></i>
                        </div>
                      </button>

                      {effortMenuOpen && (
                        <div 
                          ref={effortSubMenuRef}
                          className={`absolute left-full w-40 bg-[#2c2c2c] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 animate-fade-in flex flex-col gap-0.5 ml-1 ${
                            isEffortDropUp ? 'bottom-0 top-auto' : 'top-0 bottom-auto'
                          }`}
                        >
                          {["Low", "Medium", "High", "Max"].map((level) => (
                            <button
                              key={level}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedEffort(level); 
                                setEffortMenuOpen(false); 
                                setAgentMenuOpen(false);
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

                    <div className="border-t border-white/[0.06] my-1.5"></div>

                    <button className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center justify-between text-sm text-white/90">
                      <span className="font-medium">{language === "ru" ? "Другие модели" : language === "en" ? "More models" : "Boshqa modellar"}</span>
                      <i className="fa-solid fa-chevron-right text-[10px] text-white/40"></i>
                    </button>

                  </div>
                )}
              </div>

              <div className="flex items-center gap-3.5 text-white/40">
                <button onClick={startRecording} aria-label="Record voice" className="hover:text-cyan-400 transition-colors text-base p-1">
                  <i className="fa-solid fa-microphone"></i>
                </button>
                <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="hover:text-green-400 transition-colors text-base p-1">
                  <i className="fa-solid fa-paperclip"></i>
                </button>
                <input ref={fileInputRef} type="file" onChange={handleFiles} multiple className="hidden" />
                <button onClick={handleSubmit} aria-label="Send" className="bg-white text-black hover:bg-white/90 rounded-full w-8 h-8 flex items-center justify-center transition-transform active:scale-95">
                  <i className="fa-solid fa-arrow-up font-bold text-sm"></i>
                </button>
              </div>
            </div>
          )}
        </div>
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