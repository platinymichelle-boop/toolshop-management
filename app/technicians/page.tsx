"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";

interface Technician {
  id: number;
  created_at: string;
  name: string | null;
  active: boolean | null;
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );

  // Funcție pentru generarea avatarului din inițiale
  const getInitials = (name: string | null) => {
    if (!name) return "T";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  async function loadTechnicians() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) setTechnicians(data);
    } catch (error: any) {
      console.error("Eroare la încărcarea tehnicienilor:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function handleAddTechnician(e: React.FormEvent) {
    e.preventDefault();
    if (!newTechName.trim()) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.from("technicians").insert({
        name: newTechName.trim(),
        active: true,
      });

      if (error) throw error;

      setNewTechName("");
      loadTechnicians();
    } catch (error: any) {
      alert("Eroare la salvare: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActiveStatus(id: number, currentStatus: boolean | null) {
    try {
      const nextStatus = currentStatus === null ? false : !currentStatus;
      const { error } = await supabase
        .from("technicians")
        .update({ active: nextStatus })
        .eq("id", id);

      if (error) throw error;

      setTechnicians((prev) =>
        prev.map((t) => (t.id === id ? { ...t, active: nextStatus } : t)),
      );
    } catch (error: any) {
      alert("Nu s-a putut schimba statusul: " + error.message);
    }
  }

  async function handleDeleteTechnician(id: number, name: string | null) {
    if (
      !window.confirm(
        `Sigur doriți să îl ștergeți pe tehnicianul ${name || ""} din baza de date?`,
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("technicians")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTechnicians((prev) => prev.filter((t) => t.id !== id));
    } catch (error: any) {
      alert("Eroare la ștergere: " + error.message);
    }
  }

  // Numărători pentru filtrele rapide
  const totalCount = technicians.length;
  const activeCount = technicians.filter((t) => t.active).length;
  const inactiveCount = totalCount - activeCount;

  const filteredTechnicians = technicians.filter((t) => {
    if (activeTab === "ACTIVE") return t.active;
    if (activeTab === "INACTIVE") return !t.active;
    return true;
  });
  return (
    <div className="space-y-8 pb-12 font-sans antialiased max-w-7xl mx-auto p-1 md:p-4">
      {/* Antet Secțiune Premium */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:justify-between md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Gestiune Resurse Umane
          </span>
          <h1 className="text-3xl font-black mt-2 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Echipa de Tehnicieni
          </h1>
          <p className="text-slate-400 mt-1 text-xs max-w-xl">
            Administrează membrii echipei din atelier, stările de activitate și
            drepturile de alocare pe tichete active.
          </p>
        </div>
        <div className="text-3xl p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-inner select-none self-start md:self-auto relative z-10">
          🔧
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5 text-[14rem] font-black pointer-events-none select-none">
          🛠️
        </div>
      </div>

      {/* Formular Adăugare Rapidă Modernizat */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md max-w-xl">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-500" />
          Înregistrează un tehnician nou
        </h2>
        <form onSubmit={handleAddTechnician} className="flex gap-3">
          <input
            type="text"
            placeholder="Ex: Popescu Ioan"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
            value={newTechName}
            onChange={(e) => setNewTechName(e.target.value)}
            disabled={isSaving}
          />
          <button
            type="submit"
            disabled={isSaving || !newTechName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 font-bold px-5 py-2.5 rounded-xl text-xs text-white transition-all shadow-sm flex items-center justify-center min-w-[100px] border border-indigo-500/20 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adaugă"}
          </button>
        </form>
      </div>

      {/* Zonă Filtre & Listă */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "ALL" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Toți ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "ACTIVE" ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:bg-emerald-50/50 hover:text-emerald-600"}`}
            >
              Activi ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab("INACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "INACTIVE" ? "bg-slate-500 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Inactivi ({inactiveCount})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium p-4 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Se ordonează echipa tehnică...</span>
          </div>
        ) : filteredTechnicians.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((tech) => (
              <div
                key={tech.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex items-center justify-between group hover:border-indigo-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    {getInitials(tech.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {tech.name || "Fără nume"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(tech.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActiveStatus(tech.id, tech.active)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 ${
                      tech.active
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/80"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tech.active ? (
                      <UserCheck className="w-3 h-3" />
                    ) : (
                      <UserX className="w-3 h-3" />
                    )}
                    {tech.active ? "Activ" : "Inactiv"}
                  </button>

                  <button
                    onClick={() => handleDeleteTechnician(tech.id, tech.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Șterge tehnician"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            Niciun tehnician nu corespunde selecției.
          </div>
        )}
      </div>
    </div>
  );
}
