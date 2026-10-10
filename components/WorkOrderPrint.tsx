"use client";

interface PrintAction {
  id: number;
  task_description: string;
  frequency: string;
}

interface WorkOrderPrintProps {
  woNumber: string;
  toolNumber: string;
  technician: string;
  scheduledDate: string;
  priority: string;
  status: string;
  actions: PrintAction[];
}

export default function WorkOrderPrint({
  woNumber,
  toolNumber,
  technician,
  scheduledDate,
  priority,
  status,
  actions,
}: WorkOrderPrintProps) {
  return (
    <>
      {/* 
        [CSS DE PRINT INDUSTRIAL - REZOLVARE LATIME SI SPATIU UTIL A4]
        Forțăm visibility: hidden pe body pentru a șterge sidebar-ul/navbar-ul Next.js.
        Poziționăm absolute containerul la (0,0) și extindem lățimea la 100% din zona printabilă.
      */}
      <style jsx global>{`
        @media print {
          html,
          body {
            visibility: hidden !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }

          /* Setare Margini Fizice Imprimantă conform cerinței (12mm) */
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm !important;
          }

          /* Forțare container CMMS pe toată lățimea disponibilă a foii */
          #cmms-industrial-print {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #cmms-industrial-print * {
            visibility: visible !important;
            color: black !important;
            border-color: black !important;
          }

          /* Dezactivare elemente de fundal decorative ale browserului */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* CONTAINER PRINCIPAL FULL-WIDTH (Ascuns pe ecran, extins complet la Print) */}
      <div
        id="cmms-industrial-print"
        className="hidden print:block w-full bg-white text-black font-sans antialiased text-sm"
      >
        {/* LOGO COMPANIE ȘI TITLU MODUL */}
        <div className="flex justify-between items-end border-b-4 border-black pb-2 mb-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-slate-500 block uppercase">
              METAL STAMPING MAINTENANCE
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">
              PREVENTIVE MAINTENANCE WORK ORDER
            </h1>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs uppercase text-slate-500 block font-bold">
              SYSTEM DOC ID
            </span>
            <span className="text-sm font-bold text-black">
              FORM-PM-WO-REV2
            </span>
          </div>
        </div>
        {/* GRILĂ METADATE STIL INDUSTRIAL / SAP PM */}
        <table className="w-full border-collapse border-2 border-black mb-6 font-mono text-xs">
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 w-1/3 bg-slate-50">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  WORK ORDER NUMBER
                </span>
                <span className="text-sm font-black tracking-wide">
                  {woNumber}
                </span>
              </td>
              <td className="border-r border-black p-2 w-1/3 bg-slate-50">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  EQUIPMENT / TOOL NUMBER
                </span>
                <span className="text-sm font-black tracking-wide">
                  {toolNumber}
                </span>
              </td>
              <td className="p-2 w-1/3 bg-slate-50">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  ASSIGNED TECHNICIAN
                </span>
                <span className="text-sm font-black tracking-wide">
                  {technician || "UNASSIGNED"}
                </span>
              </td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 w-1/3">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  SCHEDULED DATE
                </span>
                <span className="text-sm font-bold">
                  {new Date(scheduledDate).toLocaleDateString()}
                </span>
              </td>
              <td className="border-r border-black p-2 w-1/3">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  CRITICAL PRIORITY
                </span>
                <span className="text-sm font-bold uppercase tracking-wider">
                  {priority}
                </span>
              </td>
              <td className="p-2 w-1/3">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  OPERATION STATUS
                </span>
                <span className="text-sm font-bold uppercase tracking-wider">
                  {status}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 1 - PREVENTIVE MAINTENANCE TASKS */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2 border-b-2 border-black pb-1 font-mono">
            SECTION 1 - PREVENTIVE MAINTENANCE TASKS
          </h2>

          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="border-b-2 border-black bg-slate-100 text-left text-xs font-mono font-black uppercase">
                <th className="p-2 w-16 text-center border-r border-black">
                  DONE
                </th>
                <th className="p-2 pl-4 border-r border-black">
                  TASK DESCRIPTION
                </th>
                <th className="p-2 w-24 text-center">FREQ</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black divide-black">
              {actions.map((act, index) => (
                <tr
                  key={act.id}
                  className="align-middle hover:bg-slate-50/50"
                  style={{ pageBreakInside: "avoid" }}
                >
                  {/* Indicator Checkbox Mare, centrat structural in coloana lui */}
                  <td className="p-3 text-center border-r border-black w-16">
                    <div className="w-6 h-6 border-2 border-black rounded mx-auto bg-white" />
                  </td>

                  {/* Descriere Task extensibilă pe lățime (~80% din tabel) */}
                  <td className="p-3 pl-4 border-r border-black text-sm text-black font-medium">
                    <span className="font-mono text-slate-400 mr-2 text-xs">
                      {(index + 1).toString().padStart(2, "0")}.
                    </span>
                    {act.task_description}
                  </td>

                  {/* Coloana Frecvență aliniată în extrema dreaptă a tabelului */}
                  <td className="p-3 text-center font-mono text-xs font-bold text-slate-800 uppercase w-24">
                    {act.frequency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* SECTION 2 - WORK COMPLETION */}
        <div
          className="mt-8 pt-4 border-t-4 border-black"
          style={{ pageBreakInside: "avoid" }}
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-6 font-mono">
            SECTION 2 - WORK COMPLETION
          </h2>

          <table className="w-full border-collapse border-2 border-black font-mono text-xs mb-6">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-4 w-1/2 border-r border-black pb-12 vertical-top">
                  <p className="font-bold text-slate-700 uppercase mb-4">
                    TECHNICIAN SIGNATURE
                  </p>
                  <div className="border-b border-dashed border-black w-3/4 mt-8" />
                </td>
                <td className="p-4 w-1/2 pb-12 vertical-top">
                  <p className="font-bold text-slate-700 uppercase mb-4">
                    DATE COMPLETED
                  </p>
                  <div className="border-b border-dashed border-black w-3/4 mt-8" />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-4">
                  <p className="font-bold text-slate-700 uppercase mb-4">
                    COMMENTS / OBSERVATIONS
                  </p>
                  <div className="space-y-6 pt-2 pb-2">
                    <div className="border-b border-black w-full" />
                    <div className="border-b border-black w-full" />
                    <div className="border-b border-black w-full" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* FOOTER INDUSTRIAL DE SUBsol */}
          <div className="text-center font-mono text-[10px] text-slate-400 mt-4">
            * Ensure this physical document is returned signed to the
            maintenance department upon completion.
          </div>
        </div>
      </div>
    </>
  );
}
