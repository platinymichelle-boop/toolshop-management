"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  ClipboardCheck,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";

interface CorrectiveAction {
  id: string;
  claim_id: string;
  action_type: string;
  action_text: string;
  responsible: string;
  due_date: string;
  status: string;
}

export default function ClaimDetailsPage() {
  const params = useParams();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState<boolean>(false);
  const [isSavingAction, setIsSavingAction] = useState<boolean>(false);

  const [newAction, setNewAction] = useState({
    action_type: "Interim",
    action_text: "",
    responsible: "",
    due_date: "",
    status: "Open",
  });

  useEffect(() => {
    if (params?.id) {
      loadAllPageData();
    }
  }, [params?.id]);

  async function loadAllPageData() {
    try {
      setLoading(true);
      const { data: claimData, error: claimError } = await supabase
        .from("quality_claims")
        .select("*")
        .eq("id", params.id)
        .single();

      if (claimError) throw claimError;
      setClaim(claimData);

      await loadActions(params.id as string);
    } catch (err) {
      console.error("Error loading page data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadActions(claimId: string) {
    try {
      const { data, error } = await supabase
        .from("quality_claim_actions")
        .select("*")
        .eq("claim_id", claimId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setActions(data || []);
    } catch (err) {
      console.error("Error loading corrective actions:", err);
    }
  }
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",");
        resolve(base64Data[1]);
      };
      reader.readAsDataURL(blob);
    });
  };

  async function handleExtractPptData() {
    if (!claim || !claim.file_url) {
      alert("Nu există niciun fișier asociat acestei reclamații.");
      return;
    }

    try {
      setIsExtracting(true);
      const fileUrlParts = claim.file_url.split("/");
      const fileName = fileUrlParts[fileUrlParts.length - 1];

      const { data: storageBlob, error: storageError } = await supabase.storage
        .from("quality-claims")
        .download(fileName);

      if (storageError || !storageBlob) {
        throw new Error(
          `Browser storage download failed: ${storageError?.message}`,
        );
      }

      const base64File = await convertBlobToBase64(storageBlob);

      const response = await fetch("/api/generate-claim-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_base64: base64File }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Eroare la procesarea fișierului PPTX.",
        );
      }

      const extractedData = await response.json();

      const { error: updateError } = await supabase
        .from("quality_claims")
        .update({
          part_number: extractedData.part_number || null,
          defect_type: extractedData.defect_type || null,
          date_detected: extractedData.date_detected || null,
          what_happened: extractedData.what_happened || null,
          why_problem: extractedData.why_problem || null,
          root_cause_occurrence: extractedData.root_cause_occurrence || null,
          root_cause_non_detection:
            extractedData.root_cause_non_detection || null,
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      const { data: refreshedClaim } = await supabase
        .from("quality_claims")
        .select("*")
        .eq("id", claim.id)
        .single();
      setClaim(refreshedClaim);

      alert("Datele au fost extrase și salvate cu succes din PPTX via Gemini!");
    } catch (err: any) {
      console.error("Extraction logic failed:", err);
      alert(`Eroare la extracție: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  }
  async function handleExportPptx() {
    if (!claim) {
      alert("Datele reclamației nu sunt încărcate.");
      return;
    }

    try {
      setIsExporting(true);

      // Trimitem direct obiectele complete din state-ul React din browser către server
      const response = await fetch("/api/export-onepage-pptx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claim: claim,
          actions: actions, // Trimite tabelul de acțiuni direct din starea locală
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "A eșuat generarea exportului binar.");
      }

      const blob = await response.blob();
      const safeName = (claim.claim_number || "Report").replace(
        /[^a-zA-Z0-9-_]/g,
        "_",
      );
      const fileName = `${safeName}_OnePage.pptx`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("Client Export PPTX logic failed:", err);
      alert(`Eroare la export: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSaveAction(e: React.FormEvent) {
    e.preventDefault();
    if (
      !newAction.action_text ||
      !newAction.responsible ||
      !newAction.due_date
    ) {
      alert("Vă rugăm să completați toate câmpurile obligatorii.");
      return;
    }

    try {
      setIsSavingAction(true);
      const { error } = await supabase.from("quality_claim_actions").insert([
        {
          claim_id: claim.id,
          action_type: newAction.action_type,
          action_text: newAction.action_text,
          responsible: newAction.responsible,
          due_date: newAction.due_date,
          status: newAction.status,
        },
      ]);

      if (error) throw error;

      setNewAction({
        action_type: "Interim",
        action_text: "",
        responsible: "",
        due_date: "",
        status: "Open",
      });
      setIsActionDialogOpen(false);
      await loadActions(claim.id);
    } catch (err: any) {
      console.error("Error saving corrective action:", err);
      alert(`Eroare la salvarea acțiunii: ${err.message}`);
    } finally {
      setIsSavingAction(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-400 bg-slate-950 min-h-screen">
        Se încarcă detaliile reclamației...
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-6 text-rose-500 font-semibold bg-slate-950 min-h-screen">
        Reclamația nu a fost găsită.
      </div>
    );
  }
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto text-slate-100 bg-slate-950 min-h-screen rounded-2xl border border-slate-900 shadow-2xl">
      {/* HEADER RECLAMAȚIE */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Claim Profile
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">
            {claim.claim_number}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPptx}
            disabled={isExporting}
            className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 font-bold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-400/30 border-t-white rounded-full animate-spin" />
                Se generează...
              </>
            ) : (
              "📥 Export One Page PPTX"
            )}
          </button>

          <button
            onClick={handleExtractPptData}
            disabled={isExtracting}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExtracting ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                Se extrag datele din PPTX...
              </>
            ) : (
              "📄 Extract PPT Data"
            )}
          </button>
        </div>
      </div>

      {/* DATE DE BAZĂ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800/80">
        <div>
          <strong className="block text-slate-400 text-xs uppercase tracking-wider">
            Customer
          </strong>
          <span className="text-white font-medium text-base mt-0.5 block">
            {claim.customer || "-"}
          </span>
        </div>
        <div>
          <strong className="block text-slate-400 text-xs uppercase tracking-wider">
            Status
          </strong>
          <span
            className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full mt-1 ${
              claim.status === "Open"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {claim.status || "-"}
          </span>
        </div>
        <div>
          <strong className="block text-slate-400 text-xs uppercase tracking-wider">
            File Resource
          </strong>
          {claim.file_url ? (
            <a
              href={claim.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-medium text-sm mt-0.5 block truncate"
            >
              {claim.uploaded_file || "Deschide Prezentarea One-Page"}
            </a>
          ) : (
            <span className="text-slate-500 text-sm mt-0.5 block">
              Niciun fișier încărcat
            </span>
          )}
        </div>
      </div>
      {/* SECȚIUNEA TEHNICĂ AUTOMATĂ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
          <strong className="text-slate-400 text-xs uppercase tracking-wider">
            Part Number
          </strong>
          <p className="text-white font-semibold mt-1 text-lg">
            {claim.part_number || (
              <span className="text-slate-700 font-normal text-sm">Lipsă</span>
            )}
          </p>
        </div>
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
          <strong className="text-slate-400 text-xs uppercase tracking-wider">
            Defect Type
          </strong>
          <p className="text-white font-semibold mt-1 text-lg">
            {claim.defect_type || (
              <span className="text-slate-700 font-normal text-sm">Lipsă</span>
            )}
          </p>
        </div>
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
          <strong className="text-slate-400 text-xs uppercase tracking-wider">
            Date Detected
          </strong>
          <p className="text-white font-semibold mt-1 text-lg">
            {claim.date_detected ? (
              new Date(claim.date_detected).toLocaleDateString("ro-RO")
            ) : (
              <span className="text-slate-700 font-normal text-sm">Lipsă</span>
            )}
          </p>
        </div>
      </div>

      {/* SECȚIUNEA NARATIVĂ */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-900 pb-2">
          Analiză Detaliată Problemă (8D / One Page Report)
        </h2>
        <div className="space-y-4">
          <div>
            <strong className="text-slate-400 text-sm font-medium">
              What Happened (Ce s-a întâmplat)
            </strong>
            <div className="mt-1.5 text-slate-300 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 min-h-[50px]">
              {claim.what_happened || (
                <span className="text-slate-700 text-sm">
                  Informație lipsă.
                </span>
              )}
            </div>
          </div>
          <div>
            <strong className="text-slate-400 text-sm font-medium">
              Why Problem (De ce este o problemă)
            </strong>
            <div className="mt-1.5 text-slate-300 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 min-h-[50px]">
              {claim.why_problem || (
                <span className="text-slate-700 text-sm">
                  Informație lipsă.
                </span>
              )}
            </div>
          </div>
          <div>
            <strong className="text-slate-400 text-sm font-medium">
              Root Cause Occurrence (Cauză Rădăcină Apariție)
            </strong>
            <div className="mt-1.5 text-slate-300 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 min-h-[50px]">
              {claim.root_cause_occurrence || (
                <span className="text-slate-700 text-sm">
                  Informație lipsă.
                </span>
              )}
            </div>
          </div>
          <div>
            <strong className="text-slate-400 text-sm font-medium">
              Root Cause Non Detection (Cauză Rădăcină Nedetectare)
            </strong>
            <div className="mt-1.5 text-slate-300 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 min-h-[50px]">
              {claim.root_cause_non_detection || (
                <span className="text-slate-700 text-sm">
                  Informație lipsă.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* CORRECTIVE ACTIONS */}
      <div className="space-y-4 border-t border-slate-900 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Corrective Actions
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Managementul acțiunilor de izolare (Interim) și remediere
              permanentă
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsActionDialogOpen(true)}
              className="px-4 py-2 text-sm rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Action
            </button>

            {isActionDialogOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl text-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                    <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-lg text-white">
                      Add Corrective Action
                    </h3>
                  </div>

                  <form onSubmit={handleSaveAction} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Action Type
                      </label>
                      <select
                        value={newAction.action_type}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            action_type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-white"
                      >
                        <option value="Interim">Interim</option>
                        <option value="Permanent">Permanent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Action Text
                      </label>
                      <textarea
                        value={newAction.action_text}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            action_text: e.target.value,
                          })
                        }
                        placeholder="Descrieți acțiunea corectivă..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Responsible
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                        <input
                          type="text"
                          value={newAction.responsible}
                          onChange={(e) =>
                            setNewAction({
                              ...newAction,
                              responsible: e.target.value,
                            })
                          }
                          placeholder="Ex: John Doe"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-white placeholder:text-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Due Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                        <input
                          type="date"
                          value={newAction.due_date}
                          onChange={(e) =>
                            setNewAction({
                              ...newAction,
                              due_date: e.target.value,
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-white scheme-dark"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Status
                      </label>
                      <select
                        value={newAction.status}
                        onChange={(e) =>
                          setNewAction({ ...newAction, status: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-sm text-white"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                      <button
                        type="button"
                        onClick={() => setIsActionDialogOpen(false)}
                        className="px-4 py-2 border border-slate-800 text-sm text-slate-300 hover:bg-slate-800 rounded-xl font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingAction}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 rounded-xl font-bold text-sm"
                      >
                        {isSavingAction ? "Saving..." : "Save Action"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABEL ACȚIUNI */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {actions.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                Nu au fost definite acțiuni corective pentru acest caz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-3.5">Action Type</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Responsible</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((act) => (
                    <tr
                      key={act.id}
                      className="border-b border-slate-800/50 hover:bg-slate-900/20 transition-colors"
                    >
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md ${
                            act.action_type === "Permanent"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {act.action_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-200 font-medium max-w-sm">
                        {act.action_text}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {act.responsible}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {act.due_date
                          ? new Date(act.due_date).toLocaleDateString("ro-RO")
                          : "-"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            act.status === "Closed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : act.status === "In Progress"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
