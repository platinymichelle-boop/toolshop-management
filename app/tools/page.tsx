"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Tool {
  id: number;
  created_at: string;
  tool_number: string | null;
  kardex_shelf: number | null;
  status: string | null;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTools() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("tools")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        if (data) setTools(data);
      } catch (error: any) {
        console.error("Eroare la încărcarea sculelor:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadTools();
  }, []);

  // Căutare dinamică bazată pe codul/numele sculei introduse
  const filteredTools = tools.filter((tool) => {
    const term = searchTerm.toLowerCase();
    return (
      tool.tool_number?.toLowerCase().includes(term) ||
      tool.id.toString().includes(term) ||
      tool.status?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Antet */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Inventar Scule
        </h1>
        <p className="text-gray-500 mt-1">
          Afișarea celor {tools.length} înregistrări stocate în tabela ta din Supabase.
        </p>
      </div>

      {/* Căutare */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          type="text"
          placeholder="Caută după Tool Number, ID sau Status..."
          className="w-full md:w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabel Date */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">ID Sistem</th>
                <th className="py-4 px-6">Tool Number</th>
                <th className="py-4 px-6">Raft (Kardex Shelf)</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Dată Înregistrare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Se preiau datele din Supabase...
                  </td>
                </tr>
              ) : filteredTools.length > 0 ? (
                filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600">
                      #{tool.id}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {tool.tool_number || "Fără Denumire"}
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-600">
                      {tool.kardex_shelf !== null ? `Raft ${tool.kardex_shelf}` : "Nalocat"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        tool.status === "Disponibil" || tool.status === "Available"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {tool.status || "Nespecificat"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      {new Date(tool.created_at).toLocaleDateString("ro-RO")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Nu s-au găsit echipamente conform căutării.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
