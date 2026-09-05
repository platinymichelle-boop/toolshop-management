"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Improvement {
  id: number;
  created_at: string;
  title: string;
  description: string;
  department: string;
  status: string;
  image_before_url: string | null;
  image_after_url: string | null;
  system: string;
  estimated_saving: number;
}

export default function ImprovementsPage() {
  const [ideas, setIdeas] = useState<Improvement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("Atelier");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("Proposed");
  const [system, setSystem] = useState("Mechanical");
  const [estimatedSaving, setEstimatedSaving] = useState<number>(0);

  // State-uri pentru fișierele atașate
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadImprovements() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("improvements")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      if (data) setIdeas(data);
    } catch (error: any) {
      console.error("Eroare la încărcare:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadImprovements();

    const interval = setInterval(() => {
      loadImprovements();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Funcție helper pentru upload fișiere în bucket-ul 'improvement_images'
  async function uploadPhoto(
    file: File,
    folder: "before" | "after",
  ): Promise<string | null> {
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
      console.error("Eroare upload imagine:", err.message);
      return null;
    }
  }

  // Înregistrarea unei idei Kaizen noi cu poze opționale
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSaving(true);
      let imgBeforeUrl = null;
      let imgAfterUrl = null;

      if (fileBefore) imgBeforeUrl = await uploadPhoto(fileBefore, "before");
      if (fileAfter) imgAfterUrl = await uploadPhoto(fileAfter, "after");

      const { error } = await supabase.from("improvements").insert({
        title: title.trim(),
        description: description.trim(),
        department: department,
        status: "Proposed",
        image_before_url: imgBeforeUrl,
        image_after_url: imgAfterUrl,
        estimated_saving: estimatedSaving,
      });

      if (error) throw error;

      setTitle("");
      setDescription("");
      setFileBefore(null);
      setFileAfter(null);
      alert("Propunerea Kaizen cu suport vizual a fost înregistrată!");
      loadImprovements();
    } catch (error: any) {
      alert("Eroare la salvare: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Actualizarea rapidă a statusului (Procesul de Audit / Editare)
  async function handleUpdateStatus(id: number) {
    try {
      const { error } = await supabase
        .from("improvements")
        .update({ status: editStatus })
        .eq("id", id);

      if (error) throw error;
      setEditingId(null);
      alert("Statusul ideii a fost actualizat!");
      loadImprovements();
    } catch (error: any) {
      alert("Eroare la actualizare: " + error.message);
    }
  }

  // Liniile 133 - Sfârșit funcție: Codul curat și imun la blocajele CORS
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
      img.onerror = () => {
        console.error("Eroare la încărcarea imaginii pentru Canvas:", url);
        resolve(null);
      };
      img.src = url;
    });
  }

  async function exportDocument(
    ideaId: number,
    type: "pdf" | "pptx" | "excel",
  ) {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) {
      alert("Proiectul nu a fost găsit.");
      return;
    }

    const cleanTitle = idea.title
      .replace(/ș/g, "s")
      .replace(/ț/g, "t")
      .replace(/ă/g, "a")
      .replace(/î/g, "i")
      .replace(/â/g, "a")
      .replace(/Ș/g, "S")
      .replace(/Ț/g, "T")
      .replace(/Ă/g, "A")
      .replace(/Î/g, "I")
      .replace(/Â/g, "A")
      .replace(/\s+/g, "_");

    const fileName = `Kaizen_Report_#${idea.id}_${cleanTitle}`;

    if (type === "excel") {
      const { utils, writeFile } = await import("xlsx");
      const dataRows = [
        ["FIȘĂ DE ÎMBUNĂTĂȚIRE OPERAȚIONALĂ (KAIZEN)"],
        [],
        ["ID Proiect:", idea.id],
        [
          "Dată Înregistrare:",
          new Date(idea.created_at).toLocaleDateString("ro-RO"),
        ],
        ["Departament / Arie:", idea.department],
        ["Titlu Proiect:", idea.title],
        ["Status Implementare:", idea.status],
        [],
        ["DESCRIERE ȘI IMPACT ANCHETĂ:"],
        [idea.description],
        [],
        [
          "Link Foto Înainte (Before):",
          idea.image_before_url || "Fără documentație foto",
        ],
        [
          "Link Foto După (After):",
          idea.image_after_url || "În așteptare implementare",
        ],
      ];
      const worksheet = utils.aoa_to_sheet(dataRows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Raport Kaizen");
      writeFile(workbook, `${fileName}.xlsx`);
    }

    if (type === "pdf") {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const cleanPdfText = (text: string) =>
        text
          .replace(/ș/g, "s")
          .replace(/ț/g, "t")
          .replace(/ă/g, "a")
          .replace(/î/g, "i")
          .replace(/â/g, "a")
          .replace(/Ș/g, "S")
          .replace(/Ț/g, "T")
          .replace(/Ă/g, "A")
          .replace(/Î/g, "I")
          .replace(/Â/g, "A");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("TOOLSHOP PRO - RAPORT KAIZEN", 15, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        cleanPdfText(
          `ID Fisa: #${idea.id} | Data: ${new Date(idea.created_at).toLocaleDateString("ro-RO")}`,
        ),
        15,
        28,
      );
      doc.text(
        cleanPdfText(
          `Departament: ${idea.department} | Status: ${idea.status}`,
        ),
        15,
        34,
      );
      doc.line(15, 38, 195, 38);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(cleanPdfText(idea.title), 15, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const splitDescription = doc.splitTextToSize(
        cleanPdfText(idea.description),
        180,
      );
      doc.text(splitDescription, 15, 58);

      let currentY = 100;
      if (idea.image_before_url) {
        const base64Img = await getBase64FromUrl(idea.image_before_url);
        if (base64Img) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("FOTO INAINTE (BEFORE):", 15, currentY - 5);
          doc.addImage(base64Img, "PNG", 15, currentY, 80, 60);
        }
      }
      if (idea.image_after_url) {
        const base64Img = await getBase64FromUrl(idea.image_after_url);
        if (base64Img) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("FOTO DUPA (AFTER):", 110, currentY - 5);
          doc.addImage(base64Img, "PNG", 110, currentY, 80, 60);
        }
      }
      doc.save(`${fileName}.pdf`);
    }

    // --- 3. GENERARE EXPORT PREZENTARE PPTX FORMAT KAIZEN A3 (COMPACTAT PE UN SINGUR SLIDE) ---
    if (type === "pptx") {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();

      pptx.layout = "LAYOUT_16x9";
      const slide = pptx.addSlide();
      slide.background = { color: "F8FAFC" };

      // 1. Antet Prezentare (Stânga sus)
      slide.addText("TOOLSHOP PRO - KAIZEN REPORT", {
        x: 0.5,
        y: 0.3,
        w: 10,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: "4F46E5",
      });
      slide.addText(idea.title, {
        x: 0.5,
        y: 0.7,
        w: 12.3,
        h: 0.5,
        fontSize: 22,
        bold: true,
        color: "0F172A",
      });
      slide.addText(
        `Departament: ${idea.department}   |   Status Curent: ${idea.status}`,
        {
          x: 0.5,
          y: 1.3,
          w: 12.3,
          h: 0.3,
          fontSize: 10,
          italic: true,
          color: "64748B",
        },
      );

      // 2. Zonă text centrală (Descriere)
      slide.addText("Descriere & Impact Schimbare:", {
        x: 0.5,
        y: 1.7,
        w: 12.3,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: "334155",
      });
      slide.addText(idea.description, {
        x: 0.5,
        y: 2.0,
        w: 12.3,
        h: 0.8,
        fontSize: 11,
        color: "475569",
        valign: "top",
      });

      // 3. SECȚIUNE VIZUALĂ COMPACTĂ (Ridicată mai sus și micșorată pentru a nu depăși cadrul)
      // Coordonata Y modificată la 3.1 pentru a lăsa spațiu generos jos. Dimensiune compactă: 2.8 x 2.1

      // Foto 1: BEFORE (Poziționată simetric în stânga-centru la x: 3.3)
      if (idea.image_before_url) {
        const base64Img = await getBase64FromUrl(idea.image_before_url);
        if (base64Img) {
          slide.addImage({ data: base64Img, x: 3.3, y: 3.1, w: 2.8, h: 2.1 });
          slide.addText("ÎNAINTE (BEFORE)", {
            x: 3.3,
            y: 5.3,
            w: 2.8,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: "EF4444",
            align: "center",
          });
        }
      }

      // Foto 2: AFTER (Poziționată simetric în dreapta-centru la x: 7.2)
      if (idea.image_after_url) {
        const base64Img = await getBase64FromUrl(idea.image_after_url);
        if (base64Img) {
          slide.addImage({ data: base64Img, x: 7.2, y: 3.1, w: 2.8, h: 2.1 });
          slide.addText("DUPĂ (AFTER)", {
            x: 7.2,
            y: 5.3,
            w: 2.8,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: "10B981",
            align: "center",
          });
        }
      }

      // 4. Notă de subsol (Footer repoziționat în siguranță la y: 6.8)
      slide.addText(
        `ID Raport: #${idea.id}   •   Generat la data: ${new Date().toLocaleDateString("ro-RO")}`,
        { x: 0.5, y: 6.8, w: 10, h: 0.2, fontSize: 8, color: "94A3B8" },
      );

      await pptx.writeFile({ fileName: `${fileName}.pptx` });
    }
  }

  return (
    <div className="space-y-8">
      {/* Antet Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Kaizen & Shopfloor Improvements
          </h1>
          <p className="text-gray-500 mt-1">
            Centru avansat pentru optimizarea fluxului, management vizual 5S și
            eliminarea pierderilor (Muda).
          </p>
        </div>
      </div>

      {/* Formular de adăugare */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Formular */}
        <div className="xl:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>💡</span> Lansează o fișă de îmbunătățire continuă
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  Titlu Propunere / Obiectiv
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Identificare vizuală conectori test"
                  className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 text-slate-900"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  Arie / Departament
                </label>
                <select
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2.5 text-sm bg-white text-slate-900"
                >
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Hydraulic">Hydraulic</option>
                  <option value="Pneumatic">Pneumatic</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">
                Descrierea Situației actuale și Soluția propusă
              </label>
              <textarea
                required
                rows={3}
                placeholder="Care era problema? Ce s-a modificat pentru a crește productivitatea sau siguranța?"
                className="border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-blue-500 w-full text-slate-900"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">
                Cost Reduction Estimat (€ / an)
              </label>

              <input
                type="number"
                min="0"
                placeholder="Ex: 1500"
                className="border border-gray-200 rounded-lg p-2.5 text-sm text-slate-900"
                value={estimatedSaving}
                onChange={(e) => setEstimatedSaving(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  📸 Foto SITUAȚIE INIȚIALĂ (Before)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs w-full text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  onChange={(e) =>
                    e.target.files && setFileBefore(e.target.files[0])
                  }
                />
              </div>

              <div className="p-3 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ✨ Foto DUPĂ ÎMBUNĂTĂȚIRE (After)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs w-full text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  onChange={(e) =>
                    e.target.files && setFileAfter(e.target.files[0])
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
              {isSaving ? "Se salvează fișa..." : "Înregistrează Idee Kaizen"}
            </button>
          </form>
        </div>

        {/* KPI PANEL */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            💰 Cost Reduction
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border">
              <div className="text-xs text-gray-500">Total Improvements</div>
              <div className="text-3xl font-black text-slate-800">
                {ideas.length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <div className="text-xs text-green-700">Implemented</div>
              <div className="text-3xl font-black text-green-700">
                {ideas.filter((i) => i.status === "Implemented").length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-xs text-amber-700">Completion Rate</div>
              <div className="text-3xl font-black text-amber-700">
                {ideas.length > 0
                  ? Math.round(
                      (ideas.filter((i) => i.status === "Implemented").length /
                        ideas.length) *
                        100,
                    )
                  : 0}
                %
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="text-xs text-indigo-700">
                Estimated Cost Reduction
              </div>
              <div className="text-3xl font-black text-indigo-700">
                €
                {ideas
                  .filter((i) => i.status === "Implemented")
                  .reduce((sum, i) => sum + (i.estimated_saving || 0), 0)
                  .toLocaleString()}
              </div>
            </div>

            <div className="text-xs text-gray-400 border-t pt-3">
              Assumption:
              <br />
              500 € saving / implemented improvement
            </div>
          </div>
        </div>
      </div>
      {/* Registrul de Fișe Raportate */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-slate-800">
          Panou Urmărire Proiecte Active
        </h2>

        {isLoading ? (
          <p className="text-sm text-gray-400">
            Se încarcă registrul digital de inovații...
          </p>
        ) : ideas.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow"
              >
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4 border-gray-100">
                  <div>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {idea.department}
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg mt-1">
                      {idea.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
                    {editingId === idea.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="border text-xs p-1.5 rounded bg-white text-slate-900"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          <option value="Proposed">Proposed</option>
                          <option value="In Review">In Review</option>
                          <option value="Implemented">Implemented</option>
                        </select>
                        <button
                          onClick={() => handleUpdateStatus(idea.id)}
                          className="bg-green-600 text-white text-xs px-2 py-1.5 rounded font-medium"
                        >
                          Ok
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 text-xs px-1"
                        >
                          Anulează
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            idea.status === "Implemented"
                              ? "bg-green-100 text-green-800"
                              : idea.status === "In Review"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          ● {idea.status}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(idea.id);
                            setEditStatus(idea.status || "Proposed");
                          }}
                          className="text-xs text-blue-600 hover:underline px-2"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body: Descriere și Imagini comparative */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="text-sm text-gray-600 space-y-2 lg:col-span-1">
                    <p className="font-semibold text-xs uppercase text-gray-400 tracking-wider">
                      Analiză Impact:
                    </p>
                    <p className="leading-relaxed">{idea.description}</p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                      💰 Cost Reduction: €
                      {(idea.estimated_saving || 0).toLocaleString()} / an
                    </div>
                  </div>

                  {/* Imaginile Comparative */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                        ⛔ Înainte (Before)
                      </span>
                      <div className="h-40 w-full bg-slate-100 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center relative">
                        {idea.image_before_url ? (
                          <img
                            src={idea.image_before_url}
                            alt="Before"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Fără documentație foto
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 tracking-wider block">
                        ✅ După (After)
                      </span>
                      <div className="h-40 w-full bg-slate-100 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center relative">
                        {idea.image_after_url ? (
                          <img
                            src={idea.image_after_url}
                            alt="After"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            În așteptare implementare
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Panou Executiv de Export */}
                <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div className="text-gray-400 font-mono text-[10px]">
                    ID Fișă: #{idea.id} | Înregistrat la:{" "}
                    {new Date(idea.created_at).toLocaleDateString("ro-RO")}
                  </div>

                  {/* Butoane premium de descărcare fișe */}
                  <div className="flex flex-wrap gap-2 self-stretch sm:self-auto">
                    <button
                      onClick={() => exportDocument(idea.id, "pdf")}
                      className="flex-1 sm:flex-none bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-2.5 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      📄 Export PDF
                    </button>
                    <button
                      onClick={() => exportDocument(idea.id, "pptx")}
                      className="flex-1 sm:flex-none bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold px-2.5 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      📊 Slide PPTX
                    </button>
                    <button
                      onClick={() => exportDocument(idea.id, "excel")}
                      className="flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      📈 Registru Excel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed rounded-2xl p-8 text-center text-gray-400 text-sm">
            Nicio propunere înregistrată. Completează formularul de mai sus
            pentru a genera prima fișă Kaizen.
          </div>
        )}
      </div>
    </div>
  );
}
