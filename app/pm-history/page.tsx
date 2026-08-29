"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  Calendar,
  User,
  Mail,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  FileText,
} from "lucide-react";

// Interfața actualizată conform noii structuri pm_history pentru trasabilitate
interface PMHistoryItem {
  id: string;
  created_at: string;
  pm_task_id: string;
  tool_number: string;
  equipment: string;
  sub_equipment: string;
  action: string;
  completed_by: string; // Numele real al tehnicianului
  user_email: string; // Email-ul de audit al utilizatorului autentificat
  result: "COMPLETED" | "FAILED" | "PENDING" | string;
  remarks?: string;
}

type SortField = keyof PMHistoryItem;
type SortOrder = "asc" | "desc";

export default function PMHistoryAuditPage() {
  const [data, setData] = useState<PMHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Stări pentru filtre, sortare și paginare
  const [filterCompletedBy, setFilterCompletedBy] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Stare pentru gestionarea modalului de detalii audit
  const [selectedItem, setSelectedItem] = useState<PMHistoryItem | null>(null);

  // Preluarea datelor din tabela actualizată pm_history
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pmData, error } = await supabase
        .from("pm_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setData(pmData || []);
    } catch (err) {
      console.error("Eroare la încărcarea jurnalului de audit PM:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Liste unice extrase dinamic pentru filtrele rapide
  const uniqueTechnicians = useMemo(() => {
    const techs = data.map((item) => item.completed_by).filter(Boolean);
    return Array.from(new Set(techs));
  }, [data]);

  const uniqueResults = useMemo(() => {
    const results = data.map((item) => item.result).filter(Boolean);
    return Array.from(new Set(results));
  }, [data]);
  // Calcul indicatori KPI pe baza datelor din tabel
  const kpis = useMemo(() => {
    const total = data.length;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const executedThisMonth = data.filter((item) => {
      const d = new Date(item.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const uniqueTechsCount = uniqueTechnicians.length;
    const tasks = data.map((item) => item.pm_task_id).filter(Boolean);
    const uniqueTasksCount = Array.from(new Set(tasks)).length;

    return { total, executedThisMonth, uniqueTechsCount, uniqueTasksCount };
  }, [data, uniqueTechnicians]);

  // Logica de procesare a datelor (Căutare Globală, Filtrare, Sortare)
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    if (search.trim() !== "") {
      const query = search.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(query),
        ),
      );
    }

    if (filterCompletedBy !== "all") {
      result = result.filter((item) => item.completed_by === filterCompletedBy);
    }

    if (filterResult !== "all") {
      result = result.filter((item) => item.result === filterResult);
    }

    result.sort((a, b) => {
      if (sortField === "created_at") {
        return sortOrder === "asc"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      let valA = a[sortField] ? String(a[sortField]).toLowerCase() : "";
      let valB = b[sortField] ? String(b[sortField]).toLowerCase() : "";

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, search, filterCompletedBy, filterResult, sortField, sortOrder]);

  // Logica de paginare
  const totalPages =
    Math.ceil(filteredAndSortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Funcție utilitară pentru randarea stilizată a badge-urilor de status
  const renderResultBadge = (result: string) => {
    const normalized = String(result).toUpperCase();
    if (
      normalized === "COMPLETED" ||
      normalized === "PASS" ||
      normalized === "OK"
    ) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
          COMPLETED
        </span>
      );
    }
    if (normalized === "FAILED" || normalized === "FAIL") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        PENDING
      </span>
    );
  };
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header Panou Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Jurnal Audit PM History
          </h1>
          <p className="text-slate-500 mt-1">
            Trasabilitate completă și verificare identitate tehnicieni.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizează Datele
        </button>
      </div>

      {/* Secțiune KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total PM Executat
            </p>
            <p className="text-2xl font-bold text-slate-900">{kpis.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Luna Aceasta</p>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.executedThisMonth}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Tehnicieni Unici
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.uniqueTechsCount}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Task-uri PM Unice
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {kpis.uniqueTasksCount}
            </p>
          </div>
        </div>
      </div>

      {/* Căutare și Filtrare avansată */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Caută tehnician, email, echipament..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterCompletedBy}
              onChange={(e) => {
                setFilterCompletedBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-48 p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tehnician: Toți</option>
              {uniqueTechnicians.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterResult}
            onChange={(e) => {
              setFilterResult(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-44 p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Rezultat: Toate</option>
            {uniqueResults.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Tabel Date Jurnal Audit */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {[
                  { label: "Dată Execuție", field: "created_at" },
                  { label: "PM Task ID", field: "pm_task_id" },
                  { label: "Tool Number", field: "tool_number" },
                  { label: "Echipament", field: "equipment" },
                  { label: "Sub Echipament", field: "sub_equipment" },
                  { label: "Technician Name", field: "completed_by" },
                  { label: "User Email", field: "user_email" },
                  { label: "Rezultat", field: "result" },
                ].map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field as SortField)}
                    className="p-4 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.field ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Se încarcă datele de audit...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nu s-au găsit înregistrări în istoric.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 whitespace-nowrap font-medium">
                      {new Date(item.created_at).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="p-4 whitespace-nowrap">{item.pm_task_id}</td>
                    <td className="p-4 whitespace-nowrap font-mono text-xs">
                      {item.tool_number}
                    </td>
                    <td className="p-4 whitespace-nowrap">{item.equipment}</td>
                    <td className="p-4 whitespace-nowrap">
                      {item.sub_equipment}
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium text-slate-900">
                      {item.completed_by || "-"}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500">
                      {item.user_email || "-"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {renderResultBadge(item.result)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginare Componentă */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
          <p className="text-xs text-slate-500">
            Afișare{" "}
            <span className="font-semibold">{paginatedData.length}</span> din{" "}
            <span className="font-semibold">
              {filteredAndSortedData.length}
            </span>{" "}
            înregistrări
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700">
              Pagina {currentPage} din {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || loading}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detalii Trasabilitate & Audit complet */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Wrench className="w-5 h-5 text-blue-600" />
                <span>Detalii Audit Tichet PM</span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-medium">
                  Dată Execuție:
                </span>
                <span className="col-span-2 font-medium text-slate-900">
                  {new Date(selectedItem.created_at).toLocaleDateString(
                    "ro-RO",
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-medium">Tool Number:</span>
                <span className="col-span-2 font-mono text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded w-max">
                  {selectedItem.tool_number}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-medium">Echipament:</span>
                <span className="col-span-2 text-slate-900 font-medium">
                  {selectedItem.equipment}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-medium">
                  Sub Echipament:
                </span>
                <span className="col-span-2 text-slate-900">
                  {selectedItem.sub_equipment || "-"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-medium">
                  Acțiune Executată:
                </span>
                <span className="col-span-2 text-slate-900 italic">
                  "{selectedItem.action}"
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 items-center">
                <span className="text-slate-400 font-medium">
                  Technician Name:
                </span>
                <span className="col-span-2 flex items-center gap-1.5 font-semibold text-slate-900">
                  <User className="w-4 h-4 text-purple-500" />{" "}
                  {selectedItem.completed_by}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 items-center">
                <span className="text-slate-400 font-medium">User Email:</span>
                <span className="col-span-2 flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                  <Mail className="w-4 h-4 text-blue-500" />{" "}
                  {selectedItem.user_email}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 items-center">
                <span className="text-slate-400 font-medium">Rezultat:</span>
                <span className="col-span-2">
                  {renderResultBadge(selectedItem.result)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-slate-400 font-medium">
                  Remarks / Observații Audit:
                </span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 min-h-[60px] text-slate-700 text-xs whitespace-pre-wrap">
                  {selectedItem.remarks ||
                    "Nu au fost adăugate observații adiționale la finalizarea acestui PM."}
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Închide Verificarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
