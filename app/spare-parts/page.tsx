"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SparePart {
  id: number;
  created_at: string;
  tool_number: string | null;
  endr_code: string | null;
  specification: string | null;
  kardex_shelf: number | null;
  stock_type: string | null;
  st_ns: string | null;
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Paginare simplă client-side pentru performanță
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    async function loadSpareParts() {
      try {
        setIsLoading(true);
        // Preluăm piesele ordonate după cod
        const { data, error } = await supabase
          .from("spare_parts")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        if (data) setParts(data);
      } catch (error: any) {
        console.error("Eroare la încărcarea pieselor de schimb:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadSpareParts();
  }, []);

  // Resetăm pagina curentă la 1 când utilizatorul caută ceva
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Căutare dinamică în textul specificației, codului sau modelului de sculă
  const filteredParts = parts.filter((part) => {
    const term = searchTerm.toLowerCase();
    return (
      part.specification?.toLowerCase().includes(term) ||
      part.endr_code?.toLowerCase().includes(term) ||
      part.tool_number?.toLowerCase().includes(term)
    );
  });

  // Calcul paginare
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredParts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Antet Pagina */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Management Piese de Schimb
        </h1>
        <p className="text-gray-500 mt-1">
          Afișarea celor {parts.length.toLocaleString("ro-RO")} componente stocate în tabela ta din Supabase.
        </p>
      </div>

      {/* Bară de căutare */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          type="text"
          placeholder="Caută după Specificație, Cod ENDR sau Tool Number..."
          className="w-full md:w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {/* Tabel Date */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Cod ENDR</th>
                <th className="py-4 px-6">Specificație / Denumire</th>
                <th className="py-4 px-6">Compatibilitate (Tool №)</th>
                <th className="py-4 px-6">Locație (Kardex)</th>
                <th className="py-4 px-6">Tip Stoc</th>
                <th className="py-4 px-6">Status / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Se încarcă baza de date cu piese (4.843 repere)...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600">
                      {part.endr_code || "FĂRĂ COD"}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900 max-w-xs truncate">
                      {part.specification || "-"}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 font-mono">
                      {part.tool_number || "Universală"}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-500">
                      {part.kardex_shelf !== null ? `Raft ${part.kardex_shelf}` : "-"}
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                        {part.stock_type || "Nespecificat"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      {part.st_ns || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nicio piesă de schimb găsită pentru criteriile selectate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Control Paginare */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-slate-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Se afișează reperele {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredParts.length)} din {filteredParts.length} filtrate
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                Anterior
              </button>
              <span className="text-xs font-medium self-center px-2">
                Pagina {currentPage} din {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                Următor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
