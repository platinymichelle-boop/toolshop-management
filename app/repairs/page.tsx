"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Repair {
  id: number;
  created_at: string;
  tool_number: string | null;
  failure: string | null;
  technician: string | null;
  priority: string | null;
  status: string | null;
  repair_number?: string | null;
  hours_worked?: number | null;
  image_before_url?: string | null;
  image_after_url?: string | null;
  replaced_part?: string | null;
}

interface DBTool { id: number; tool_number: string | null; }
interface DBTech { id: number; name: string | null; active: boolean | null; }
interface DBPart { id: number; endr_code: string | null; specification: string | null; }

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [toolNumber, setToolNumber] = useState("");
  const [failure, setFailure] = useState("");
  const [technician, setTechnician] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [replacedPart, setReplacedPart] = useState("");

  const [dbTools, setDbTools] = useState<DBTool[]>([]);
  const [dbTechs, setDbTechs] = useState<DBTech[]>([]);
  const [dbParts, setDbParts] = useState<DBPart[]>([]);
  
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadAllData() {
    try {
      setIsLoading(true);
      const [repairsRes, toolsRes, techsRes, partsRes] = await Promise.all([
        supabase.from("repairs").select("*").order("id", { ascending: false }),
        supabase.from("tools").select("id, tool_number").order("tool_number", { ascending: true }),
        supabase.from("technicians").select("id, name, active").eq("active", true).order("name", { ascending: true }),
        supabase.from("spare_parts").select("id, endr_code, specification").order("endr_code", { ascending: true })
      ]);

      if (repairsRes.data) setRepairs(repairsRes.data);
      if (toolsRes.data) setDbTools(toolsRes.data);
      if (techsRes.data) setDbTechs(techsRes.data);
      if (partsRes.data) setDbParts(partsRes.data);
    } catch (error: any) {
      console.error("Eroare la încărcarea datelor:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  function getRepairsByStatus(statusName: string) {
    return repairs.filter(
      (r) => r.status?.toLowerCase() === statusName.toLowerCase()
    );
  }

  async function uploadPhoto(file: File, folder: "repairs_before" | "repairs_after"): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("improvement-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("improvement-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.error("Eroare upload foto service:", err.message);
      return null;
    }
  }
  async function createRepair() {
    if (!toolNumber || !failure) {
      alert("Te rog să selectezi scula și să introduci defectul constatat.");
      return;
    }

    try {
      setIsSaving(true);
      let imgBeforeUrl = null;
      let imgAfterUrl = null;

      if (fileBefore) imgBeforeUrl = await uploadPhoto(fileBefore, "repairs_before");
      if (fileAfter) imgAfterUrl = await uploadPhoto(fileAfter, "repairs_after");

      const { error } = await supabase
        .from("repairs")
        .insert({
          tool_number: toolNumber,
          failure: failure.trim(),
          technician: technician || null,
          priority: priority,
          status: "New",
          image_before_url: imgBeforeUrl,
          image_after_url: imgAfterUrl,
          replaced_part: replacedPart || null
        });

      if (error) throw error;

      alert("Fișa de reparație a fost deschisă!");
      setToolNumber("");
      setFailure("");
      setTechnician("");
      setPriority("Medium");
      setReplacedPart("");
      setFileBefore(null);
      setFileAfter(null);
      
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input: any) => { input.value = ""; });

      loadAllData();
    } catch (error: any) {
      alert("Eroare la salvare: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRepairStatus(id: number, nextStatus: string) {
    try {
      const { error } = await supabase
        .from("repairs")
        .update({ status: nextStatus })
        .eq("id", id);

      if (error) throw error;
      loadAllData();
    } catch (error: any) {
      alert("Nu s-a putut schimba stadiul: " + error.message);
    }
  }

  function getBase64FromUrl(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
          return;
        }
        resolve(null);
      };
      img.onerror = () => { resolve(null); };
      img.src = url;
    });
  }

  async function exportRepairDocument(repairId: number, type: "pdf" | "pptx" | "excel") {
    const repair = repairs.find(r => r.id === repairId);
    if (!repair) {
      alert("Fisa de service nu a fost găsită.");
      return;
    }

    const cleanTitle = (repair.tool_number || `Scula_#${repair.id}`).replace(/\s+/g, '_');
    const fileName = `Service_Report_#${repair.id}_${cleanTitle}`;

    if (type === "excel") {
      const { utils, writeFile } = await import("xlsx");
      const dataRows = [
        ["RAPORT TEHNIC DE REPARAȚIE - TOOLSHOP PRO"],
        [],
        ["ID Tichet:", repair.id],
        ["Dată Deschidere:", new Date(repair.created_at).toLocaleDateString("ro-RO")],
        ["Număr Sculă (Tool №):", repair.tool_number],
        ["Defecțiune Constatată:", repair.failure],
        ["Tehnician Responsabil:", repair.technician || "Nalocat"],
        ["Piesă înlocuită:", repair.replaced_part || "-"],
        ["Prioritate:", repair.priority],
        ["Stadiu Curent:", repair.status],
        [],
        ["Link Imagine Defect (Before):", repair.image_before_url || "-"],
        ["Link Imagine Reparat (After):", repair.image_after_url || "-"]
      ];
      const worksheet = utils.aoa_to_sheet(dataRows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Fisă Service");
      writeFile(workbook, `${fileName}.xlsx`);
    }

    if (type === "pdf") {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const cleanText = (text: string) => text
        .replace(/ș/g, 's').replace(/ț/g, 't').replace(/ă/g, 'a').replace(/î/g, 'i').replace(/â/g, 'a')
        .replace(/Ș/g, 'S').replace(/Ț/g, 'T').replace(/Ă/g, 'A').replace(/Î/g, 'I').replace(/Â/g, 'A');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("TOOLSHOP PRO - FISA TEHNICA REPARATIE", 15, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(cleanText(`ID Tichet: #${repair.id} | Data: ${new Date(repair.created_at).toLocaleDateString("ro-RO")}`), 15, 28);
      doc.text(cleanText(`Tehnician: ${repair.technician || "Nalocat"} | Status: ${repair.status}`), 15, 34);
      doc.line(15, 38, 195, 38);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(cleanText(`Echipament: ${repair.tool_number}`), 15, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(cleanText(`Defect semnalat: ${repair.failure}`), 15, 58);
      if (repair.replaced_part) doc.text(cleanText(`Piesa înlocuită: ${repair.replaced_part}`), 15, 66);

      let currentY = 90;
      if (repair.image_before_url) {
        const base64Img = await getBase64FromUrl(repair.image_before_url);
        if (base64Img) {
          doc.text("STARE INITIALA (DEFECT):", 15, currentY - 5);
          doc.addImage(base64Img, "PNG", 15, currentY, 80, 60);
        }
      }
      if (repair.image_after_url) {
        const base64Img = await getBase64FromUrl(repair.image_after_url);
        if (base64Img) {
          doc.text("STARE FINALA (REPARAT):", 110, currentY - 5);
          doc.addImage(base64Img, "PNG", 110, currentY, 80, 60);
        }
      }
      doc.save(`${fileName}.pdf`);
    }

    if (type === "pptx") {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      const slide = pptx.addSlide();
      slide.background = { color: "F8FAFC" };

      slide.addText("TOOLSHOP SERVICE REPORT", { x: 0.5, y: 0.3, w: 10, h: 0.4, fontSize: 13, bold: true, color: "4F46E5" });
      slide.addText(`Echipament: ${repair.tool_number}`, { x: 0.5, y: 0.7, w: 12.3, h: 0.5, fontSize: 22, bold: true, color: "0F172A" });
      slide.addText(`Tehnician: ${repair.technician || "Nalocat"}   |   Status: ${repair.status}   |   Piesă: ${repair.replaced_part || "-"}`, { x: 0.5, y: 1.3, w: 12.3, h: 0.3, fontSize: 10, italic: true, color: "64748B" });
      
      slide.addText("Defectiune înregistrata:", { x: 0.5, y: 1.7, w: 12.3, h: 0.3, fontSize: 11, bold: true, color: "334155" });
      slide.addText(repair.failure || "Nespecificat", { x: 0.5, y: 2.0, w: 12.3, h: 0.8, fontSize: 11, color: "475569", valign: "top" });

      if (repair.image_before_url) {
        const base64Img = await getBase64FromUrl(repair.image_before_url);
        if (base64Img) {
          slide.addImage({ data: base64Img, x: 3.3, y: 3.1, w: 2.8, h: 2.1 });
          slide.addText("LA INTRARE (DEFECT)", { x: 3.3, y: 5.3, w: 2.8, h: 0.3, fontSize: 10, bold: true, color: "EF4444", align: "center" });
        }
      }
      if (repair.image_after_url) {
        const base64Img = await getBase64FromUrl(repair.image_after_url);
        if (base64Img) {
          slide.addImage({ data: base64Img, x: 7.2, y: 3.1, w: 2.8, h: 2.1 });
          slide.addText("LA IESIRE (REPARAT)", { x: 7.2, y: 5.3, w: 2.8, h: 0.3, fontSize: 10, bold: true, color: "10B981", align: "center" });
        }
      }
      slide.addText(`ID Tichet: #${repair.id}   •   Generat automat prin ToolShop Pro`, { x: 0.5, y: 6.8, w: 10, h: 0.2, fontSize: 8, color: "94A3B8" });
      await pptx.writeFile({ fileName: `${fileName}.pptx` });
    }
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestionare Reparații</h1>
        <p className="text-gray-500 mt-1">Înregistrează defecțiuni, selectează repere din stoc și urmărește fluxul Kanban.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>⚙️</span> Deschide o fișă tehnică nouă
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Tool Number / Matriță</label>
            <select
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 bg-white text-slate-900"
              value={toolNumber}
              onChange={(e) => setToolNumber(e.target.value)}
            >
              <option value="">Alege o matriță ({dbTools.length} în sistem)</option>
              {dbTools.map((t) => (
                <option key={t.id} value={t.tool_number || ""}>{t.tool_number}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Defecțiune Semnalată</label>
            <input
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 text-slate-900"
              placeholder="Ex: Probleme alimentare"
              value={failure}
              onChange={(e) => setFailure(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Tehnician Alocat</label>
            <select
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 bg-white text-slate-900"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
            >
              <option value="">Nalocat / Alege tehnician</option>
              {dbTechs.map((tech) => (
                <option key={tech.id} value={tech.name || ""}>{tech.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Prioritate</label>
            <select
              className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 bg-white text-slate-900"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>
        </div>

        {/* Panou Componentă înlocuită din stoc */}
        <div className="mt-4 pt-4 border-t border-gray-50">
          <div className="flex flex-col gap-1 max-w-md">
            <label className="text-xs font-bold text-indigo-600">📦 Piesă de Schimb Utilizată</label>
            <select
              className="border border-indigo-200 rounded-lg p-2.5 text-sm focus:outline-indigo-500 bg-white text-slate-900"
              value={replacedPart}
              onChange={(e) => setReplacedPart(e.target.value)}
            >
              <option value="">Nicio piesă înlocuită / Selectează componentă</option>
              {dbParts.slice(0, 300).map((part) => (
                <option key={part.id} value={part.endr_code || ""}>
                  {part.endr_code} - {part.specification ? part.specification.slice(0, 45) : "Fără descriere"}...
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50 mt-4">
          <div className="p-3 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
            <label className="text-xs font-bold text-slate-700 block mb-1">📸 Foto intrare (Defect)</label>
            <input 
              type="file" accept="image/*" 
              className="text-xs w-full text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              onChange={(e) => e.target.files && setFileBefore(e.target.files[0])}
            />
          </div>
          <div className="p-3 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
            <label className="text-xs font-bold text-slate-700 block mb-1">✨ Foto ieșire (Reparat)</label>
            <input 
              type="file" accept="image/*" 
              className="text-xs w-full text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              onChange={(e) => e.target.files && setFileAfter(e.target.files[0])}
            />
          </div>
        </div>

        <button
          onClick={createRepair}
          disabled={isSaving}
          className="mt-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          {isSaving ? "Se deschide fișa..." : "Creează Fișă Service"}
        </button>
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Fluxuri de lucru active</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[400px]">
          
          {(["New", "In Repair", "Waiting Parts", "Testing", "Closed"] as const).map((colName) => {
            const currentRepairs = getRepairsByStatus(colName);
            const titleColors = {
              "New": "text-red-600 bg-red-50",
              "In Repair": "text-orange-500 bg-orange-50",
              "Waiting Parts": "text-yellow-600 bg-yellow-50",
              "Testing": "text-blue-500 bg-blue-50",
              "Closed": "text-green-600 bg-green-50"
            }[colName];

            return (
              <div key={colName} className="bg-slate-50 border border-gray-200 rounded-xl p-3 flex flex-col space-y-3">
                <div className={`flex justify-between items-center p-2 rounded-lg font-bold text-xs tracking-wider border ${titleColors}`}>
                  <span>{colName.toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white shadow-sm">{currentRepairs.length}</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                  {currentRepairs.map((repair) => (
                    <div key={repair.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-blue-600">#{repair.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${repair.priority === "High" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {repair.priority}
                        </span>
                      </div>
                      
                      <div className="font-semibold text-slate-900">{repair.tool_number}</div>
                      <div className="text-gray-500 font-medium italic">"{repair.failure}"</div>
                      {repair.replaced_part && (
                        <div className="text-[10px] text-indigo-600 font-semibold">📦 Reper: {repair.replaced_part}</div>
                      )}
                      <div className="text-gray-400 text-[10px]">Tehnician: {repair.technician || "Nalocat"}</div>

                      {(repair.image_before_url || repair.image_after_url) && (
                        <div className="grid grid-cols-2 gap-1 pt-1">
                          <div className="h-10 bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                            {repair.image_before_url ? <img src={repair.image_before_url} className="object-cover w-full h-full" alt="B" /> : <span className="text-[8px] text-gray-400">Fără foto</span>}
                          </div>
                          <div className="h-10 bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                            {repair.image_after_url ? <img src={repair.image_after_url} className="object-cover w-full h-full" alt="A" /> : <span className="text-[8px] text-gray-400">Fără foto</span>}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-50 flex gap-1 justify-between">
                        {colName !== "New" && (
                          <button 
                            onClick={() => {
                              const steps: ("New" | "In Repair" | "Waiting Parts" | "Testing" | "Closed")[] = ["New", "In Repair", "Waiting Parts", "Testing", "Closed"];
                              const prevIdx = steps.indexOf(colName) - 1;
                              updateRepairStatus(repair.id, steps[prevIdx]);
                            }}
                            className="text-[9px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded hover:bg-gray-200"
                          >
                            ◀
                          </button>
                        )}
                        
                        <div className="flex gap-1 justify-center flex-1">
                          <button onClick={() => exportRepairDocument(repair.id, "pdf")} className="text-[9px] bg-rose-50 text-rose-700 px-1 rounded font-bold">PDF</button>
                          <button onClick={() => exportRepairDocument(repair.id, "excel")} className="text-[9px] bg-emerald-50 text-emerald-700 px-1 rounded font-bold">XLS</button>
                          <button onClick={() => exportRepairDocument(repair.id, "pptx")} className="text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">PPT</button>
                        </div>

                        {colName !== "Closed" && (
                          <button 
                            onClick={() => {
                              const steps: ("New" | "In Repair" | "Waiting Parts" | "Testing" | "Closed")[] = ["New", "In Repair", "Waiting Parts", "Testing", "Closed"];
                              const nextIdx = steps.indexOf(colName) + 1;
                              updateRepairStatus(repair.id, steps[nextIdx]);
                            }}
                            className="text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded hover:bg-blue-100"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {currentRepairs.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-6 italic">Nicio fișă activă</p>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
