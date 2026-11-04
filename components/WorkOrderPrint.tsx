"use client";

interface PrintAction {
  id: number;
  task_description: string;
  frequency: string;
  workcenter?: string | null;
  equipment?: string | null;
  sub_equipment?: string | null;
  maintenance_equipment?: string | null;
  operation?: string | null;
  control_method?: string | null;
  technician?: string | null;
  estimated_time?: string | null;
  estimated_minutes?: number | string | null;
  part_reference?: string | null;
  required_material?: string | null;
  remarks?: string | null;
  priority?: string | null;
  action_en?: string | null;
  action_ro?: string | null;
}

interface WorkOrderPrintProps {
  woNumber: string;
  toolNumber: string;
  fixtureName: string;
  technician: string;
  scheduledDate: string;
  priority: string;
  status: string;
  actions: PrintAction[];
  language?: "EN" | "RO";
}

export default function WorkOrderPrint({
  woNumber,
  toolNumber,
  fixtureName,
  technician,
  scheduledDate,
  priority,
  status,
  actions,
  language = "EN",
}: WorkOrderPrintProps) {
  // Generare listă unică pentru secțiunea TOOLS & MATERIALS REQUIRED
  const uniqueToolsAndMaterials = Array.from(
    new Set(
      actions
        .flatMap((act) => [act.required_material, act.maintenance_equipment])
        .map((item) => item?.trim())
        .filter((item): item is string => !!item),
    ),
  );

  // CORECTURĂ: Extragere corectă sub formă de obiect a primului task din listă pentru metadate
  const firstAction = actions[0] || {};
  const displayWorkCenter = firstAction.workcenter || toolNumber || "N/A";
  const displayPriority = firstAction.priority || priority || "N/A";
  const displayFrequency = firstAction.frequency || "N/A";

  // Calcularea timpului din ambele câmpuri (numeric și text extractibil)
  const totalEstimatedMinutes = actions.reduce((sum, action) => {
    if (action.estimated_minutes) {
      return sum + Number(action.estimated_minutes);
    }

    if (action.estimated_time) {
      const minutes = Number(
        String(action.estimated_time).replace(/[^\d]/g, ""),
      );
      return sum + (minutes || 0);
    }

    return sum;
  }, 0);

  // CORECTURĂ: Eliminarea completă a backslash-urilor din template literals pentru o interpretare curată
  let displayEstTime = "N/A";

  if (totalEstimatedMinutes > 0) {
    if (totalEstimatedMinutes >= 60) {
      const hours = Math.floor(totalEstimatedMinutes / 60);
      const mins = totalEstimatedMinutes % 60;

      displayEstTime = mins > 0 ? `\({hours}h\){mins}m` : `\${hours}h`;
    } else {
      displayEstTime = `\${totalEstimatedMinutes} min`;
    }
  }

  return (
    <>
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

          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm !important;
          }

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

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="cmms-industrial-print"
        className="hidden print:block w-full bg-white text-black font-sans antialiased text-sm"
      >
        {/* LOGO COMPANIE ȘI TITLU */}
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

        {/* GRILĂ METADATE CORECTATĂ */}
        <div className="grid grid-cols-2 gap-4 border-2 border-black p-3 font-mono text-xs mb-6 bg-slate-50/50">
          <div className="space-y-1">
            <div>
              <span className="font-bold text-slate-500 uppercase">
                Tool Number:
              </span>{" "}
              <span className="font-black text-sm">{toolNumber}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase">
                Fixture Name:
              </span>{" "}
              <span className="font-black text-sm">{fixtureName || "N/A"}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase">
                Assigned Technician:
              </span>{" "}
              <span className="font-bold text-black">
                {technician || firstAction.technician || "UNASSIGNED"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase">
                Work Order Status:
              </span>{" "}
              <span className="font-bold text-black uppercase">{status}</span>
            </div>
          </div>
          <div className="space-y-1 border-l border-black pl-4">
            <div>
              <span className="font-bold text-slate-500 uppercase">
                Work Order No:
              </span>{" "}
              <span className="font-black text-sm">{woNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase">
                Priority:
              </span>{" "}
              <span className="font-bold text-black uppercase">
                {displayPriority}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase">
                Frequency:
              </span>{" "}
              <span className="font-bold text-black uppercase">
                {displayFrequency}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1 - PREVENTIVE MAINTENANCE TASKS */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2 border-b-2 border-black pb-1 font-mono">
            SECTION 1 - PREVENTIVE MAINTENANCE TASKS
          </h2>

          <div className="border-2 border-black divide-y divide-black">
            {actions.map((act, index) => (
              <div
                key={act.id}
                className="p-3"
                style={{ pageBreakInside: "avoid" }}
              >
                <div className="flex items-start gap-4 mb-2">
                  <div className="w-6 h-6 border-2 border-black rounded bg-white flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm font-medium text-black">
                    <span className="font-mono text-slate-400 mr-2 text-xs">
                      {(index + 1).toString().padStart(2, "0")}.
                    </span>
                    {language === "RO"
                      ? act.action_ro || act.task_description
                      : act.action_en || act.task_description}
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800 uppercase px-2 bg-slate-100 border border-black rounded">
                    {act.frequency || displayFrequency}
                  </div>
                </div>

                <div className="pl-10 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-700">
                  {act.operation && (
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Operation:
                      </span>
                      {act.operation}
                    </div>
                  )}
                  {act.maintenance_equipment && (
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Maintenance Equipment:
                      </span>
                      {act.maintenance_equipment}
                    </div>
                  )}
                  {act.control_method && (
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Control Method:
                      </span>
                      {act.control_method}
                    </div>
                  )}
                  {act.required_material && (
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Required Material:
                      </span>
                      {act.required_material}
                    </div>
                  )}
                  {act.part_reference && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Part Reference:
                      </span>
                      {act.part_reference}
                    </div>
                  )}
                  {act.remarks && (
                    <div className="col-span-2 text-slate-500 italic">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold not-italic">
                        Remarks:
                      </span>
                      {act.remarks}
                    </div>
                  )}
                </div>

                <div className="pl-10 mt-2">
                  <div className="flex flex-col gap-2 text-xs font-mono text-slate-500">
                    <span>Comments / Findings:</span>
                    <div className="w-full border-b border-dashed border-slate-400 h-4" />
                    <div className="w-full border-b border-dashed border-slate-400 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2 - TOOLS & MATERIALS REQUIRED */}
        {uniqueToolsAndMaterials.length > 0 && (
          <div className="mb-6" style={{ pageBreakInside: "avoid" }}>
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2 border-b-2 border-black pb-1 font-mono">
              TOOLS & MATERIALS REQUIRED
            </h2>
            <ul className="list-disc pl-5 font-mono text-xs space-y-1">
              {uniqueToolsAndMaterials.map((item, idx) => (
                <li key={idx} className="text-black font-medium">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SECTION 3 - SIGN-OFF COMPLETION */}
        <div
          className="mt-8 pt-4 border-t-4 border-black"
          style={{ pageBreakInside: "avoid" }}
        >
          <div className="grid grid-cols-2 gap-12 font-mono text-xs">
            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-wide border-b border-black pb-1">
                TECHNICIAN COMPLETION
              </h3>
              <div className="space-y-3">
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">
                    Technician Name:
                  </span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">
                    Signature:
                  </span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">Date:</span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-wide border-b border-black pb-1">
                SUPERVISOR VALIDATION
              </h3>
              <div className="space-y-3">
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">
                    Supervisor:
                  </span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">
                    Signature:
                  </span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
                <div className="flex items-end">
                  <span className="w-32 text-slate-500 font-bold">Date:</span>
                  <div className="flex-1 border-b border-black h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
