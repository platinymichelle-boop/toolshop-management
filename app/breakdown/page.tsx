"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

// Listă fixă cu presele și liniile din fabrică (modifică denumirile după cum aveți pe teren)
const HARDCODED_PRESSES = [
  "PRS-103",
  "PRS-104",
  "PRS-105",
  "PRS-106",
  "PRS-107",
  "PRS-108",
  "PRS-109",
  "PRS-110",
];

export default function BreakdownPage() {
  // Stări pentru formulare
  const [pressNumber, setPressNumber] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [selectedMold, setSelectedMold] = useState(""); 
  const [issueDescription, setIssueDescription] = useState("");
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);
  
  // Stări pentru opțiunile încărcate din baza de date
  const [technicianOptions, setTechnicianOptions] = useState<any[]>([]);
  const [moldOptions, setMoldOptions] = useState<any[]>([]); 

  // Stări sesiune live și încărcare
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);

  // Încarcă opțiunile dinamic din DB la deschiderea paginii
  useEffect(() => {
    async function fetchDropdownData() {
      // 1. Fetch Tehnicieni din tabela public.technicians
      const { data: techs } = await supabase.from("technicians").select("id, name");
      if (techs) setTechnicianOptions(techs);

      // 2. Fetch Matrițe din tabela public.tools pe baza tool_number
      const { data: molds } = await supabase
        .from("tools")
        .select("id, tool_number")
        .order("tool_number", { ascending: true });
      if (molds) setMoldOptions(molds);
    }

    async function checkActiveSession() {
      const { data } = await supabase
        .from("breakdowns")
        .select("*")
        .eq("status", "Running")
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setActiveSession(data);
    }

    fetchDropdownData();
    checkActiveSession();
  }, []);

  // Cronometru activ
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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const uploadPhoto = async (file: File, prefix: "before" | "after") => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${prefix}.${fileExt}`;
    const filePath = `breakdowns/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("breakdown-photos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("breakdown-photos").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleStartIntervention = async () => {
    if (!pressNumber || !technicianName || !selectedMold || !issueDescription || !fileBefore) {
      toast.error("Completează toate selecțiile și atașează poza!");
      return;
    }

    setLoading(true);
    try {
      const imageBeforeUrl = await uploadPhoto(fileBefore, "before");
      const startTime = new Date().toISOString();

      const { data, error } = await supabase
        .from("breakdowns")
        .insert([
          {
            press_number: pressNumber,
            technician_name: technicianName,
            issue_description: `[Matriță: ${selectedMold}] - ${issueDescription}`,
            start_time: startTime,
            image_before_url: imageBeforeUrl,
            status: "Running",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      toast.success("Intervenție pornită cu succes! ⏱️");
    } catch (error: any) {
      console.error(error);
      toast.error("Eroare la pornire: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopIntervention = async () => {
    if (!fileAfter) {
      toast.error("Atașează Poza After pentru închidere!");
      return;
    }

    setLoading(true);
    try {
      const imageAfterUrl = await uploadPhoto(fileAfter, "after");
      const endTime = new Date().toISOString();

      const { error } = await supabase
        .from("breakdowns")
        .update({
          end_time: endTime,
          image_after_url: imageAfterUrl,
          status: "Completed",
        })
        .eq("id", activeSession.id);

      if (error) throw error;

      toast.success("Raport salvat cu succes! ✅");
      setActiveSession(null);
      setPressNumber("");
      setTechnicianName("");
      setSelectedMold("");
      setIssueDescription("");
      setFileBefore(null);
      setFileAfter(null);
    } catch (error: any) {
      console.error(error);
      toast.error("Eroare la închidere: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-4 max-w-md mx-auto bg-slate-900 min-h-screen text-slate-100 pb-20">
      <h1 className="text-xl font-black uppercase tracking-wider text-amber-500 mb-2 border-b border-slate-800 pb-2">
        ⚠️ Press Breakdown Tracker
      </h1>
      <p className="text-xs text-slate-400 mb-6">Contorizare timpi de oprire și reparații live pe schimb.</p>

      {!activeSession ? (
        <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
          
          {/* SELECT PRESA / LINIE (HARDCODED LIST) */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Presă / Linie:</label>
            <select
              disabled={loading}
              value={pressNumber}
              onChange={(e) => setPressNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="">-- Alege Presa --</option>
              {HARDCODED_PRESSES.map((press, index) => (
                <option key={index} value={press}>{press}</option>
              ))}
            </select>
          </div>

          {/* SELECT TEHNICIAN */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Tehnician:</label>
            <select
              disabled={loading}
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="">-- Alege Tehnicianul --</option>
              {technicianOptions.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* SELECT MATRIȚĂ DYNAMIC */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Matriță:</label>
            <select
              disabled={loading}
              value={selectedMold}
              onChange={(e) => setSelectedMold(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="">-- Alege Matrița --</option>
              {moldOptions
                .filter((item) => item.tool_number !== null)
                .map((item) => (
                  <option key={item.id} value={item.tool_number}>{item.tool_number}</option>
              ))}
            </select>
          </div>

          {/* DESCRIERE */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descriere Problemă Piesă:</label>
            <textarea
              disabled={loading}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Ex: Defect de debavurare / zgârieturi"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>

          {/* FILE INPUT BEFORE */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Foto Problemă (Before):</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={loading}
              onChange={(e) => setFileBefore(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleStartIntervention}
            disabled={loading}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Se încarcă..." : "🚀 Start Intervenție & Timp"}
          </button>
        </div>
      ) : (
        /* PANOU INTERVENȚIE IN CURS (CRONOMETRU ACTIVE) */
        <div className="space-y-6 bg-slate-800 p-5 rounded-xl border-2 border-amber-500 shadow-2xl text-center">
          <div className="animate-pulse inline-block bg-amber-500/10 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
            🔴 OPRIRE ÎN CURS: {activeSession.press_number}
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Timp Scurs de la Alertă</div>
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
              disabled={loading}
              onChange={(e) => setFileAfter(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleStopIntervention}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Se salvează..." : "🛑 Stop & Salvează Raport"}
          </button>
        </div>
      )}
    </div>
  );
}
