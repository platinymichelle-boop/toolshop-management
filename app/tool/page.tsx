"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function ToolPageContent() {
  const searchParams = useSearchParams();
  const cleanToolNumber = searchParams.get("number")?.trim() || "";

  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<any>(null);
  const [activeRepair, setActiveRepair] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);
  // Stare pentru motorul de căutare piese în timp real
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
      return ["Electrical", "Mechanical", "Hydraulic", "Pneum"];
    }
    if (breadcrumb.length === 2) return ["Assemblies"];
    return ["Assemblies", "Subcomponent"];
  })();

  async function loadLiveToolData() {
    if (!cleanToolNumber) {
      setIsLoading(false);
      return;
    }
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
      setSearchTerm("");

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
    } finally {
      setIsTreeLoading(false);
    }
  }

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
      alert("Eroare la ștergerea nodurilor: " + error.message);
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
      const { data: rootCheck } = await supabase
        .from("equipment_nodes")
        .select("id")
        .eq("tool_number", cleanToolNumber)
        .is("parent_id", null);
      if (rootCheck && rootCheck.length > 0) {
        alert("Eroare: Există deja noduri rădăcină configurate.");
        return;
      }
      let standardDisciplines = cleanToolNumber.toUpperCase().startsWith("APR-")
        ? [
            {
              node_name: "MECHANICAL",
              node_type: "Mechanical",
              sort_order: 10,
            },
            {
              node_name: "ELECTRICAL",
              node_type: "Electrical",
              sort_order: 20,
            },
            { node_name: "HYDRAULIC", node_type: "Hydraulic", sort_order: 30 },
            {
              node_name: "NUT FEEDER",
              node_type: "Nut Feeder",
              sort_order: 40,
            },
            {
              node_name: "CONSUMABLES",
              node_type: "Consumables",
              sort_order: 50,
            },
          ]
        : [
            {
              node_name: "ELECTRICAL",
              node_type: "Electrical",
              sort_order: 10,
            },
            { node_name: "HYDRAULIC", node_type: "Hydraulic", sort_order: 20 },
            {
              node_name: "MECHANICAL",
              node_type: "Mechanical",
              sort_order: 30,
            },
          ];
      const insertPayload = standardDisciplines.map((d) => ({
        tool_number: cleanToolNumber,
        parent_id: null,
        node_name: d.node_name,
        node_type: d.node_type,
        sort_order: d.sort_order,
      }));
      await supabase.from("equipment_nodes").insert(insertPayload);
      alert("Standard Equipment Structure Generated");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare: " + error.message);
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
    if (systemType === "Electrical")
      assembliesToCreate = [
        "CROWN ELECTRIC PIECES",
        "SLIDE ELECTRIC PIECES",
        "PRESS BED ELECTRIC PIECES",
        "PRESS ELECTRIC PIECES",
        "ELECTRIC CABINET",
        "MACHINE PERIPHERY",
      ];
    else if (systemType === "Mechanical")
      assembliesToCreate = [
        "CROWN ASSEMBLY",
        "CLUTCH BRAKE ASSEMBLY",
        "MAIN MOTOR",
        "SLIDE GUIDES",
        "COUNTERBALANCERS",
      ];
    else if (systemType === "Hydraulic")
      assembliesToCreate = [
        "CROWN HYDRAULIC PIECES",
        "CLUTCH BRAKE HYDRAULIC UNIT",
        "LUBRICATION UNIT",
        "CROWN LUBRICATION",
        "SLIDE LUBRICATION",
      ];
    if (assembliesToCreate.length === 0) return;
    try {
      setIsSeeding(true);
      const { data: existingSubNodes } = await supabase
        .from("equipment_nodes")
        .select("node_name")
        .eq("tool_number", cleanToolNumber)
        .eq("parent_id", currentNode.id);
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
      if (insertPayload.length > 0)
        await supabase.from("equipment_nodes").insert(insertPayload);
      alert("Structural Assembly Generated Successfully.");
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare: " + error.message);
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
    setNodeType(allowedNodeTypes || "");
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
        await supabase.from("equipment_nodes").insert([
          {
            tool_number: cleanToolNumber,
            parent_id: parentId,
            node_name: nodeName.trim(),
            node_type: nodeType,
            sort_order: sortOrder,
          },
        ]);
      } else if (modalMode === "edit" && editingNodeId) {
        await supabase
          .from("equipment_nodes")
          .update({
            node_name: nodeName.trim(),
            node_type: nodeType,
            sort_order: sortOrder,
          })
          .eq("id", editingNodeId);
      }
      setIsNodeModalOpen(false);
      await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare salvare: " + error.message);
    }
  }

  async function handleDeleteNode(nodeId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Sigur doriți să ștergeți acest nod structural?")) return;
    try {
      await supabase.from("equipment_nodes").delete().eq("id", nodeId);
      if (currentNode && currentNode.id === nodeId)
        handleBreadcrumbClick(breadcrumb.length - 2);
      else await refreshCurrentTreeLevel(currentNode, breadcrumb);
    } catch (error: any) {
      alert("Eroare ștergere: " + error.message);
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
      await supabase
        .from("spare_parts")
        .update({ stock_quantity: newStock })
        .eq("id", partId);
      setParts((prevParts) =>
        prevParts.map((part) =>
          part.id === partId ? { ...part, stock_quantity: newStock } : part,
        ),
      );
    } catch (error: any) {
      alert("Eroare stoc: " + error.message);
    } finally {
      setIsUpdatingStock(null);
    }
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">
        Se încarcă fișa tehnică live pentru {cleanToolNumber || "utilaj"}...
      </div>
    );
  }

  const dynamicStatus = activeRepair ? activeRepair.status : "Available";
  const statusColor =
    dynamicStatus === "Available"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : dynamicStatus?.toLowerCase() === "new"
        ? "bg-blue-50 text-blue-700 border-blue-200"
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
                ? `ENDR Warehouse Raft ${tool.kardex_shelf}`
                : "Nealocat"}
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
              Navigați și administrați modulele utilajului.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {!currentNode && currentLevelNodes.length === 0 && (
              <button
                onClick={handleGenerateStandardStructure}
                disabled={isSeeding}
                className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
              >
                Generate Standard Structure
              </button>
            )}
            {breadcrumb.length === 2 &&
              breadcrumb[breadcrumb.length - 2]?.node_name === "PRESS" &&
              ["Electrical", "Mechanical", "Hydraulic"].includes(
                currentNode?.node_name,
              ) && (
                <button
                  onClick={handleGenerateAssemblyStructure}
                  disabled={isSeeding}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  Generate Assembly Structure
                </button>
              )}
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
            >
              + Add Node
            </button>
            {breadcrumb.length > 0 && (
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                className="px-3 py-1.5 bg-white border rounded-lg text-xs font-semibold text-slate-600"
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
                  className="bg-rose-600 text-white rounded-lg text-xs font-bold px-3 py-2"
                >
                  Delete Subassemblies
                </button>
              )}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center flex-wrap gap-2 text-xs font-medium text-slate-600">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`hover:text-blue-600 ${breadcrumb.length === 0 ? "font-bold text-blue-600" : ""}`}
          >
            {tool?.tool_number || cleanToolNumber}
          </button>
          {breadcrumb.map((node, index) => (
            <div key={node.id} className="flex items-center gap-2">
              <span className="text-slate-300">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                disabled={index === breadcrumb.length - 1}
                className={`hover:text-blue-600 uppercase ${index === breadcrumb.length - 1 ? "font-bold text-slate-800" : ""}`}
              >
                {node.node_name}
              </button>
            </div>
          ))}
        </div>

        <div className="p-6">
          {isTreeLoading ? (
            <div className="text-center py-4 text-slate-400">Se încarcă...</div>
          ) : currentLevelNodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {currentLevelNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="flex flex-col justify-between p-5 bg-white border rounded-xl relative cursor-pointer group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        {node.node_type || "Subansamblu"}
                      </span>
                      <span className="text-base font-black text-slate-800 uppercase">
                        {node.node_name}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => openEditModal(node, e)}
                        className="p-1 bg-slate-100 rounded text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteNode(node.id, e)}
                        className="p-1 bg-slate-100 rounded text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-right text-xs font-semibold text-slate-400 group-hover:text-blue-500">
                    Explorează →
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !currentNode && (
              <div className="text-center py-6 text-slate-400">
                Nu există noduri.
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
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase">
                Spare Parts — {currentNode.node_name}
              </h2>
              <input
                type="text"
                placeholder="Caută..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-72 p-2 border rounded-xl text-xs"
              />
            </div>
            <div className="p-6 overflow-x-auto">
              {filteredParts.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-[10px] font-bold text-slate-400 uppercase bg-slate-50/70">
                      <th className="p-3">Code</th>
                      <th className="p-3">Specification</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((part) => (
                      <tr
                        key={part.id}
                        className="border-b hover:bg-slate-50/50"
                      >
                        <td className="p-3 font-mono font-bold">
                          {part.endr_code}
                        </td>
                        <td className="p-3 font-semibold">
                          {part.specification || "-"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {part.manufacturer || "Unknown"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-mono">
                            {part.stock_quantity} buc
                          </span>
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <button
                            onClick={() =>
                              window.open(
                                `https://google.com{part.endr_code}`,
                                "_blank",
                              )
                            }
                            className="p-1 border rounded"
                          >
                            📋
                          </button>
                          <div className="inline-flex border rounded bg-white p-0.5 shadow-sm">
                            <button
                              onClick={() =>
                                handleStockChange(
                                  part.id,
                                  part.stock_quantity,
                                  -1,
                                )
                              }
                              className="px-2 text-xs font-bold"
                            >
                              -1
                            </button>
                            <button
                              onClick={() =>
                                handleStockChange(
                                  part.id,
                                  part.stock_quantity,
                                  1,
                                )
                              }
                              className="px-2 text-xs font-bold"
                            >
                              +1
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  Nicio piesă găsită.
                </div>
              )}
            </div>
          </div>
        )}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800 uppercase">
            Istoric Intervenții
          </h2>
        </div>
        <div className="overflow-x-auto">
          {repairHistory.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              Nu există reparații.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-[10px] font-bold text-slate-400 bg-slate-50/70">
                  <th className="p-3">ID</th>
                  <th className="p-3">Failure</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {repairHistory.map((rep) => (
                  <tr key={rep.id} className="border-b hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-xs">#{rep.id}</td>
                    <td className="p-3 font-medium">{rep.failure}</td>
                    <td className="p-3">{rep.technician || "Nealocat"}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100">
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border">
            <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-sm uppercase">
                {modalMode === "create" ? "Add New Node" : "Edit Node"}
              </h3>
              <button
                onClick={() => setIsNodeModalOpen(false)}
                className="text-slate-400 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveNode} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Node Name
                </label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Node Type
                </label>
                <select
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value)}
                  disabled={modalMode === "edit"}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Parent Node ID
                  </label>
                  <input
                    type="text"
                    value={parentId || "Root (None)"}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-400"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNodeModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
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

export default function ToolPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-slate-400">
          Loading Base Systems...
        </div>
      }
    >
      <ToolPageContent />
    </Suspense>
  );
}
