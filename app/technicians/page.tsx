"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  // Funcție pentru încărcarea echipei din Supabase
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

  // Funcție pentru adăugarea unui nou tehnician
  async function handleAddTechnician(e: React.FormEvent) {
    e.preventDefault();
    if (!newTechName.trim()) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("technicians")
        .insert({
          name: newTechName.trim(),
          active: true, // Implicit este setat ca activ
        });

      if (error) throw error;

      setNewTechName("");
      alert("Tehnicianul a fost adăugat!");
      loadTechnicians(); // Reîncărcăm lista live
    } catch (error: any) {
      alert("Eroare la salvare: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Funcție rapidă pentru activarea/dezactivarea unui tehnician (schimbă statusul în baza de date)
  async function toggleActiveStatus(id: number, currentStatus: boolean | null) {
    try {
      const nextStatus = currentStatus === null ? false : !currentStatus;
      const { error } = await supabase
        .from("technicians")
        .update({ active: nextStatus })
        .eq("id", id);

      if (error) throw error;
      
      // Actualizăm local starea ca să se vadă instant pe ecran
      setTechnicians(prev => 
        prev.map(t => t.id === id ? { ...t, active: nextStatus } : t)
      );
    } catch (error: any) {
      alert("Nu s-a putut schimba statusul: " + error.message);
    }
  }

  return (
    <div className="space-y-8">
      {/* Antet */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Echipa de Tehnicieni
        </h1>
        <p className="text-gray-500 mt-1">
          Administrează membrii echipei din atelier și dreptul lor de a prelua tichete.
        </p>
      </div>

      {/* Formular Adăugare Rapidă */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm max-w-xl">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">➕ Înregistrează un tehnician nou</h2>
        <form onSubmit={handleAddTechnician} className="flex gap-3">
          <input
            type="text"
            placeholder="Nume și prenume tehnician..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
            value={newTechName}
            onChange={(e) => setNewTechName(e.target.value)}
            disabled={isSaving}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isSaving ? "Se salvează..." : "Adaugă"}
          </button>
        </form>
      </div>

      {/* Grid Tehnicieni */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Membrii activi ({technicians.length})</h2>
        
        {isLoading ? (
          <p className="text-sm text-gray-400">Se încarcă lista de tehnicieni...</p>
        ) : technicians.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((tech) => (
              <div 
                key={tech.id} 
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                    🧑‍🔧
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tech.name || "Fără nume"}</h3>
                    <p className="text-xs text-gray-400">Înregistrat la: {new Date(tech.created_at).toLocaleDateString("ro-RO")}</p>
                  </div>
                </div>

                {/* Buton status Activ / Inactiv */}
                <button
                  onClick={() => toggleActiveStatus(tech.id, tech.active)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    tech.active 
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tech.active ? "● Activ" : "○ Inactiv"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed rounded-xl p-8 text-center text-gray-400 text-sm">
            Nu există niciun tehnician înregistrat în baza de date.
          </div>
        )}
      </div>
    </div>
  );
}
