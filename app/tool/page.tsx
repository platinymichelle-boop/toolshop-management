"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface PageProps {
  searchParams: Promise<{ number?: string }>;
}

export default function ToolPage({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const cleanToolNumber = (resolvedSearchParams.number || "").trim();

  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<any>(null);
  const [activeRepair, setActiveRepair] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);

  // Stări Equipment Tree
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [currentLevelNodes, setCurrentLevelNodes] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  // Stări Modale Administrare Arbore
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [nodeType, setNodeType] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);

  // Stări Gestiune Piese de Schimb și Seeders
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [allUnassignedParts, setAllUnassignedParts] = useState<any[]>([]);
  const [isAttachingPart, setIsAttachingPart] = useState<number | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Stări Import Excel Fagor Structură
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [isImportingSpareParts, setIsImportingSpareParts] = useState(false);

  const allowedNodeTypes = (() => {
    if (breadcrumb.length === 0) return ["PRESS", "TRANSFER", "LOADER"];
    if (breadcrumb.length === 1)
      return ["Electrical", "Mechanical", "Hydraulic", "Pneumatic"];
    if (breadcrumb.length === 2) return ["Assemblies"];
    return ["Assemblies", "Subcomponent"];
  })();
  async function loadLiveToolData() {
    if (!cleanToolNumber) return;
    try {
      setIsLoading(true);
      const searchPattern = `%${cleanToolNumber}%`;

      const toolRes = await supabase
        .from("tools")
        .select("*")
        .ilike("tool_number", searchPattern)
        .maybeSingle();

      const repairActiveRes = await supabase
        .from("repairs")
        .select("status")
        .ilike("tool_number", searchPattern)
        .not("status", "ilike", "closed")
        .order("id", { ascending: false });

      const historyRes = await supabase
        .from("repairs")
        .select("*")
        .ilike("tool_number", searchPattern)
        .order("id", { ascending: false });

      setTool(toolRes.data);
      if (repairActiveRes.data && repairActiveRes.data.length > 0) {
        setActiveRepair(repairActiveRes.data);
      } else {
        setActiveRepair(null);
      }
      setRepairHistory(historyRes.data || []);

      await refreshCurrentTreeLevel(null, []);
    } catch (error) {
      console.error("Eroare la încărcarea fișei tehnice:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLiveToolData();
  }, [cleanToolNumber]);

  async function refreshCurrentTreeLevel(
    targetNode: any,
    activeBreadcrumb: any[],
  ) {
    try {
      setIsTreeLoading(true);
      if (!targetNode) {
        const nodesRes = await supabase
          .from("equipment_nodes")
          .select("*")
          .eq("tool_number", cleanToolNumber)
          .is("parent_id", null)
          .order("sort_order");
        setCurrentLevelNodes(nodesRes.data || []);
        setParts([]);
      } else {
        const childrenRes = await supabase
          .from("equipment_nodes")
          .select("*")
          .eq("tool_number", cleanToolNumber)
          .eq("parent_id", targetNode.id)
          .order("sort_order");

        setCurrentLevelNodes(childrenRes.data || []);

        if (!childrenRes.data || childrenRes.data.length === 0) {
          const partsRes = await supabase
            .from("spare_parts")
            .select("*")
            .eq("equipment_node_id", targetNode.id)
            .order("endr_code", { ascending: true });
          setParts(partsRes.data || []);
        } else {
          setParts([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTreeLoading(false);
    }
  }
  async function handleExcelStructureImport(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file || !currentNode) return;

    // Mapare directă bazată pe noile denumiri ale disciplinelor root
    const sheetMap: Record<string, string> = {
      MECHANICAL: "Mechanic",
      ELECTRICAL: "Electric",
      HYDRAULIC: "Hydraulic",
    };

    const targetSheetName = sheetMap[currentNode.node_name.toUpperCase()];
    if (!targetSheetName) {
      alert(
        "Nodul selectat nu este o disciplină validă pentru import (Trebuie să fie ELECTRICAL, HYDRAULIC sau MECHANICAL).",
      );
      return;
    }

    try {
      setIsImportingExcel(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      let totalImported = 0;
      let totalSkipped = 0;

      const sheet = workbook.Sheets[targetSheetName];
      if (!sheet) {
        alert(
          `Sheet-ul "${targetSheetName}" nu a fost găsit în fișierul Excel.`,
        );
        return;
      }

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const detectedAssemblies: string[] = [];

      // 1. Identificăm dinamic indecșii coloanelor solicitate din antet
      let codeIdx = -1;
      let denominationIdx = -1;
      let manufacturerIdx = -1;

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (!row) continue;

        row.forEach((cell, idx) => {
          const val = String(cell || "")
            .trim()
            .toLowerCase();
          if (val === "code") codeIdx = idx;
          if (val === "denomination") denominationIdx = idx;
          if (val === "manufacturer") manufacturerIdx = idx;
        });

        if (
          codeIdx !== -1 &&
          denominationIdx !== -1 &&
          manufacturerIdx !== -1
        ) {
          break;
        }
      }

      if (codeIdx === -1 || denominationIdx === -1 || manufacturerIdx === -1) {
        alert(
          "Nu s-au putut identifica toate coloanele necesare (Code, Denomination, Manufacturer) în acest sheet.",
        );
        return;
      }

      // 2. Parcurgem rândurile pentru a extrage toate ansamblurile direct
      for (const row of rows) {
        if (
          !row ||
          row.length <= Math.max(codeIdx, denominationIdx, manufacturerIdx)
        )
          continue;

        const codeValue = String(row[codeIdx] || "").trim();
        const denominationValue = String(row[denominationIdx] || "").trim();
        const manufacturerValue = String(row[manufacturerIdx] || "").trim();

        // Ignorăm rândul de antet în sine
        if (denominationValue.toLowerCase() === "denomination") continue;

        // Adăugat în consolă pentru debugging conform cerinței
        console.log(codeValue, denominationValue, manufacturerValue);

        // Condiție simplificată: să existe Code, Denomination și Producătorul să fie Fagor Arrasate
        if (
          codeValue !== "" &&
          denominationValue !== "" &&
          manufacturerValue === "Fagor Arrasate"
        ) {
          detectedAssemblies.push(denominationValue);
        }
      }

      // 4. Eliminarea duplicatelor conform cerinței
      const uniqueAssemblies = [...new Set(detectedAssemblies)];

      // 5. Consola de debug
      console.log(
        `Detected Assemblies for ${currentNode.node_name}:`,
        uniqueAssemblies,
      );

      if (uniqueAssemblies.length > 0) {
        const { data: existingAssemblies, error: asmFetchError } =
          await supabase
            .from("equipment_nodes")
            .select("node_name")
            .eq("tool_number", cleanToolNumber)
            .eq("parent_id", currentNode.id);

        if (asmFetchError) throw asmFetchError;
        const existingSet = new Set(
          existingAssemblies?.map((a) => a.node_name) || [],
        );

        // Copiii se creează direct sub ID-ul disciplinei curente (currentNode.id)
        const insertPayload = uniqueAssemblies
          .filter((name) => !existingSet.has(name))
          .map((name, idx) => ({
            tool_number: cleanToolNumber,
            parent_id: currentNode.id,
            node_name: name,
            node_type: "Assemblies",
            sort_order: (existingSet.size + idx + 1) * 10,
          }));

        if (insertPayload.length > 0) {
          const { error: insertError } = await supabase
            .from("equipment_nodes")
            .insert(insertPayload);
          if (insertError) throw insertError;
          totalImported += insertPayload.length;
        }
        totalSkipped += uniqueAssemblies.length - insertPayload.length;
      }

      alert(
        `Assembly Structure Generated Successfully under ${currentNode.node_name}.\nImported Assemblies: ${totalImported}\nSkipped: ${totalSkipped}`,
      );
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (err: any) {
      alert("Eroare la procesarea structurii Excel: " + err.message);
    } finally {
      setIsImportingExcel(false);
      e.target.value = "";
    }
  }

  async function handleSparePartsImport(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file || !currentNode) return;

    // 1. Determină disciplina părinte din breadcrumb pentru a alege sheet-ul corect
    const breadcrumbNames = (breadcrumb || []).map((b) =>
      typeof b === "string"
        ? b.toUpperCase()
        : String(b?.node_name || b?.name || "").toUpperCase(),
    );

    const isElectrical = breadcrumbNames.includes("ELECTRICAL");
    const isHydraulic = breadcrumbNames.includes("HYDRAULIC");
    const isMechanical = breadcrumbNames.includes("MECHANICAL");

    let targetSheetName = "";
    if (isElectrical) targetSheetName = "Electric";
    else if (isHydraulic) targetSheetName = "Hydraulic";
    else if (isMechanical) targetSheetName = "Mechanic";

    if (!targetSheetName) {
      alert(
        "Nu s-a putut determina disciplina părinte (ELECTRICAL, HYDRAULIC, MECHANICAL) din breadcrumb.",
      );
      return;
    }

    try {
      setIsImportingSpareParts?.(true); // Dacă ai un state dedicat, altfel folosește un loader general
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheet = workbook.Sheets[targetSheetName];
      if (!sheet) {
        alert(
          `Sheet-ul "${targetSheetName}" nu a fost găsit în fișierul Excel.`,
        );
        return;
      }

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // 2. Identificare dinamică coloane
      let codeIdx = -1;
      let denominationIdx = -1;
      let manufacturerIdx = -1;
      let quantityIdx = -1;
      // Adaugă potriviri suplimentare dacă ai coloane specifice în tabel pentru endr_code, priority, etc.
      let endrIdx = -1;

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (!row) continue;
        row.forEach((cell, idx) => {
          const val = String(cell || "")
            .trim()
            .toLowerCase();
          if (val === "code") codeIdx = idx;
          if (val === "denomination") denominationIdx = idx;
          if (val === "manufacturer") manufacturerIdx = idx;
          if (val === "quantity" || val === "qty") quantityIdx = idx;
          if (val === "endr code" || val === "endr_code") endrIdx = idx;
        });
        if (codeIdx !== -1 && denominationIdx !== -1 && manufacturerIdx !== -1)
          break;
      }

      if (codeIdx === -1 || denominationIdx === -1 || manufacturerIdx === -1) {
        alert(
          "Nu s-au putut identifica coloanele obligatorii (Code, Denomination, Manufacturer).",
        );
        return;
      }

      let isWithinTargetAssembly = false;
      const targetPartsPayload: any[] = [];

      // 3. Parcurgerea liniară a rândurilor
      for (const row of rows) {
        if (
          !row ||
          row.length <= Math.max(codeIdx, denominationIdx, manufacturerIdx)
        )
          continue;

        const codeValue = String(row[codeIdx] || "").trim();
        const denominationValue = String(row[denominationIdx] || "").trim();
        const manufacturerValue = String(row[manufacturerIdx] || "").trim();
        const qtyValue =
          quantityIdx !== -1
            ? parseInt(String(row[quantityIdx] || "1").trim(), 10) || 1
            : 1;
        const endrValue =
          endrIdx !== -1 ? String(row[endrIdx] || "").trim() : "";

        if (denominationValue.toLowerCase() === "denomination") continue;

        // Verificăm dacă rândul curent definește o grupare de tip Assembly (Fagor Arrasate)
        const isAssemblyRow =
          codeValue !== "" &&
          denominationValue !== "" &&
          manufacturerValue === "Fagor Arrasate";

        if (isAssemblyRow) {
          if (isWithinTargetAssembly) {
            // 5. Am ajuns la următorul Assembly -> Oprim citirea imediat
            break;
          }

          // 4. Căutăm punctul de pornire (Assembly-ul curent selectat în UI)
          if (
            denominationValue.toUpperCase() ===
            currentNode.node_name.toUpperCase()
          ) {
            isWithinTargetAssembly = true;
            continue; // Trecem la rândul următor unde încep piesele
          }
        }

        // 6. Dacă suntem în interiorul secțiunii corecte, colectăm rândurile (care reprezintă piese/spare parts)
        if (isWithinTargetAssembly) {
          // Ignorăm rândurile goale sau invalide din interiorul grupului
          if (!codeValue && !denominationValue) continue;

          targetPartsPayload.push({
            tool_number: cleanToolNumber,
            equipment_node_id: currentNode.id,
            part_number: codeValue || denominationValue, // fallback pe nume dacă lipsește codul piesei
            specification: denominationValue,
            manufacturer: manufacturerValue || "Unknown",
            endr_code: endrValue,
            priority: "Medium", // Valoare implicită standard
            quantity: qtyValue,
          });
        }
      }

      // 7. Sincronizare cu baza de date (Evitare duplicate folosind cheia equipment_node_id + part_number)
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      if (targetPartsPayload.length === 0) {
        alert(
          `Nu s-au găsit piese de schimb sub ansamblul "${currentNode.node_name}" în fișierul Excel.`,
        );
        return;
      }

      // Preluăm piesele existente deja sub acest nod pentru verificare/update în memorie
      const { data: existingParts, error: fetchErr } = await supabase
        .from("spare_parts")
        .select("id, part_number")
        .eq("equipment_node_id", currentNode.id);

      if (fetchErr) throw fetchErr;

      const existingPartsMap = new Map(
        existingParts?.map((p) => [p.part_number, p.id]) || [],
      );

      for (const part of targetPartsPayload) {
        const existingId = existingPartsMap.get(part.part_number);

        if (existingId) {
          // 9. Actualizare în cazul în care există deja
          const { error: updateErr } = await supabase
            .from("spare_parts")
            .update({
              specification: part.specification,
              manufacturer: part.manufacturer,
              quantity: part.quantity,
              endr_code: part.endr_code,
            })
            .eq("id", existingId);

          if (updateErr) {
            skipped++;
          } else {
            updated++;
          }
        } else {
          // 9. Inserare piesă nouă
          const { error: insertErr } = await supabase
            .from("spare_parts")
            .insert([part]);

          if (insertErr) {
            skipped++;
          } else {
            imported++;
          }
        }
      }

      // 9. Afișare raport final
      alert(
        `Import Spare Parts finalizat pentru ${currentNode.node_name}:\n\n` +
          `✅ Imported (Noi): ${imported}\n` +
          `🔄 Updated (Modificate): ${updated}\n` +
          `❌ Skipped (Erori): ${skipped}`,
      );

      // Refresh pe panoul curent
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (err: any) {
      alert("Eroare la importul pieselor de schimb: " + err.message);
    } finally {
      setIsImportingSpareParts?.(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAllChildren() {
    if (!currentNode) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete all assemblies under this node?",
    );
    if (!confirmDelete) return;

    try {
      // Șterge toate nodurile copil care au parent_id egal cu ID-ul nodului curent
      const { error } = await supabase
        .from("equipment_nodes")
        .delete()
        .eq("parent_id", currentNode.id);

      if (error) throw error;

      alert("All children nodes have been deleted successfully.");

      // Refresh automat al nivelului curent din arbore
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (err: any) {
      alert("Eroare la ștergerea nodurilor copil: " + err.message);
    }
  }

  async function handleGenerateStandardStructure() {
    if (
      !confirm(
        "Sigur doriți să generați structura standard (ELECTRICAL, HYDRAULIC, MECHANICAL) pentru acest utilaj?",
      )
    )
      return;
    try {
      setIsSeeding(true);

      const { data: rootCheck, error: checkError } = await supabase
        .from("equipment_nodes")
        .select("id")
        .eq("tool_number", cleanToolNumber)
        .is("parent_id", null);

      if (checkError) throw checkError;

      if (rootCheck && rootCheck.length > 0) {
        alert(
          "Eroare: Există deja noduri rădăcină (root) configurate pentru acest utilaj.",
        );
        return;
      }

      // Noua structură cu disciplinele direct ca noduri principale (root)
      const standardDisciplines = [
        { node_name: "ELECTRICAL", node_type: "Electrical", sort_order: 10 },
        { node_name: "HYDRAULIC", node_type: "Hydraulic", sort_order: 20 },
        { node_name: "MECHANICAL", node_type: "Mechanical", sort_order: 30 },
      ];

      const insertPayload = standardDisciplines.map((d) => ({
        tool_number: cleanToolNumber,
        parent_id: null,
        node_name: d.node_name,
        node_type: d.node_type,
        sort_order: d.sort_order,
      }));

      const { error: insertError } = await supabase
        .from("equipment_nodes")
        .insert(insertPayload);

      if (insertError) throw insertError;

      alert("Standard Equipment Structure Generated");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (err: any) {
      alert("Eroare la generarea structurii: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleGenerateAssemblyStructure() {
    if (!currentNode || breadcrumb.length !== 2) return;
    const parentModule = breadcrumb[breadcrumb.length - 2]?.node_name;
    const systemType = currentNode?.node_name;

    if (parentModule !== "PRESS") {
      alert(
        "Generarea automată de subansamble este disponibilă momentan doar sub modulul PRESS.",
      );
      return;
    }

    if (
      !confirm(`Generați subansamblele standard pentru PRESS > ${systemType}?`)
    )
      return;

    let assembliesToCreate: string[] = [];

    if (systemType === "Electrical") {
      assembliesToCreate = [
        "CROWN ELECTRIC PIECES",
        "SLIDE ELECTRIC PIECES",
        "PRESS BED ELECTRIC PIECES",
        "PRESS ELECTRIC PIECES",
        "ELECTRIC CABINET",
        "MACHINE PERIPHERY",
      ];
    } else if (systemType === "Mechanical") {
      assembliesToCreate = [
        "CROWN ASSEMBLY",
        "CLUTCH BRAKE ASSEMBLY",
        "MAIN MOTOR",
        "SLIDE GUIDES",
        "COUNTERBALANCERS",
      ];
    } else if (systemType === "Hydraulic") {
      assembliesToCreate = [
        "CROWN HYDRAULIC PIECES",
        "CLUTCH BRAKE HYDRAULIC UNIT",
        "LUBRICATION UNIT",
        "CROWN LUBRICATION",
        "SLIDE LUBRICATION",
      ];
    } else if (systemType === "Pneumatic") {
      assembliesToCreate = [
        "CROWN PNEUMATIC PIECES",
        "PRESS BED PNEUMATIC PIECES",
        "UPRIGHTS PNEUMATIC PIECES",
      ];
    }

    if (assembliesToCreate.length === 0) return;

    try {
      setIsSeeding(true);
      const { data: existingSubNodes, error: fetchError } = await supabase
        .from("equipment_nodes")
        .select("node_name")
        .eq("tool_number", cleanToolNumber)
        .eq("parent_id", currentNode.id);

      if (fetchError) throw fetchError;
      const existingNames = new Set(
        existingSubNodes?.map((n) => n.node_name) || [],
      );

      const insertPayload = assembliesToCreate
        .filter((name) => !existingNames.has(name))
        .map((name, idx) => ({
          tool_number: cleanToolNumber,
          parent_id: currentNode.id,
          node_name: name,
          node_type: "Assemblies",
          sort_order: (existingNames.size + idx + 1) * 10,
        }));

      if (insertPayload.length > 0) {
        const { error: insertError } = await supabase
          .from("equipment_nodes")
          .insert(insertPayload);
        if (insertError) throw insertError;
      }

      alert("Assembly Structure Generated Successfully.");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (err: any) {
      alert("Eroare la generarea subansamblelor: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleNodeClick(node: any) {
    const newBreadcrumb = [...breadcrumb, node];
    setBreadcrumb(newBreadcrumb);
    setCurrentNode(node);
    await refreshCurrentTreeLevel(node, newBreadcrumb);
  }

  async function handleBreadcrumbClick(index: number) {
    if (index === -1) {
      setCurrentNode(null);
      setBreadcrumb([]);
      await refreshCurrentTreeLevel(null, []);
    } else {
      const targetNode = breadcrumb[index];
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setCurrentNode(targetNode);
      await refreshCurrentTreeLevel(targetNode, newBreadcrumb);
    }
  }
  function openCreateModal() {
    setModalMode("create");
    setEditingNodeId(null);
    setNodeName("");
    setNodeType(allowedNodeTypes[0] || "");
    setParentId(currentNode ? currentNode.id : null);
    setSortOrder(currentLevelNodes.length * 10 + 10);
    setIsNodeModalOpen(true);
  }

  function openEditModal(node: any, e: React.MouseEvent) {
    e.stopPropagation();
    setModalMode("edit");
    setEditingNodeId(node.id);
    setNodeName(node.node_name);
    setNodeType(node.node_type || "");
    setParentId(node.parent_id);
    setSortOrder(node.sort_order || 0);
    setIsNodeModalOpen(true);
  }

  async function handleSaveNode(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (modalMode === "create") {
        const { error } = await supabase.from("equipment_nodes").insert([
          {
            tool_number: cleanToolNumber,
            parent_id: parentId,
            node_name: nodeName.trim(),
            node_type: nodeType,
            sort_order: sortOrder,
          },
        ]);
        if (error) throw error;
      } else if (modalMode === "edit" && editingNodeId) {
        const { error } = await supabase
          .from("equipment_nodes")
          .update({
            node_name: nodeName.trim(),
            node_type: nodeType,
            sort_order: sortOrder,
          })
          .eq("id", editingNodeId);
        if (error) throw error;
      }
      setIsNodeModalOpen(false);
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare la salvarea nodului: " + error.message);
    }
  }

  async function handleDeleteNode(nodeId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !confirm(
        "Sigur doriți să ștergeți acest nod și toate subansamblele sale?",
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("equipment_nodes")
        .delete()
        .eq("id", nodeId);
      if (error) throw error;

      if (currentNode && currentNode.id === nodeId) {
        handleBreadcrumbClick(breadcrumb.length - 2);
      } else {
        await refreshCurrentTreeLevel(currentNode, breadcrumb);
      }
    } catch (error: any) {
      alert("Eroare la ștergerea nodului: " + error.message);
    }
  }

  async function openAttachModal() {
    if (!currentNode) return;
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .ilike("tool_number", `%${cleanToolNumber}%`)
        .or(`equipment_node_id.is.null,equipment_node_id.neq.${currentNode.id}`)
        .order("endr_code", { ascending: true });
      if (error) throw error;
      setAllUnassignedParts(data || []);
      setIsAttachModalOpen(true);
    } catch (error: any) {
      alert("Eroare la încărcarea pieselor: " + error.message);
    }
  }

  async function handleAttachPart(partId: number) {
    if (!currentNode) return;
    try {
      setIsAttachingPart(partId);
      const { error } = await supabase
        .from("spare_parts")
        .update({ equipment_node_id: currentNode.id })
        .eq("id", partId);
      if (error) throw error;

      setIsAttachModalOpen(false);
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare la atașarea piesei: " + error.message);
    } finally {
      setIsAttachingPart(null);
    }
  }

  async function handleRemovePartFromNode(partId: number) {
    if (!confirm("Sigur doriți să detașați piesa de pe acest nod industrial?"))
      return;
    try {
      const { error } = await supabase
        .from("spare_parts")
        .update({ equipment_node_id: null })
        .eq("id", partId);
      if (error) throw error;
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare la detașarea piesei: " + error.message);
    }
  }

  async function handleStockChange(
    partId: number,
    currentStock: number,
    delta: number,
  ) {
    try {
      setIsUpdatingStock(partId);
      const newStock = Math.max(0, currentStock + delta);
      const { error } = await supabase
        .from("spare_parts")
        .update({ stock_quantity: newStock })
        .eq("id", partId);
      if (error) throw error;

      setParts((prevParts) =>
        prevParts.map((part) =>
          part.id === partId ? { ...part, stock_quantity: newStock } : part,
        ),
      );
    } catch (error: any) {
      alert("Eroare la actualizarea stocului: " + error.message);
    } finally {
      setIsUpdatingStock(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">
        Se încarcă fișa tehnică live pentru {cleanToolNumber}...
      </div>
    );
  }

  const dynamicStatus = activeRepair ? activeRepair.status : "Available";
  const statusColor =
    dynamicStatus === "Available"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : dynamicStatus?.toLowerCase() === "new"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : dynamicStatus?.toLowerCase() === "testing"
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {tool?.tool_number || cleanToolNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fișă tehnică de monitorizare reper și mentenanță.
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}
        >
          ● {dynamicStatus}
        </span>
      </div>

      {/* Indicatori */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Locație Depozitare
            </p>
            <p className="text-lg font-black text-slate-800 mt-1">
              {tool?.kardex_shelf ? `ENDR Warehouse Kashif  ${tool.kardex_shelf}` : "Nalocat"}
            </p>
          </div>
          <span className="text-2xl p-3 bg-slate-50 rounded-xl">🏢</span>
        </div>
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Reparații
            </p>
            <p className="text-lg font-black text-slate-800 mt-1">
              {repairHistory?.length || 0} intervenții
            </p>
          </div>
          <span className="text-2xl p-3 bg-slate-50 rounded-xl">🛠️</span>
        </div>
      </div>

      {/* Equipment Tree Structure Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Arbore Echipamente & Structură Subansamble
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Navigați și administrați modulele utilajului industrial.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {currentNode &&
              ["MECHANICAL", "ELECTRICAL", "HYDRAULIC"].includes(
                currentNode.node_name,
              ) && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="excel-structure-import"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    📥{" "}
                    {isImportingExcel
                      ? "Importing..."
                      : "Import Excel Structure"}
                  </label>
                  <input
                    id="excel-structure-import"
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleExcelStructureImport}
                    disabled={isImportingExcel}
                  />
                </div>
              )}
            {currentNode &&
              !["MECHANICAL", "ELECTRICAL", "HYDRAULIC"].includes(
                currentNode.node_name,
              ) && (
                <label
                  htmlFor="spare-parts-import"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  📦{" "}
                  {isImportingSpareParts
                    ? "Importing..."
                    : "Import Spare Parts"}
                  <input
                    id="spare-parts-import"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleSparePartsImport}
                    disabled={isImportingSpareParts}
                  />
                </label>
              )}

            {currentNode &&
              currentLevelNodes.length === 0 &&
              !["MECHANICAL", "ELECTRICAL", "HYDRAULIC"].includes(
                currentNode.node_name,
              ) && (
                <button
                  onClick={handleGenerateStandardStructure}
                  disabled={isSeeding}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  {isSeeding ? "Generating..." : "Generate Standard Structure"}
                </button>
              )}
            {breadcrumb.length === 2 &&
              breadcrumb[breadcrumb.length - 2]?.node_name === "PRESS" &&
              ["Electrical", "Mechanical", "Hydraulic", "Pneumatic"].includes(
                currentNode?.node_name,
              ) && (
                <button
                  onClick={handleGenerateAssemblyStructure}
                  disabled={isSeeding}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  {isSeeding
                    ? "Generating Assemblies..."
                    : "Generate Assembly Structure"}
                </button>
              )}
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              + Add Node
            </button>
            {breadcrumb.length > 0 && (
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-600 shadow-sm transition-all"
              >
                ← Înapoi
              </button>
            )}

            {currentNode &&
              currentLevelNodes &&
              currentLevelNodes.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllChildren}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors px-3 py-2"
                >
                  <span>🗑️</span>
                  <span>Delete Subassemblies</span>
                </button>
              )}
          </div>
        </div>
        {/* Breadcrumb Structură */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center flex-wrap gap-2 text-xs font-medium text-slate-600">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`hover:text-blue-600 transition-colors ${breadcrumb.length === 0 ? "font-bold text-blue-600" : ""}`}
          >
            {tool?.tool_number || cleanToolNumber}
          </button>
          {breadcrumb.map((node, index) => (
            <div key={node.id} className="flex items-center gap-2">
              <span className="text-slate-300">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                disabled={index === breadcrumb.length - 1}
                className={`hover:text-blue-600 transition-colors uppercase ${index === breadcrumb.length - 1 ? "font-bold text-slate-800 cursor-default" : ""}`}
              >
                {node.node_name}
              </button>
            </div>
          ))}
        </div>

        {/* Tree Content (Carduri) */}
        <div className="p-6">
          {isTreeLoading ? (
            <div className="flex items-center justify-center h-48 text-sm font-medium text-slate-400 animate-pulse">
              Se încarcă structura...
            </div>
          ) : currentLevelNodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {currentLevelNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="flex flex-col justify-between p-5 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-xl text-left transition-all group relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-500 transition-colors" />
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        {node.node_type || "Nod Subansamblu"}
                      </span>
                      <span className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                        {node.node_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditModal(node, e)}
                        className="p-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 rounded text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteNode(node.id, e)}
                        className="p-1 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-slate-400 group-hover:text-blue-500 transition-colors w-full">
                    Explorează →
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !currentNode && (
              <div className="text-center py-6 text-sm text-slate-400 font-medium">
                Nu există noduri în structură. Utilizați "Import Excel
                Structure" sau configuratorul rapid standard.
              </div>
            )
          )}
        </div>
      </div>

      {/* Panou Piese de Schimb - Afișat dacă nodul selectat este terminal */}
      {currentNode && currentLevelNodes.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Spare Parts — {currentNode.node_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Componente și piese din depozit asociate acestui asamblu
                industrial.
              </p>
            </div>
            <button
              onClick={openAttachModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              + Attach Spare Part
            </button>
          </div>
          <div className="p-6">
            {parts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                      <th className="py-3 px-4">ENDR Code</th>
                      <th className="py-3 px-4">Specification</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4">Kardex Shelf</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {parts.map((part) => (
                      <tr
                        key={part.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {part.endr_code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {part.specification || part.part_name || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${part.stock_quantity <= (part.min_stock || 0) ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-100 text-slate-700"}`}
                          >
                            {part.stock_quantity} buc
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                          {part.kardex_shelf
                            ? `Raft ${part.kardex_shelf}`
                            : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right flex items-center justify-end gap-3">
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            <button
                              onClick={() =>
                                handleStockChange(
                                  part.id,
                                  part.stock_quantity,
                                  -1,
                                )
                              }
                              disabled={
                                part.stock_quantity === 0 ||
                                isUpdatingStock === part.id
                              }
                              className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded disabled:opacity-30 transition-all"
                            >
                              -1
                            </button>
                            <div className="w-[1px] bg-slate-100 my-1"></div>
                            <button
                              onClick={() =>
                                handleStockChange(
                                  part.id,
                                  part.stock_quantity,
                                  1,
                                )
                              }
                              disabled={isUpdatingStock === part.id}
                              className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded disabled:opacity-30 transition-all"
                            >
                              +1
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemovePartFromNode(part.id)}
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold border border-rose-100 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400 font-medium">
                Nu există piese atașate la acest ansamblu terminal.
              </div>
            )}
          </div>
        </div>
      )}
      {/* Istoric Intervenții */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Istoric Intervenții & Reparații
          </h2>
        </div>
        <div className="overflow-x-auto">
          {repairHistory.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 font-medium">
              Nu există reparații înregistrate pentru acest utilaj.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-5">ID Tichet</th>
                  <th className="py-3 px-5">Descriere Problemă</th>
                  <th className="py-3 px-5">Echipa / Tehnician</th>
                  <th className="py-3 px-5">Dată Înregistrare</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {repairHistory.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-500">
                      #{rep.id}
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-800 max-w-xs truncate">
                      {rep.failure}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      {rep.technician || "Nealocat"}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                      {rep.created_at
                        ? new Date(rep.created_at).toLocaleDateString("ro-RO")
                        : "-"}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${rep.status?.toLowerCase() === "closed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-600"}`}
                      >
                        {rep.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Node Modal (Add / Edit) */}
      {isNodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                {modalMode === "create" ? "Add New Node" : "Edit Node"}
              </h3>
              <button
                onClick={() => setIsNodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveNode} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Node Name
                </label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  required
                  placeholder="e.g. CROWN ELECTRIC PIECES"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Node Type
                </label>
                <select
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value)}
                  disabled={modalMode === "edit"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500 disabled:bg-slate-50"
                >
                  {allowedNodeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Parent Node ID
                  </label>
                  <input
                    type="text"
                    value={parentId || "Root (None)"}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-400 bg-slate-50"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNodeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  Save Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Spare Part Modal */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                Select Spare Part
              </h3>
              <button
                onClick={() => setIsAttachModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-5 max-h-[400px] overflow-y-auto">
              {allUnassignedParts.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {allUnassignedParts.map((part) => (
                    <div
                      key={part.id}
                      className="py-3 flex items-center justify-between text-sm gap-4"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-700 block">
                          {part.endr_code}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {part.specification ||
                            part.part_name ||
                            "Fără specificații"}
                        </span>
                        {part.equipment_node_id && (
                          <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                            ⚠️ Mută de la alt nod
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAttachPart(part.id)}
                        disabled={isAttachingPart === part.id}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {isAttachingPart === part.id ? "Atașare..." : "Select"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  Nu s-au găsit piese disponibile în sistem pentru utilajul{" "}
                  {cleanToolNumber}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
