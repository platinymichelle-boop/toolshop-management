"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Repair {
  id: number;
  created_at: string;
  tool_number: string | null;
  failure: string | null;
  technician: string | null;
  priority: string | null;
  status: string | null;
  image_before_url?: string | null;
  image_after_url?: string | null;
  replaced_part?: string | null;
  part_quantity?: number;
}

export interface DBTool { id: number; tool_number: string | null; }
export interface DBTech { id: number; name: string | null; active: boolean | null; }
export interface DBPart { id: number; endr_code: string | null; specification: string | null; stock_quantity?: number; }

export function useRepairsData(alertFields: string, alertSuccess: string) {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [dbTools, setDbTools] = useState<DBTool[]>([]);
  const [dbTechs, setDbTechs] = useState<DBTech[]>([]);
  const [dbParts, setDbParts] = useState<DBPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadAllData() {
    try {
      setIsLoading(true);
      const [repairsRes, toolsRes, techsRes, partsRes] = await Promise.all([
        supabase.from("repairs").select("*").order("id", { ascending: false }),
        supabase.from("tools").select("id, tool_number").order("tool_number", { ascending: true }),
        supabase.from("technicians").select("id, name, active").eq("active", true).order("name", { ascending: true }),
        supabase.from("spare_parts").select("id, endr_code, specification, stock_quantity").order("endr_code", { ascending: true })
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

  useEffect(() => { loadAllData(); }, []);

  async function uploadPhoto(file: File, folder: string): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage.from("improvement-images").upload(filePath, file);
      if (error) throw error;

      return supabase.storage.from("improvement-images").getPublicUrl(filePath).data.publicUrl;
    } catch (err: any) {
      console.error("Eroare upload foto:", err.message);
      return null;
    }
  }

  // MODIFICAT: Trimite notificare push pe mobil la deschiderea unui tichet nou
  async function createRepair(data: any, files: { before: File | null; after: File | null }, resetForm: () => void) {
    if (!data.toolNumber || !data.failure) {
      alert(alertFields);
      return;
    }
    try {
      setIsSaving(true);
      const imgBeforeUrl = files.before ? await uploadPhoto(files.before, "repairs_before") : null;
      const imgAfterUrl = files.after ? await uploadPhoto(files.after, "repairs_after") : null;

      const qtyUsed = data.partQuantity ? parseInt(data.partQuantity, 10) : 0;

      // 1. Verificăm dacă piesa selectată are stoc suficient înainte de a deschide tichetul
      if (data.replacedPart && qtyUsed > 0) {
        const { data: partData } = await supabase
          .from("spare_parts")
          .select("stock_quantity")
          .eq("endr_code", data.replacedPart)
          .maybeSingle();

        const currentStock = partData?.stock_quantity || 0;

        if (currentStock < qtyUsed) {
          alert(`Eroare: Stoc insuficient! Stoc curent: ${currentStock} buc. Solicitat: ${qtyUsed} buc.`);
          return;
        }

        // 2. Scădem cantitatea din tabela spare_parts în mod direct
        const newStock = currentStock - qtyUsed;
        const { error: stockError } = await supabase
          .from("spare_parts")
          .update({ stock_quantity: newStock })
          .eq("endr_code", data.replacedPart);

        if (stockError) throw stockError;
      }

      // 3. Inserăm tichetul de reparație cu piesa și cantitatea consumată salvate
      const { error } = await supabase.from("repairs").insert({
        tool_number: data.toolNumber,
        failure: data.failure.trim(),
        technician: data.technician || null,
        priority: data.priority,
        status: "New",
        image_before_url: imgBeforeUrl,
        image_after_url: imgAfterUrl,
        replaced_part: data.replacedPart || null,
        part_quantity: qtyUsed
      });

      if (error) throw error;
      
      // 4. TRIGGER WEB PUSH CĂTRE BACKEND (Înainte de închiderea/resetarea formularului)
      fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🛠️ Tichet Nou în Service!",
          body: `Defecțiune la Matrița/Unealta nr. ${data.toolNumber}. Prioritate: ${data.priority || "Normală"}.`,
          url: "/repairs"
        })
      }).catch(err => console.error("Eroare trimitere push la creare tichet:", err));

      alert(alertSuccess);
      resetForm();
      loadAllData();
    } catch (error: any) {
      alert("Eroare: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  // MODIFICAT: Trimite notificare push pe mobil când se schimbă statusul reparației
  async function updateRepairStatus(id: number, nextStatus: string) {
    try {
      let finalStatus = nextStatus;
      if (nextStatus.toLowerCase() === "in repair") {
        finalStatus = "In Progress";
      }

      const { error } = await supabase.from("repairs").update({ status: finalStatus }).eq("id", id);
      if (error) throw error;

      // TRIGGER WEB PUSH LA MODIFICARE STATUS
      fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🔄 Status Matriță Modificat",
          body: `Tichetul #${id} a fost trecut în stadiul: "${finalStatus}".`,
          url: "/repairs"
        })
      }).catch(err => console.error("Eroare trimitere push la update status:", err));

      loadAllData();
    } catch (error: any) {
      alert("Eroare update status: " + error.message);
    }
  }

  async function exportToExcel(repairId: number) {
    const repair = repairs.find(r => r.id === repairId);
    if (!repair) return;

    const { utils, writeFile } = await import("xlsx");
    const dataRows = [
      ["RAPORT TEHNIC DE REPARAȚIE - TOOLSHOP PRO"],
      [],
      ["ID Tichet:", repair.id],
      ["Dată Deschidere:", new Date(repair.created_at).toLocaleDateString()],
      ["Număr Sculă (Tool №):", repair.tool_number],
      ["Defecțiune Constatată:", repair.failure],
      ["Tehnician Responsabil:", repair.technician || "Nalocat"],
      ["Piesă înlocuită:", repair.replaced_part || "-"],
      ["Cantitate Piese:", repair.part_quantity || 0],
      ["Prioritate:", repair.priority],
      ["Stadiu Curent:", repair.status]
    ];

    const worksheet = utils.aoa_to_sheet(dataRows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Fisă Service");
    writeFile(workbook, `Service_Report_#${repair.id}.xlsx`);
  }

  async function deleteRepair(id: number) {
    if (!window.confirm("Sigur dorești să ștergi definitiv acest tichet?")) return;
    try {
      const { error } = await supabase.from("repairs").delete().eq("id", id);
      if (error) throw error;
      loadAllData();
    } catch (error: any) {
      alert("Eroare la ștergere: " + error.message);
    }
  }

  return { 
    repairs, dbTools, dbTechs, dbParts, isLoading, isSaving, 
    createRepair, updateRepairStatus, exportToExcel, deleteRepair 
  };
}
