"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [searchInputValue, setSearchInputValue] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LOGICĂ PAGINARE
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Efect de Debounce pentru căutare
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchInputValue);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInputValue]);

  // Funcție stabilă pentru încărcarea datelor cu suport de Retry și Error UI
  const loadSpareParts = useCallback(
    async (isMounted: { active: boolean }) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let query = supabase
          .from("spare_parts")
          .select("*", { count: "exact" })
          .order("id", { ascending: true })
          .range(from, to);

        if (debouncedSearchTerm.trim() !== "") {
          const cleanTerm = `%${debouncedSearchTerm.trim()}%`;
          query = query.or(
            `specification.ilike.${cleanTerm},endr_code.ilike.${cleanTerm},tool_number.ilike.${cleanTerm}`,
          );
        }

        const { data, count, error } = await query;

        if (error) throw error;

        if (isMounted.active) {
          if (data) setParts(data as SparePart[]);
          if (count !== null) setTotalCount(count);
        }
      } catch (error: any) {
        console.error("Eroare la încărcarea pieselor:", error.message);
        if (isMounted.active) {
          setErrorMessage(
            "Nu s-au putut încărca datele din Supabase. Verificați conexiunea la internet.",
          );
        }
      } finally {
        if (isMounted.active) {
          setIsLoading(false);
        }
      }
    },
    [currentPage, debouncedSearchTerm, itemsPerPage],
  );

  useEffect(() => {
    const isMounted = { active: true };
    loadSpareParts(isMounted);

    return () => {
      isMounted.active = false;
    };
  }, [loadSpareParts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };

  // GESTIUNE STOC LIVE optimizată împotriva acțiunilor repetate
  async function handleStockChange(
    partId: number,
    currentStock: number,
    delta: number,
  ) {
    if (isUpdatingStock !== null) return; // Blochează alte modificări simultane

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
      alert("Eroare la actualizarea stocului: " + error.message);
    } finally {
      setIsUpdatingStock(null);
    }
  }

  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-6">
      {/* Antet Pagina */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Management Piese de Schimb
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Afișarea celor{" "}
            <strong className="text-slate-800">
              {totalCount.toLocaleString("ro-RO")}
            </strong>{" "}
            componente din baza de date.
          </p>
        </div>
      </div>
      {/* Bară de căutare și Alerte */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <input
            type="text"
            placeholder="Caută după Specificație, Cod ENDR sau Tool Number..."
            className="w-full md:w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchInputValue}
            onChange={handleSearchChange}
          />
          {searchInputValue && (
            <button
              onClick={() => setSearchInputValue("")}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium underline"
            >
              Șterge
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => loadSpareParts({ active: true })}
              className="bg-white border border-rose-200 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Reîncearcă
            </button>
          </div>
        )}
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
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-48"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-12"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-20"></div>
                    </td>
                    <td className="py-4 px-6 flex justify-center">
                      <div className="h-7 bg-slate-100 rounded-lg w-28"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </td>
                  </tr>
                ))
              ) : parts.length > 0 ? (
                parts.map((part: SparePart) => {
                  const currentQty = part.stock_quantity || 0;
                  const isPending = isUpdatingStock === part.id;

                  return (
                    <tr
                      key={part.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600">
                        {part.endr_code || "FĂRĂ COD"}
                      </td>
                      <td
                        className="py-4 px-6 font-medium text-slate-900 max-w-xs truncate"
                        title={part.specification || ""}
                      >
                        {part.specification || "-"}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-600 font-mono">
                        {part.tool_number || "Universală"}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">
                        {part.kardex_shelf !== null
                          ? `Raft ${part.kardex_shelf}`
                          : "-"}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                          {part.stock_type || "Nespecificat"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleStockChange(part.id, currentQty, -1)
                            }
                            disabled={
                              isPending ||
                              currentQty <= 0 ||
                              isUpdatingStock !== null
                            }
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 disabled:opacity-40"
                          >
                            -
                          </button>
                          <span
                            className={`min-w-[75px] text-center font-mono font-bold text-xs px-2 py-1 rounded ${currentQty > 0 ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700 animate-pulse"}`}
                          >
                            {isPending ? "Salvare..." : `${currentQty} buc`}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleStockChange(part.id, currentQty, 1)
                            }
                            disabled={isPending || isUpdatingStock !== null}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 disabled:opacity-40"
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
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <p className="text-sm font-medium">
                      Nicio piesă de schimb găsită pentru criteriile selectate.
                    </p>
                    {debouncedSearchTerm && (
                      <button
                        onClick={() => setSearchInputValue("")}
                        className="mt-2 text-xs text-blue-500 hover:underline font-semibold"
                      >
                        Resetează căutarea
                      </button>
                    )}
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
              Se afișează reperele {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfFirstItem + itemsPerPage, totalCount)} din{" "}
              {totalCount} totale
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs font-bold self-center px-2 text-slate-700">
                Pagina {currentPage} din {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium border rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
