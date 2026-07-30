"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useRepairsData, Repair } from "@/lib/useRepairsData";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import RepairForm from "@/components/RepairForm";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RepairsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const { permissions } = useSidebarAuth();
  const isAdmin = permissions?.role === "admin";

  const { 
    repairs, dbTools, dbTechs, dbParts, isLoading, isSaving, 
    createRepair, updateRepairStatus, exportToExcel, deleteRepair 
  } = useRepairsData(t.alertFields, t.alertSuccess);

  // STĂRI MODAL CMMS
  const [closingRepairId, setClosingRepairId] = useState<number | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);

  // STĂRI PREVIEW IMAGINI
  const [previewImages, setPreviewImages] = useState<{ before: string | null; after: string | null } | null>(null);

    const handleCreateRepair = async (formData: any, files: any, resetForm: () => void) => {
    try {
      // 1. Salvăm tichetul în Supabase (notificarea push va pleca acum automat din interiorul acestei funcții)
      await createRepair(formData, files, resetForm);
      
      // 2. Reîmprospătăm datele pe ecran
      router.refresh(); 
    } catch (error) {
      console.error("Eroare la crearea tichetului:", error);
    }
  };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      if (newStatus === "Closed") {
        setClosingRepairId(id);
        setFileAfter(null);
        return;
      }
      
      // 1. Actualizăm în baza de date
      await updateRepairStatus(id, newStatus);
      
      // 2. Trimitem alerta push pe mobil
      fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔄 Status Matriță Modificat",
          body: `Tichetul #${id} a fost trecut în faza: "${newStatus}".`,
          url: "/repairs"
        })
      }).catch(err => console.error("Eroare trimitere push status:", err));

      router.refresh();
    } catch (error) {
      console.error("Eroare la actualizarea statusului:", error);
    }
  };


  // MODIFICAT: Funcție CMMS pentru convertirea URL-urilor Supabase în imagini PDF (Base64)
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Eroare conversie imagine pentru PDF:", err);
      return null;
    }
  };

  // MODIFICAT: Funcție extinsă de export PDF în limba engleză tehnică cu procesare foto live
  const exportToPDF = async (repair: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Antet Raport Premium (Bara Bleumarin - Slate 900)
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.text("TECHNICAL REPAIR REPORT", 15, 20); // Tradus
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text("ToolShop Pro OS - Maintenance Management System", 15, 30); // Tradus

      // Date Tehnice Stânga
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`Service Ticket: #${repair.id}`, 15, 55); // Tradus
      doc.setFont("Helvetica", "normal");
      doc.text(`Open Date: ${new Date(repair.created_at).toLocaleDateString("en-US")}`, 15, 63); // Format dată EN
      doc.text(`Tool / Mold Number: ${repair.tool_number}`, 15, 71); // Tradus
      doc.text(`Assigned Technician: ${repair.technician || "Unassigned"}`, 15, 79); // Tradus
      doc.text(`Priority Level: ${repair.priority}`, 15, 87); // Tradus
      doc.text(`Current Status: ${repair.status}`, 15, 95); // Tradus

      // Casetă text pentru Defecțiune
      doc.setFont("Helvetica", "bold");
      doc.text("Reported Failure / Issue:", 15, 108); // Tradus
      doc.setFont("Helvetica", "normal");
      doc.text(repair.failure || "-", 15, 115, { maxWidth: 180 });

      // Casetă text pentru Piese
      doc.setFont("Helvetica", "bold");
      doc.text("Spare Parts Utilized:", 15, 135); // Tradus
      doc.setFont("Helvetica", "normal");
      doc.text(repair.replaced_part ? `Code: ${repair.replaced_part} (x${repair.part_quantity || 1} pcs)` : "No spare parts were used for this repair.", 15, 142); // Tradus

           // --- SECTIUNEA FOTO ---
      doc.setFont("Helvetica", "bold");
      doc.text("Visual Inspection (Photographic Evidence):", 15, 160);
      
      // ADAUGAT: Titluri mici pentru fiecare poză (Before / After)
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // Culoare Slate 700 pentru titlurile pozelor
      doc.text("Before (Faulty)", 15, 166);
      doc.text("After (Repaired)", 110, 166);

      // Resetăm fontul la dimensiune mică și culoare gri pentru textul de eroare "No photo available"
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);

      // Încărcăm asincron poza Before (Mutată cu 5mm mai jos pentru a nu se suprapune cu titlul)
      if (repair.image_before_url) {
        const base64Before = await getBase64ImageFromUrl(repair.image_before_url);
        if (base64Before) {
          doc.addImage(base64Before, "JPEG", 15, 171, 85, 65);
          doc.setDrawColor(203, 213, 225);
          doc.rect(15, 171, 85, 65, "S");
        }
      } else {
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 171, 85, 65, "S");
        doc.text("No 'Before' photo available", 38, 203);
      }

      // Încărcăm asincron poza After (Mutată cu 5mm mai jos pentru a nu se suprapune cu titlul)
      if (repair.image_after_url) {
        const base64After = await getBase64ImageFromUrl(repair.image_after_url);
        if (base64After) {
          doc.addImage(base64After, "JPEG", 110, 171, 85, 65);
          doc.setDrawColor(203, 213, 225);
          doc.rect(110, 171, 85, 65, "S");
        }
      } else {
        doc.setDrawColor(226, 232, 240);
        doc.rect(110, 171, 85, 65, "S");
        doc.text("No 'After' photo available", 133, 203);
      }


      // Subsol document
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 270, 195, 270);
      doc.setFontSize(8);
      doc.text("Automatically generated by ToolShop Pro OS ERP System", 15, 275); // Tradus

      doc.save(`Technical_Report_#${repair.id}.pdf`);
    } catch (err) {
      console.error("Eroare generare PDF:", err);
    }
  };


  const handleCloseRepairWithPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingRepairId || !fileAfter) {
      alert("Te rugăm să faci poza finală 'After' pentru a demonstra reparația!");
      return;
    }
    try {
      setIsUploadingAfter(true);
      const fileExt = fileAfter.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `repairs_after/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("improvement-images").upload(filePath, fileAfter);
      if (uploadError) throw uploadError;

      const imgAfterUrl = supabase.storage.from("improvement-images").getPublicUrl(filePath).data.publicUrl;

      await supabase.from("repairs").update({ status: "Closed", image_after_url: imgAfterUrl }).eq("id", closingRepairId);

      setClosingRepairId(null);
      setFileAfter(null);
      window.location.reload(); 
    } catch (error: any) {
      alert("Eroare la salvare: " + error.message);
    } finally {
      setIsUploadingAfter(false);
    }
  };

  const handleDeleteRepair = async (id: number) => {
    try { await deleteRepair(id); router.refresh(); } catch (error) { console.error(error); }
  };

  const columns = [
    { id: "New", title: t.statusNew, color: "border-t-blue-500 bg-blue-50/20" },
    { id: "In Progress", title: t.statusProgress, color: "border-t-amber-500 bg-amber-50/20" },
    { id: "Testing", title: t.statusTesting, color: "border-t-indigo-500 bg-indigo-50/20" },
    { id: "Closed", title: t.statusClosed, color: "border-t-emerald-500 bg-emerald-50/20" },
  ];

  const getRepairsByStatus = (statusName: string) => {
    return repairs.filter((r) => r.status?.toLowerCase() === statusName.toLowerCase());
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">Loading ToolShop Pro OS...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.repTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">{t.repSub}</p>
      </div>

      <RepairForm t={t} isSaving={isSaving} dbTools={dbTools} dbTechs={dbTechs} dbParts={dbParts} onSubmit={handleCreateRepair} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => {
          const columnRepairs = getRepairsByStatus(col.id);
          return (
            <div key={col.id} className={`p-4 bg-white border border-slate-200/80 border-t-4 ${col.color} rounded-2xl shadow-sm space-y-4`}>
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-slate-800">{col.title}</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{columnRepairs.length}</span>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {columnRepairs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">{t.noRepairs}</p>
                ) : (
                  columnRepairs.map((repair: any) => (
                    <div key={repair.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded-md">№ {repair.tool_number}</span>
                        
                        <div className="flex gap-1 items-center">
                          {(repair.image_before_url || repair.image_after_url) && (
                            <button
                              type="button"
                              onClick={() => setPreviewImages({ before: repair.image_before_url, after: repair.image_after_url })}
                              className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md text-[10px] font-bold transition-all"
                              title="Vezi pozele tehnice (Before/After)"
                            >
                              🖼️ Foto
                            </button>
                          )}
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${repair.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-slate-200 text-slate-600"}`}>
                            {repair.priority === "High" ? t.priorityHigh : repair.priority === "Low" ? t.priorityLow : t.priorityMedium}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 font-medium line-clamp-2">{repair.failure}</p>

                      <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                        <p>🧑‍🔧 {repair.technician || "Nalocat"}</p>
                        {repair.replaced_part && <p>📦 {repair.replaced_part} (x{repair.part_quantity || 1})</p>}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-2">
                        <div className="flex gap-1 w-full justify-between items-center">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => exportToExcel(repair.id)} className="px-1.5 py-0.5 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 rounded text-[11px] font-bold transition-all">
                               Excel
                            </button>
                            <button type="button" onClick={() => exportToPDF(repair)} className="px-1.5 py-0.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded text-[11px] font-bold transition-all">
                               PDF
                            </button>
                          </div>

                          {isAdmin && (
                            <button type="button" onClick={() => handleDeleteRepair(repair.id)} className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-600 text-rose-600 hover:text-white rounded text-[11px] font-bold transition-all">
                              🗑️
                            </button>
                          )}
                        </div>
                        
                        <div className="flex justify-end gap-1">
                          {col.id === "New" && <button type="button" onClick={() => handleUpdateStatus(repair.id, "In Progress")} className="w-full py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">➔ In Progress</button>}
                          {col.id === "In Progress" && <button type="button" onClick={() => handleUpdateStatus(repair.id, "Testing")} className="w-full py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">➔ Testing</button>}
                          {col.id === "Testing" && <button type="button" onClick={() => handleUpdateStatus(repair.id, "Closed")} className="w-full py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">✓ Închide Lucrare</button>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* POP-UP CMMS PENTRU CAPTURĂ FOTO AFTER */}
      {closingRepairId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Finalizare Raport Service</h3>
              <p className="text-xs text-slate-500 mt-1">Te rugăm să atașezi fotografia finală cu matrița reparată.</p>
            </div>
            <form onSubmit={handleCloseRepairWithPhoto} className="space-y-4">
              <label className="flex flex-col text-xs text-slate-600 font-bold bg-slate-50 border border-slate-200/80 p-4 rounded-xl cursor-pointer hover:bg-slate-100">
                <span>Fă poza 'After' (Reparat)</span>
                <input type="file" accept="image/*" capture="environment" required onChange={(e) => setFileAfter(e.target.files?.[0] || null)} className="mt-2 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700 font-medium" />
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={isUploadingAfter} onClick={() => setClosingRepairId(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">Anulează</button>
                <button type="submit" disabled={isUploadingAfter} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:bg-slate-400">
                  {isUploadingAfter ? "Se salvează..." : "Închide Tichet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP: MODAL PREVIEW IMAGINI (Vizualizare live în aplicație) */}
      {previewImages !== null && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setPreviewImages(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inspecție Vizuală Tichet</h3>
              <button type="button" onClick={() => setPreviewImages(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕ Închide</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 text-center uppercase">Foto Înainte (Defect)</p>
                <div className="bg-slate-50 border rounded-xl h-64 flex items-center justify-center overflow-hidden">
                  {previewImages.before ? (
                    <img src={previewImages.before} alt="Defect" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nu s-a încărcat poză</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 text-center uppercase">Foto După (Reparat)</p>
                <div className="bg-slate-50 border rounded-xl h-64 flex items-center justify-center overflow-hidden">
                  {previewImages.after ? (
                    <img src={previewImages.after} alt="Reparat" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Lucrare în curs (Lipsă foto)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
