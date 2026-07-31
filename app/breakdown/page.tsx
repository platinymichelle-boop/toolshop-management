"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

const HARDCODED_PRESSES = [
  "Presa 01 KM",
  "Presa 02 KM",
  "Presa 03 KM",
  "Presa 04 Engel",
  "Presa 05 Arburg",
  "Linia Asamblare 1",
  "Linia Asamblare 2",
];

export default function BreakdownPage() {
  const [pressNumber, setPressNumber] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [selectedMold, setSelectedMold] = useState(""); 
  const [issueDescription, setIssueDescription] = useState("");
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);
  
  // GESTIUNE PIESE CU CĂUTARE LIVE
  const [partInput, setPartInput] = useState(""); // Ce scrie tehnicianul în căsuță
  const [selectedPart, setSelectedPart] = useState(""); // Piesa finală selectată
  const [partOptions, setPartOptions] = useState<any[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  const [technicianOptions, setTechnicianOptions] = useState<any[]>([]);
  const [moldOptions, setMoldOptions] = useState<any[]>([]); 

  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDropdownData() {
      const { data: techs } = await supabase.from("technicians").select("id, name");
      if (techs) setTechnicianOptions(techs);

      const { data: molds } = await supabase
        .from("tools")
        .select("id, tool_number")
        .order("tool_number", { ascending: true });
      if (molds) setMoldOptions(molds);

      // Încărcăm inițial primele piese (restul le filtrăm dinamic)
      const { data: parts } = await supabase
        .from("spare_parts")
        .select("id, endr_code, specification")
        .limit(100);
      if (parts) setPartOptions(parts);
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

  // Căutare dinamică în Supabase când utilizatorul tastează în caseta de piese
  useEffect(() => {
    if (partInput.trim() === "" || partInput === selectedPart) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const cleanTerm = `%${partInput.trim()}%`;
      const { data } = await supabase
        .from("spare_parts")
        .select("id, endr_code, specification")
        .or(`endr_code.ilike.${cleanTerm},specification.ilike.${cleanTerm}`)
        .limit(10); // Afișăm doar top 10 cele mai relevante sugestii

      if (data) setPartOptions(data);
    }, 300); // Așteaptă 300ms ca tehnicianul să termine de tastat (previne cereri inutile)

    return () => clearTimeout(delayDebounce);
  }, [partInput]);

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
      toast.success("Intervenție pornită! ⏱️");
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

      const finalDescription = selectedPart 
        ? `${activeSession.issue_description} | 🔧 Piesă schimb: ${selectedPart}`
        : activeSession.issue_description;

      const { error } = await supabase
        .from("breakdowns")
        .update({
          end_time: endTime,
          image_after_url: imageAfterUrl,
          issue_description: finalDescription,
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
      setSelectedPart("");
      setPartInput("");
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
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Presă / Linie:</label>
            <select
              disabled={loading}
              value={pressNumber}
              onChange={(e) => setPressNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Alege Presa --</option>
              {HARDCODED_PRESSES.map((press, index) => (
                <option key={index} value={press}>{press}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Tehnician:</label>
            <select
              disabled={loading}
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Alege Tehnicianul --</option>
              {technicianOptions.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Selectează Matriță:</label>
            <select
              disabled={loading}
              value={selectedMold}
              onChange={(e) => setSelectedMold(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Alege Matrița --</option>
              {moldOptions
                .filter((item) => item.tool_number !== null)
                .map((item) => (
                  <option key={item.id} value={item.tool_number}>{item.tool_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descriere Problemă Piesă:</label>
            <textarea
              disabled={loading}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Ex: Defect de debavurare / zgârieturi"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Foto Problemă (Before):</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={loading}
              onChange={(e) => setFileBefore(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white"
            />
          </div>

          <button
            onClick={handleStartIntervention}
            disabled={loading}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? "Se încarcă..." : "🚀 Start Intervenție & Timp"}
          </button>
        </div>
      ) : (
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

          {/* NOU & INTUITIV: Input text cu filtrare inteligentă de la distanță */}
          <div className="text-left border-t border-slate-700 pt-4 relative">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Piesă Schimb Utilizată (Opțional):</label>
            <input
              type="text"
              disabled={loading}
              value={partInput}
              onFocus={() => setShowPartDropdown(true)}
              onChange={(e) => setPartInput(e.target.value)}
              placeholder="Scrie codul ENDR sau numele piesei..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            
            {/* Lista cu sugestiile filtrate (Apare ca un panou plutitor peste formular) */}
            {showPartDropdown && partOptions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-800">
                {partOptions.map((part) => {
                  const partText = `[${part.endr_code || 'FĂRĂ COD'}] ${part.specification || ''}`;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        setSelectedPart(partText);
                        setPartInput(partText);
                        setShowPartDropdown(false);
                      }}
                      className="w-full text-left p-2.5 text-xs hover:bg-amber-500 hover:text-slate-950 transition-colors text-slate-300 block"
                    >
                      {partText}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedPart && (
              <div className="text-[10px] text-emerald-400 font-bold mt-1">
                ✅ Selectat: {selectedPart}
              </div>
            )}
          </div>

          <div className="text-left pt-2">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Foto Remediere (After):</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={loading}
              onChange={(e) => setFileAfter(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white"
            />
          </div>

          <button
            onClick={handleStopIntervention}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl uppercase tracking-wider text-sm flex items-center justify-center gap-2"
          >
            {loading ? "Se salvează..." : "🛑 Stop & Salvează Raport"}
          </button>
        </div>
      )}
    </div>
  );
}
