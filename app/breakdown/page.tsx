"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

export default function BreakdownPage() {
  const [pressNumber, setPressNumber] = useState("");
  const [description, setDescription] = useState("");
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);
  
  // Stări pentru gestionarea acțiunii live
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Cronometru activ care numără secundele de la pornirea intervenției
  useEffect(() => {
    let interval: any;
    if (activeSession && activeSession.status === "Running") {
      interval = setInterval(() => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Formatează secundele în format lizibil hh:mm:ss
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleStartIntervention = async () => {
    if (!pressNumber || !description || !fileBefore) {
      toast.error("Completează Presa, Problema și atașează Poza Before!");
      return;
    }
    toast.success("Intervenție pornită! Timpul se contorizează. ⏱️");
    // Mâine adăugăm logica de upload foto și salvare în Supabase (.insert)
    setActiveSession({
      status: "Running",
      start_time: new Date().toISOString(),
      press_number: pressNumber
    });
  };

  const handleStopIntervention = async () => {
    if (!fileAfter) {
      toast.error("Trebuie să atașezi Poza After pentru a închide oprirea!");
      return;
    }
    toast.success("Intervenție finalizată cu succes! Datele au fost salvate. ✅");
    // Mâine adăugăm logica de update în Supabase (.update) pentru oprirea timpului
    setActiveSession(null);
    setPressNumber("");
    setDescription("");
    setFileBefore(null);
    setFileAfter(null);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-slate-900 min-h-screen text-slate-100 pb-20">
      <h1 className="text-xl font-black uppercase tracking-wider text-amber-500 mb-2 border-b border-slate-800 pb-2">
        ⚠️ Press Breakdown Tracker
      </h1>
      <p className="text-xs text-slate-400 mb-6">Contorizare timpi de oprire și reparații live pe schimb.</p>

      {!activeSession ? (
        /* FORMULAR PORNIRE INTERVENȚIE */
        <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Număr Presă / Linie:</label>
            <input
              type="text"
              value={pressNumber}
              onChange={(e) => setPressNumber(e.target.value)}
              placeholder="Ex: Presa 05 KM"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descriere Problemă Piesă:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Defect de debavurare / zgârieturi pe suprafața A"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Foto Problemă (Before):</label>
            <input
              type="file"
              accept="image/*"
              capture="environment" /* Deschide direct camera pe telefon */
              onChange={(e) => setFileBefore(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700"
            />
          </div>

          <button
            onClick={handleStartIntervention}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider transition-all active:scale-95 text-sm"
          >
            🚀 Start Intervenție & Timp
          </button>
        </div>
      ) : (
        /* PANOU INTERVENȚIE IN CURS (CRONOMETRU) */
        <div className="space-y-6 bg-slate-800 p-5 rounded-xl border-2 border-amber-500 shadow-2xl text-center">
          <div className="animate-pulse inline-block bg-amber-500/10 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
            🔴 OPRIRE ÎN CURS: {activeSession.press_number}
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Timp Scurg de la Alertă</div>
            <div className="text-4xl font-mono font-black text-white bg-slate-950 py-3 rounded-xl tracking-wider border border-slate-700">
              {formatTime(elapsedTime)}
            </div>
          </div>

          <div className="text-left border-t border-slate-700 pt-4">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Foto Remediere (After):</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFileAfter(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
            />
          </div>

          <button
            onClick={handleStopIntervention}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all active:scale-95 text-sm"
          >
            🛑 Stop & Salvează Raport
          </button>
        </div>
      )}
    </div>
  );
}
