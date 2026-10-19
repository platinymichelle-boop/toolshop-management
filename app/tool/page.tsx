"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";

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

  // Stare nouă pentru motorul de căutare piese în timp real
  const [searchTerm, setSearchTerm] = useState("");

  // Stări Equipment Tree (Structură Utilaj)
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [currentLevelNodes, setCurrentLevelNodes] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  // Stări Modale Administrare Arbore Structură
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [nodeType, setNodeType] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);

  // Stări Gestiune Seeders Structură Echipamente
  const [isSeeding, setIsSeeding] = useState(false);

  const allowedNodeTypes = (() => {
    if (breadcrumb.length === 0) return ["PRESS", "TRANSFER", "LOADER"];
    if (breadcrumb.length === 1) {
      if (cleanToolNumber.toUpperCase().startsWith("APR-")) {
        return [
          "Mechanical",
          "Electrical",
          "Hydraulic",
          "Nut Feeder",
          "Consumables",
        ];
      }
      return ["Electrical", "Mechanical", "Hydraulic", "Pneumatic"];
    }
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

      setCurrentNode(null);
      setBreadcrumb([]);
      await refreshCurrentTreeLevel(null, []);
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
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
      setSearchTerm(""); // Resetăm termenul la comutarea categoriilor

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
        const nodeNameUpper = String(targetNode.node_name || "").toUpperCase();
        const validCategories = [
          "MECHANICAL",
          "ELECTRICAL",
          "HYDRAULIC",
          "NUT FEEDER",
          "CONSUMABLES",
        ];

        if (validCategories.includes(nodeNameUpper)) {
          const partsRes = await supabase
            .from("spare_parts")
            .select("*")
            .eq("tool_number", cleanToolNumber)
            .eq("import_category", nodeNameUpper)
            .order("endr_code", { ascending: true });

          console.log("NODE:", nodeNameUpper);
          console.log("TOOL:", cleanToolNumber);
          console.log("ROWS:", partsRes.data?.length);
          console.log("ERROR:", partsRes.error);

          setParts(partsRes.data || []);
          setCurrentLevelNodes([]);
        } else {
          const childrenRes = await supabase
            .from("equipment_nodes")
            .select("*")
            .eq("tool_number", cleanToolNumber)
            .eq("parent_id", targetNode.id)
            .order("sort_order");

          setCurrentLevelNodes(childrenRes.data || []);
          setParts([]);
        }
      }
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
    } finally {
      setIsTreeLoading(false);
    }
  }

  // Filtrare locală multi-metodă instantanee (Case Insensitive)
  const filteredParts = parts.filter((part) => {
    if (!searchTerm.trim()) return true;
    const normSearch = searchTerm.toLowerCase();
    return (
      String(part.endr_code || "")
        .toLowerCase()
        .includes(normSearch) ||
      String(part.specification || "")
        .toLowerCase()
        .includes(normSearch) ||
      String(part.manufacturer || "")
        .toLowerCase()
        .includes(normSearch) ||
      String(part.part_number || "")
        .toLowerCase()
        .includes(normSearch)
    );
  });

  async function handleDeleteAllChildren() {
    if (!currentNode) return;
    if (
      !window.confirm(
        "Are you sure you want to delete all structural subassemblies under this node?",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("equipment_nodes")
        .delete()
        .eq("parent_id", currentNode.id);

      if (error) throw error;
      alert("All structural children nodes have been deleted successfully.");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      alert("Eroare la ștergerea nodurilor structurale: " + error.message);
    }
  }
  async function handleGenerateStandardStructure() {
    if (
      !confirm(
        "Sigur doriți să generați structura standard pentru acest utilaj?",
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
          "Eroare: Există deja noduri rădărnă configurate pentru acest utilaj.",
        );
        return;
      }

      let standardDisciplines = [];
      if (cleanToolNumber.toUpperCase().startsWith("APR-")) {
        standardDisciplines = [
          { node_name: "MECHANICAL", node_type: "Mechanical", sort_order: 10 },
          { node_name: "ELECTRICAL", node_type: "Electrical", sort_order: 20 },
          { node_name: "HYDRAULIC", node_type: "Hydraulic", sort_order: 30 },
          { node_name: "NUT FEEDER", node_type: "Nut Feeder", sort_order: 40 },
          {
            node_name: "CONSUMABLES",
            node_type: "Consumables",
            sort_order: 50,
          },
        ];
      } else {
        standardDisciplines = [
          { node_name: "ELECTRICAL", node_type: "Electrical", sort_order: 10 },
          { node_name: "HYDRAULIC", node_type: "Hydraulic", sort_order: 20 },
          { node_name: "MECHANICAL", node_type: "Mechanical", sort_order: 30 },
        ];
      }

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
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      alert("Eroare la generarea structurii: " + error.message);
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
      !confirm(
        `Generați subansamblele structurale standard pentru PRESS > ${systemType}?`,
      )
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

      alert("Structural Assembly Generated Successfully.");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      alert("Eroare la generarea subansamblelor: " + error.message);
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
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      alert("Eroare la salvarea nodului structural: " + error.message);
    }
  }
  async function handleDeleteNode(nodeId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !confirm(
        "Sigur doriți să ștergeți acest nod structural și subansamblele sale?",
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
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      alert("Eroare la ștergerea nodului structural: " + error.message);
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
      console.error("FULL ERROR:", error);
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Locație Depozitare
            </p>
            <p className="text-lg font-black text-slate-800 mt-1">
              {tool?.kardex_shelf
                ? `ENDR Warehouse Kashif ${tool.kardex_shelf}`
                : "Nalocat"}
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
              currentLevelNodes.length === 0 &&
              ![
                "MECHANICAL",
                "ELECTRICAL",
                "HYDRAULIC",
                "NUT FEEDER",
                "CONSUMABLES",
              ].includes(String(currentNode.node_name).toUpperCase()) && (
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
                Nu există noduri în structură. Utilizați configuratorul rapid
                standard.
              </div>
            )
          )}
        </div>
      </div>
      {currentNode &&
        [
          "MECHANICAL",
          "ELECTRICAL",
          "HYDRAULIC",
          "NUT FEEDER",
          "CONSUMABLES",
        ].includes(String(currentNode.node_name).toUpperCase()) && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Spare Parts — {currentNode.node_name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Componente citite în timp real din tabela master globală.
                </p>
              </div>
              <div className="w-full sm:w-72 relative">
                <input
                  type="text"
                  placeholder="Caută după Cod, Specificație, Producător..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">
                  🔍
                </span>
              </div>
            </div>
            <div className="p-6">
              {filteredParts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                        <th className="py-3 px-4">ENDR Code</th>
                        <th className="py-3 px-4">Specification</th>
                        <th className="py-3 px-4">Manufacturer</th>
                        <th className="py-3 px-4 text-center">Stock</th>
                        <th className="py-3 px-4">Kardex Shelf</th>
                        <th className="py-3 px-4 text-right">Datasheet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {filteredParts.map((part) => (
                        <tr
                          key={part.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {part.endr_code}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {part.specification || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {part.manufacturer || "Unknown"}
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
                            <button
                              onClick={() => {
                                if (part.datasheet_url?.trim()) {
                                  let url = part.datasheet_url.trim();
                                  if (
                                    !url.startsWith("http://") &&
                                    !url.startsWith("https://")
                                  ) {
                                    url = `https://${url}`;
                                  }
                                  window.open(
                                    url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                  return;
                                }
                                const searchQuery = encodeURIComponent(
                                  `${part.manufacturer || ""} ${part.part_number || ""} ${part.specification || ""}`,
                                );

                                window.open(
                                  `https://www.google.com/search?q=${searchQuery}`,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }}
                              className={`inline-flex items-center px-2 py-1.5 border shadow-sm text-xs font-bold rounded-lg transition-colors ${part.datasheet_url ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"}`}
                              title={
                                part.datasheet_url
                                  ? "Deschide fișa tehnică"
                                  : "Caută pe Google"
                              }
                            >
                              📋{" "}
                              <span className="ml-1">
                                {part.datasheet_url ? "Sheet" : "Doc"}
                              </span>
                            </button>

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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400 font-medium">
                  Nu s-a găsit nicio piesă care să corespundă criteriilor de
                  căutare.
                </div>
              )}
            </div>
          </div>
        )}
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
    </div>
  );
}
