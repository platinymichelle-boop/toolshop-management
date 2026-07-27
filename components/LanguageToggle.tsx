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
    <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 w-full justify-between">
      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-full
              ${isActive 
                ? "bg-indigo-600 text-white shadow-md scale-100" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"}
            `}
            title={`Schimbă în ${lang.label}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
