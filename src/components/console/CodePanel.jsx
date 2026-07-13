import { useState } from "react";

export default function CodePanel({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-xs text-white/60 font-mono">{code.file}</span>
        <button
          onClick={handleCopy}
          className="text-xs bg-white/10 hover:bg-white/15 transition-colors px-2.5 py-1 rounded-md"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed font-mono text-white/90 whitespace-pre">
        {code.content}
      </pre>
    </div>
  );
}
