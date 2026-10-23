"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: "ro", label: "RO", flag: "🇷🇴" },
    { code: "en", label: "EN", flag: "🇬🇧" },
    { code: "tr", label: "TR", flag: "🇹🇷" },
  ] as const;

  return (
    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/80 w-full justify-between shadow-inner">
      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all w-full border
              ${
                isActive
                  ? "bg-zinc-800 text-emerald-400 border-zinc-700/50 shadow-sm"
                  : "text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-800/30"
              }
            `}
            title={`Schimbă în ${lang.label}`}
          >
            <span className="text-sm grayscale-[20%] group-hover:grayscale-0 transition-all">
              {lang.flag}
            </span>
            <span className="font-mono text-[11px] font-bold">
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
