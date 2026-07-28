"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation"; // 1. Importăm routerul Next.js

interface Tool {
  id: number;
  created_at: string;
  tool_number: string | null;
  kardex_shelf: number | null;
  status: string | null;
}

interface ActiveRepair {
  tool_number: string | null;
  status: string | null;
}

export default function ToolsPage() {
  const router = useRouter(); // 2. Inițializăm routerul pentru navigare
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeRepairs, setActiveRepairs] = useState<ActiveRepair[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadToolsAndRepairs() {
      try {
        setIsLoading(true);
        const [toolsRes, repairsRes] = await Promise.all([
          supabase.from("tools").select("*").order("id", { ascending: true }),
          supabase.from("repairs").select("tool_number, status").not("status", "ilike", "closed")
        ]);

        if (toolsRes.error) throw toolsRes.error;
        if (repairsRes.error) throw repairsRes.error;

        if (toolsRes.data) setTools(toolsRes.data);
        if (repairsRes.data) setActiveRepairs(repairsRes.data);
      } catch (error: any) {
        console.error("Eroare la încărcarea datelor:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadToolsAndRepairs();
  }, []);

  const filteredTools = tools.filter((tool) => {
    const term = searchTerm.toLowerCase();
    
    const activeTicket = activeRepairs.find(
      (r) => r.tool_number?.toLowerCase().trim() === tool.tool_number?.toLowerCase().trim()
    );
    const dynamicStatus = activeTicket ? activeTicket.status : (tool.status || "Available");

    return (
      tool.tool_number?.toLowerCase().includes(term) ||
      tool.id.toString().includes(term) ||
      dynamicStatus?.toLowerCase().includes(term)
    );
  });

  const localeFormat = "ro-RO";
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
                filteredTools.map((tool) => {
                  const activeTicket = activeRepairs.find(
                    (r) => r.tool_number?.toLowerCase().trim() === tool.tool_number?.toLowerCase().trim()
                  );
                  
                  const displayStatus = activeTicket ? activeTicket.status : "Available";
                  const isAvailable = displayStatus === "Available" || displayStatus === "Disponibil";

                  return (
                    /* CORECȚIE AICI: Schimbat ruta din "/tools/" în "/tool/" conform structurii tale din VS Code */
                    <tr 
                    key={tool.id} 
                    onClick={() => {
                      if (tool.tool_number) {
                        // Trimitem codul matriței ca un query parameter curat (?number=...)
                        router.push(`/tool?number=${encodeURIComponent(tool.tool_number.trim())}`);
                      }
                    }}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    title={`Apasă pentru a deschide fișa sculei ${tool.tool_number}`}
                  >

                      <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600 group-hover:text-indigo-600">
                        #{tool.id}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900 group-hover:text-indigo-950">
                        {tool.tool_number || "Fără Denumire"}
                      </td>
                      <td className="py-4 px-6 font-mono text-gray-600">
                        {tool.kardex_shelf !== null ? `Raft ${tool.kardex_shelf}` : "Nalocat"}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-xs">
                        {new Date(tool.created_at).toLocaleDateString(localeFormat)}
                      </td>
                    </tr>
                  );
                })
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
