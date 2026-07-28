"use client";

import { useState } from "react";
import { DBTool, DBTech, DBPart } from "@/lib/useRepairsData";
import { supabase } from "@/lib/supabase"; // Importat pentru interogarea live pe server

interface RepairFormProps {
  t: any;
  isSaving: boolean;
  dbTools: DBTool[];
  dbTechs: DBTech[];
  dbParts: DBPart[];
  onSubmit: (data: any, files: any, reset: () => void) => void;
}

export default function RepairForm({ t, isSaving, dbTools, dbTechs, dbParts, onSubmit }: RepairFormProps) {
  const [toolNumber, setToolNumber] = useState("");
  const [failure, setFailure] = useState("");
  const [technician, setTechnician] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [replacedPart, setReplacedPart] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);

  // STĂRI NOI: Gestionarea căutării live pe server pentru repere
  const [partSearch, setPartSearch] = useState("");
  const [filteredPartsLive, setFilteredPartsLive] = useState<any[]>([]);
  const [isSearchingParts, setIsSearchingParts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Funcție de căutare asincronă direct în tabela de piese, eliminând limita de 1.000
  const handleLivePartSearch = async (val: string) => {
    setPartSearch(val);
    if (val.trim().length < 2) {
      setFilteredPartsLive([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearchingParts(true);
      setShowDropdown(true);
      const cleanTerm = `%${val.trim()}%`;

      const { data, error } = await supabase
        .from("spare_parts")
        .select("id, endr_code, specification")
        .or(`endr_code.ilike.${cleanTerm},specification.ilike.${cleanTerm}`)
        .limit(10); // Extragem top 10 cele mai relevante sugestii

      if (!error && data) {
        setFilteredPartsLive(data);
      }
    } catch (err) {
      console.error("Eroare căutare piese:", err);
    } finally {
      setIsSearchingParts(false);
    }
  };

  const resetForm = () => {
    setToolNumber(""); setFailure(""); setTechnician(""); setPriority("Medium"); setReplacedPart("");
    setPartQuantity("1"); setPartSearch(""); setFilteredPartsLive([]); setShowDropdown(false);
    setFileBefore(null); setFileAfter(null);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach((input: any) => { input.value = ""; });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      { 
        toolNumber, 
        failure, 
        technician, 
        priority, 
        replacedPart, 
        partQuantity: replacedPart ? partQuantity : "0" 
      }, 
      { before: fileBefore, after: fileAfter }, 
      resetForm
    );
  };
  return (
    <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-4xl relative">
      <h2 className="text-base font-bold text-slate-800">{t.formTitle}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={toolNumber} onChange={(e) => setToolNumber(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="">-- {t.selectTool} --</option>
          {dbTools.map((tool) => <option key={tool.id} value={tool.tool_number || ""}>{tool.tool_number}</option>)}
        </select>

        <select value={technician} onChange={(e) => setTechnician(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="">-- {t.selectTech} --</option>
          {dbTechs.map((tech) => <option key={tech.id} value={tech.name || ""}>{tech.name}</option>)}
        </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="High">{t.priorityHigh}</option>
          <option value="Medium">{t.priorityMedium}</option>
          <option value="Low">{t.priorityLow}</option>
        </select>
      </div>

      <textarea value={failure} onChange={(e) => setFailure(e.target.value)} placeholder={t.inputFailure} rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-500" />

      {/* Grid adaptat: Înlocuit dropdown-ul static de piese cu inputul de căutare live */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex gap-2 w-full md:col-span-1 relative">
          <div className="flex-1 relative">
            <input
              type="text"
              value={partSearch}
              onChange={(e) => handleLivePartSearch(e.target.value)}
              onFocus={() => { if (partSearch.trim().length >= 2) setShowDropdown(true); }}
              placeholder={replacedPart ? `${replacedPart}` : t.selectPart || "Scrie cod sau denumire piesă..."}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-indigo-500"
            />
            
            {/* Meniu plutitor cu sugestii din baza de date */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {isSearchingParts ? (
                  <div className="p-3 text-xs text-slate-400 italic">Se caută în 4.843 repere...</div>
                ) : filteredPartsLive.length > 0 ? (
                  filteredPartsLive.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        setReplacedPart(part.endr_code);
                        setPartSearch(`${part.endr_code} - ${part.specification}`);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-indigo-50 text-xs font-semibold text-slate-700 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="text-indigo-600 font-mono font-bold">{part.endr_code}</span>
                      <span className="text-slate-500 font-medium truncate">{part.specification}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400 italic">Niciun rezultat găsit</div>
                )}
              </div>
            )}
          </div>

          {/* INPUTUL PENTRU CANTITATE */}
          {replacedPart && (
            <input 
              type="number" 
              min="1" 
              value={partQuantity} 
              onChange={(e) => setPartQuantity(e.target.value)} 
              placeholder="Qty"
              className="w-20 p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-sm font-bold text-center text-slate-800 focus:outline-amber-500 transition-all"
              title="Cantitate piese"
            />
          )}
        </div>

        {/* MODIFICAT: Input extins pe toată lățimea rămasă, configurat cu capture pentru a deschide direct camera foto */}
        <label className="flex flex-col text-xs text-slate-500 font-bold md:col-span-2 cursor-pointer">
          {t.fileBefore}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" /* Deschide direct camera foto din spate pe dispozitivele mobile/tablete */
            onChange={(e) => setFileBefore(e.target.files?.[0] || null)} 
            className="mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 cursor-pointer" 
          />
        </label>
      </div>

      <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:bg-slate-400">
        {isSaving ? t.btnSaving : t.btnSave}
      </button>

      {/* Strat transparent de fundal pentru a închide dropdown-ul la click în exterior */}
      {showDropdown && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowDropdown(false)} />
      )}
    </form>
  );
}

