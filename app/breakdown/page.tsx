"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface DBTool {
  id: number;
  tool_number: string;
}

interface DBTechnician {
  id: number;
  name: string;
}

interface ActiveSession {
  id: number;
  press_number: string;
  technician_id?: number;
  technician_name: string;
  mold_number?: string;
  issue_description: string;
  start_time: string;
  image_before_url?: string;
  status: string;
}

export default function BreakdownTrackerPage() {
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);

  // LOGICĂ DROPDOWN DINAMICĂ
  const [toolOptions, setToolOptions] = useState<DBTool[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<DBTechnician[]>(
    [],
  );
  const [moldOptions, setMoldOptions] = useState<any[]>([]);

  // REPARAT: LISTĂ DE SESIUNI ACTIVE SIMULTAN
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: number]: number }>(
    {},
  );

  // CÂMPURI FORMULAR PORNIRE (START)
  const [selectedToolId, setSelectedToolId] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [selectedMold, setSelectedMold] = useState(""); // Rămâne opțional
  const [issueDescription, setIssueDescription] = useState("");
  const [fileBefore, setFileBefore] = useState<File | null>(null);

  // CÂMPURI PIESE SCHIMB LIVE (STOP MODAL)
  const [closingSession, setClosingSession] = useState<ActiveSession | null>(
    null,
  );
  const [partInput, setPartInput] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [partOptions, setPartOptions] = useState<any[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [fileAfter, setFileAfter] = useState<File | null>(null);

  // REPARAT: Verifică dacă utilajul selectat are deja o intervenție Running
  const selectedToolObj = toolOptions.find(
    (t) => t.id === parseInt(selectedToolId),
  );
  const isMachineBlocked = selectedToolObj
    ? activeSessions.some((s) => s.press_number === selectedToolObj.tool_number)
    : false;

  // Funcție asincronă de compresie imagini (max 1920px, JPG 0.8, sub 1MB)
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1920;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              if (blob.size >= file.size) {
                resolve(file);
              } else {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                  {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  },
                );
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            0.8,
          );
        };
      };
      reader.onerror = () => resolve(file);
    });
  };
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setInitialFetchLoading(true);

        // 1. Încărcăm utilajele din tabela "tools"
        const { data: tools } = await supabase
          .from("tools")
          .select("id, tool_number")
          .order("tool_number", { ascending: true });
        if (tools) setToolOptions(tools);

        // 2. Încărcăm tehnicienii din tabela "technicians"
        const { data: techs } = await supabase
          .from("technicians")
          .select("id, name")
          .order("name", { ascending: true });
        if (techs) setTechnicianOptions(techs);

        // 3. Încărcăm matrițele din tabela "tools" (pentru câmpul opțional)
        const { data: molds } = await supabase
          .from("tools")
          .select("id, tool_number")
          .order("tool_number", { ascending: true });
        if (molds) setMoldOptions(molds);

        // 4. Încărcăm TOATE avariile active simultan din fabrică
        const { data: activeRows } = await supabase
          .from("breakdowns")
          .select("*")
          .eq("status", "Running")
          .order("start_time", { ascending: false });
        if (activeRows) setActiveSessions(activeRows as ActiveSession[]);
      } catch (err) {
        console.error("Eroare la încărcarea dropdown-urilor:", err);
      } finally {
        setInitialFetchLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // Căutare dinamică piese cu debounce de 300ms
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
        .limit(10);

      if (data) setPartOptions(data);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [partInput, selectedPart]);

  // REPARAT: Cronometru independent care rulează simultan pentru fiecare utilaj activ
  useEffect(() => {
    let interval: any;
    if (activeSessions.length > 0) {
      interval = setInterval(() => {
        const updatedTimes: { [key: number]: number } = {};
        activeSessions.forEach((session) => {
          const start = new Date(session.start_time).getTime();
          const now = new Date().getTime();
          updatedTimes[session.id] = Math.floor((now - start) / 1000);
        });
        setElapsedTimes(updatedTimes);
      }, 1000);
    } else {
      setElapsedTimes({});
    }
    return () => clearInterval(interval);
  }, [activeSessions]);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return "00:00:00";
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
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

    const { data } = supabase.storage
      .from("breakdown-photos")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };
  const handleStartIntervention = async () => {
    if (
      !selectedToolId ||
      !selectedTechId ||
      !issueDescription ||
      !fileBefore
    ) {
      toast.error("Completează toate selecțiile obligatorii și atașează poza!");
      return;
    }

    if (isMachineBlocked) {
      toast.error("There is already an active breakdown on this machine.");
      return;
    }

    const toolObj = toolOptions.find((t) => t.id === parseInt(selectedToolId));
    const techObj = technicianOptions.find(
      (t) => t.id === parseInt(selectedTechId),
    );

    if (!toolObj || !techObj) return;

    setLoading(true);
    try {
      const imageBeforeUrl = await uploadPhoto(fileBefore, "before");
      const startTime = new Date().toISOString();

      const { data, error } = await supabase
        .from("breakdowns")
        .insert([
          {
            tool_id: toolObj.id,
            press_number: toolObj.tool_number,
            technician_id: techObj.id,
            technician_name: techObj.name,
            mold_number: selectedMold || null, // Salvare opțională matriță
            issue_description: issueDescription,
            start_time: startTime,
            image_before_url: imageBeforeUrl,
            status: "Running",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setActiveSessions((prev) => [data as ActiveSession, ...prev]);
      toast.success("Intervenție pornită! ⏱️");

      // Resetare câmpuri formular
      setSelectedToolId("");
      setSelectedTechId("");
      setSelectedMold("");
      setIssueDescription("");
      setFileBefore(null);
    } catch (error: any) {
      console.error(error);
      toast.error("Eroare la pornire: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopIntervention = async () => {
    if (!closingSession || !fileAfter) {
      toast.error("Atașează Poza After pentru închidere!");
      return;
    }

    setLoading(true);
    try {
      const imageAfterUrl = await uploadPhoto(fileAfter, "after");
      const endTime = new Date().toISOString();

      const finalDescription = selectedPart
        ? `${closingSession.issue_description} | 🔧 Piesă schimb: ${selectedPart}`
        : closingSession.issue_description;

      const { error } = await supabase
        .from("breakdowns")
        .update({
          end_time: endTime,
          image_after_url: imageAfterUrl,
          issue_description: finalDescription,
          status: "Completed",
        })
        .eq("id", closingSession.id);

      if (error) throw error;

      toast.success("Raport salvat cu succes! ✅");
      setActiveSessions((prev) =>
        prev.filter((s) => s.id !== closingSession.id),
      );

      // Resetare stări modal
      setClosingSession(null);
      setSelectedPart("");
      setPartInput("");
      setFileAfter(null);
    } catch (error: any) {
      console.error(error);
      toast.error("Eroare la închidere: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialFetchLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-sm font-medium text-slate-400 animate-pulse">
        Se încarcă consola operativă Mentenanță Presaj...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto bg-slate-900 min-h-screen text-slate-100 pb-20">
      <h1 className="text-xl font-black uppercase tracking-wider text-amber-500 mb-2 border-b border-slate-800 pb-2">
        ⚠️ Press Breakdown Tracker
      </h1>
      <p className="text-xs text-slate-400 mb-6">
        Contorizare timpi de oprire și reparații live pe schimb (Stamping).
      </p>

      {/* PANOU REPARAT: AFIȘEAZĂ LISTA DE AVARII ACTIVE IN FABRICĂ SIMULTAN */}
      <div className="mb-8 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-red-500 border-b border-slate-800 pb-1">
          🔴 ACTIVE BREAKDOWNS ({activeSessions.length})
        </h2>
        {activeSessions.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-center text-xs text-slate-500 italic">
            Nu există nicio avarie activă. Toate presele rulează.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-800 border-2 border-amber-500 rounded-xl p-4 shadow-xl space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                  <span className="text-sm font-black text-white bg-slate-950 px-2.5 py-0.5 rounded border border-slate-700 font-mono">
                    {session.press_number}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-mono font-black text-amber-400">
                      {formatTime(elapsedTimes[session.id] || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <p>
                    <span className="text-slate-500 font-bold uppercase text-[9px]">
                      Technician:
                    </span>{" "}
                    {session.technician_name}
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold uppercase text-[9px]">
                      Start Time:
                    </span>{" "}
                    {new Date(session.start_time).toLocaleTimeString("ro-RO")}
                  </p>
                  {session.mold_number && (
                    <p className="col-span-2">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">
                        Equipment/Tool:
                      </span>{" "}
                      <span className="text-amber-400 font-mono font-semibold">
                        {session.mold_number}
                      </span>
                    </p>
                  )}
                </div>

                <Link
                  href={`/maintenance-reports?id=${session.id}`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 rounded-lg uppercase tracking-wider transition-all block text-center shadow-md"
                >
                  📋 Complete Breakdown
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* SECȚIUNEA: FORMULAR OPERATIV PENTRU ÎNREGISTRARE (START) */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1">
          ➕ Pornire Intervenție Nouă (START)
        </h2>

        <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Selectează Presă / Utilaj:
            </label>
            <select
              disabled={loading}
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="">-- Alege Presa --</option>
              {toolOptions.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.tool_number}
                </option>
              ))}
            </select>
          </div>

          {/* REPARAT: AFIȘEAZĂ MESAJUL DE BLOCARE DACĂ UTILAJUL ARE DEJA AVARIE ACTIVĂ */}
          {isMachineBlocked && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold p-3 rounded-lg animate-fadeIn">
              ⚠️ There is already an active breakdown on this machine.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Selectează Tehnician:
            </label>
            <select
              disabled={loading}
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Alege Tehnicianul --</option>
              {technicianOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Descriere Problemă Piesă:
            </label>
            <textarea
              disabled={loading || isMachineBlocked}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Ex: Defect de debavurare / îndoire excesivă tablă"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Foto Problemă (Before):
            </label>
            <input
              type="file"
              accept="image/*"
              disabled={loading || isMachineBlocked}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  setFileBefore(compressed);
                } else {
                  setFileBefore(null);
                }
              }}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            onClick={handleStartIntervention}
            disabled={loading || isMachineBlocked}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider transition-all text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? "Se încarcă..." : "🚀 Start Intervenție & Timp"}
          </button>
        </div>
      </div>

      {/* POP-UP: MODAL PLUTITOR PENTRU ÎNCHIDERE (STOP) */}
      {closingSession !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-700 pb-2">
              <h3 className="text-base font-black uppercase text-amber-500 tracking-wide">
                Finalizare Intervenție
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Utilaj blocat în flux:{" "}
                <span className="font-mono text-white font-bold">
                  {closingSession.press_number}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative text-left">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Piesă Schimb Utilizată (Opțional):
                </label>
                <input
                  type="text"
                  disabled={loading}
                  value={partInput}
                  onFocus={() => setShowPartDropdown(true)}
                  onChange={(e) => setPartInput(e.target.value)}
                  placeholder="Scrie codul ENDR sau numele piesei..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />

                {showPartDropdown && partOptions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-800">
                    {partOptions.map((part) => {
                      const partText = `[${part.endr_code || "FĂRĂ COD"}] ${part.specification || ""}`;
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

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Foto Remediere (After):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={loading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const compressed = await compressImage(file);
                      setFileAfter(compressed);
                    } else {
                      setFileAfter(null);
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setClosingSession(null);
                    setSelectedPart("");
                    setPartInput("");
                    setFileAfter(null);
                  }}
                  className="px-4 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleStopIntervention}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl uppercase tracking-wider text-xs shadow-md disabled:bg-slate-700"
                >
                  {loading ? "Se salvează..." : "🛑 Stop & Închide"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
