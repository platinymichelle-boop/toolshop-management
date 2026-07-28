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
  stock_quantity?: number;
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);
  
  // LOGICĂ NOUĂ: Gestiune Paginare direct pe Server
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0); // Păstrează numărul total real (4.843)
  const itemsPerPage = 50;

  // Funcție optimizată care aduce doar intervalul de 50 de piese cerut și numără restul
  async function loadSpareParts() {
    try {
      setIsLoading(true);
      
      // Calculăm rândurile exacte de pornire și oprire pentru baza de date
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Construim interogarea de bază
      let query = supabase
        .from("spare_parts")
        .select("*", { count: "exact" }) // { count: "exact" } ne dă numărul total din spate (4.843)
        .order("id", { ascending: true })
        .range(from, to); // Îi cerem serverului doar feliile de 50 de rânduri

      // Dacă utilizatorul caută ceva, lăsăm Supabase să filtreze direct pe server în loc de JS client
      if (searchTerm.trim() !== "") {
        const cleanTerm = `%${searchTerm.trim()}%`;
        query = query.or(`specification.ilike.${cleanTerm},endr_code.ilike.${cleanTerm},tool_number.ilike.${cleanTerm}`);
      }

      const { data, count, error } = await query;

      if (error) throw error;
      
      if (data) setParts(data);
      if (count !== null) setTotalCount(count); // Salvăm numărul total real din Supabase
    } catch (error: any) {
      console.error("Eroare la încărcarea pieselor de schimb:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Declanșăm încărcarea la schimbarea paginii sau la finalizarea căutării
  useEffect(() => {
    loadSpareParts();
  }, [currentPage, searchTerm]);

  // Schimbăm căutarea și resetăm pagina la 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // GESTIUNE STOC LIVE (Rămâne neschimbată și complet funcțională)
  async function handleStockChange(partId: number, currentStock: number, delta: number) {
    try {
      setIsUpdatingStock(partId);
      const newStock = Math.max(0, currentStock + delta);

      const { error } = await supabase
        .from("spare_parts")
        .update({ stock_quantity: newStock })
        .eq("id", partId);

      if (error) throw error;

      setParts(prevParts => 
        prevParts.map(part => 
          part.id === partId ? { ...part, stock_quantity: newStock } : part
        )
      );
    } catch (error: any) {
      alert("Eroare la actualizarea stocului: " + error.message);
    } finally {
      setIsUpdatingStock(null);
    }
  }

  // Variabile de calcul simplificate (deoarece intervalul vine calculat direct de pe server)
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  return (
    <div className="space-y-8">
      {/* Antet Pagina */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Management Piese de Schimb
        </h1>
        <p className="text-gray-500 mt-1">
          Afișarea celor {totalCount.toLocaleString("ro-RO")} componente stocate în tabela ta din Supabase.
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
                <th className="py-4 px-6 text-center w-48">Stoc Disponibil</th>
                <th className="py-4 px-6">Status / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Se încarcă intervalul de piese din Supabase...
                  </td>
                </tr>
              ) : parts.length > 0 ? (
                /* MODIFICAT: Mapăm direct matricea parts returnată curat de server */
                parts.map((part: any) => {
                  const currentQty = part.stock_quantity || 0;
                  const isPending = isUpdatingStock === part.id;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600">
                        {part.endr_code || "FĂRĂ COD"}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900 max-w-xs truncate" title={part.specification || ""}>
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
                      
                      {/* Celulă interactivă pentru controlul stocului live */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockChange(part.id, currentQty, -1)}
                            disabled={isPending || currentQty <= 0}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 shadow-sm disabled:opacity-40"
                            title="Scade o piesă din stoc"
                          >
                            -
                          </button>
                          
                          <span className={`min-w-[65px] text-center font-mono font-black text-xs px-2 py-1 rounded ${
                            currentQty > 0 ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700 animate-pulse"
                          }`}>
                            {isPending ? "..." : `${currentQty} buc`}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStockChange(part.id, currentQty, 1)}
                            disabled={isPending}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 shadow-sm disabled:opacity-40"
                            title="Adaugă o piesă în stoc"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-xs text-gray-500">
                        {part.st_ns || "-"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Nicio piesă de schimb găsită în acest interval sau conform căutării.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Control Paginare de Server */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-slate-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {/* MODIFICAT: Calcul de interval corelat direct cu totalCount global din Supabase */}
              Se afișează reperele {indexOfFirstItem + 1} - {Math.min(indexOfFirstItem + itemsPerPage, totalCount)} din {totalCount} totale
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs font-bold self-center px-2 text-slate-700">
                Pagina {currentPage} din {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
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
