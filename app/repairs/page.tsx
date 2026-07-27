"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useRepairsData, Repair } from "@/lib/useRepairsData";
import { useSidebarAuth } from "@/lib/useSidebarAuth";
import RepairForm from "@/components/RepairForm";

export default function RepairsPage() {
  const { t } = useLanguage();
  
  // Preluăm permisiunile și rolul utilizatorului logat
  const { permissions } = useSidebarAuth();
  const isAdmin = permissions?.role === "admin";

  const { 
    repairs, dbTools, dbTechs, dbParts, isLoading, isSaving, 
    createRepair, updateRepairStatus, exportToExcel, deleteRepair 
  } = useRepairsData(t.alertFields, t.alertSuccess);

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
    return (
      <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">
        Loading ToolShop Pro OS...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.repTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">{t.repSub}</p>
      </div>

      <RepairForm 
        t={t} 
        isSaving={isSaving} 
        dbTools={dbTools} 
        dbTechs={dbTechs} 
        dbParts={dbParts} 
        onSubmit={createRepair} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => {
          const columnRepairs = getRepairsByStatus(col.id);
          return (
            <div key={col.id} className={`p-4 bg-white border border-slate-200/80 border-t-4 ${col.color} rounded-2xl shadow-sm space-y-4`}>
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-slate-800">{col.title}</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {columnRepairs.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {columnRepairs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">{t.noRepairs}</p>
                ) : (
                  columnRepairs.map((repair: Repair) => (
                    <div key={repair.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded-md">
                            № {repair.tool_number}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            repair.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-slate-200 text-slate-600"
                          }`}>
                            {repair.priority === "High" ? t.priorityHigh : repair.priority === "Low" ? t.priorityLow : t.priorityMedium}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium mt-2 line-clamp-2">{repair.failure}</p>
                      </div>

                      <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                        <p>🧑‍🔧 {repair.technician || "Nalocat"}</p>
                        {repair.replaced_part && <p>📦 {repair.replaced_part}</p>}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => exportToExcel(repair.id)}
                            className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                          >
                            📄 {t.btnExport}
                          </button>

                          {/* Butonul de ștergere securizat prin GPO (Admin Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => deleteRepair(repair.id)}
                              className="px-2 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                              title="Șterge definitiv acest tichet"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {col.id === "New" && (
                            <button onClick={() => updateRepairStatus(repair.id, "In Progress")} className="px-2 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">➔</button>
                          )}
                          {col.id === "In Progress" && (
                            <button onClick={() => updateRepairStatus(repair.id, "Testing")} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">➔</button>
                          )}
                          {col.id === "Testing" && (
                            <button onClick={() => updateRepairStatus(repair.id, "Closed")} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">✓</button>
                          )}
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
    </div>
  );
}
