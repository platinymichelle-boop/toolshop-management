"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { mainEquipment, equipmentData } from "@/lib/maintenanceData";

function MaintenanceReportsForm() {
  const searchParams = useSearchParams();
  const breakdownId = searchParams.get("id");

  // Stări pentru preluarea tehnicienilor din baza de date
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);

  // Stări pentru piese de schimb (Autocomplete conform schemei reale)
  const [sparePartsSuggestions, setSparePartsSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingParts, setSearchingParts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Adaugă starea reactivă pentru matrițe
  const [dbToolsWithData, setDbToolsWithData] = useState<any[]>([]);

  // Noua stare pentru blocarea suprascrierii automate a orelor
  const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false);

  // Stări pentru câmpurile vizibile în UI
  const [reportDate, setReportDate] = useState("");
  const [shift, setShift] = useState<number>(1);
  const [sapNotification, setSapNotification] = useState("");
  const [personResponsible, setPersonResponsible] = useState("");

  const [selectedMainEquipment, setSelectedMainEquipment] = useState("");
  const [equipmentCode, setEquipmentCode] = useState("");
  const [subEquipment, setSubEquipment] = useState("");
  const [defectionType, setDefectionType] = useState("");
  const [breakdownDescription, setBreakdownDescription] = useState("");
  const [sparePartsUsed, setSparePartsUsed] = useState("");
  const [endrCode, setEndrCode] = useState("");

  const [startTime, setStartTime] = useState("");
  const [malfunctionEndTime, setMalfunctionEndTime] = useState("");
  const [malfunctionEndDate, setMalfunctionEndDate] = useState("");

  // Câmpuri ascunse din UI, dar păstrate pentru DB conform cerinței
  const [functionalLocation, setFunctionalLocation] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [technicianComments, setTechnicianComments] = useState("");
  const [stoppageCode, setStoppageCode] = useState("");
  const [productionOrder, setProductionOrder] = useState("");
  const [totalProductionAmount, setTotalProductionAmount] = useState<number>(0);
  const [plannedProductionAmount, setPlannedProductionAmount] =
    useState<number>(0);

  // Stări pentru timpii de intervenție (minute)
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [diagnosticTime, setDiagnosticTime] = useState<number>(0);
  const [sparePartTime, setSparePartTime] = useState<number>(0);
  const [repairTime, setRepairTime] = useState<number>(0);
  const [testTime, setTestTime] = useState<number>(0);
  const [reportTime, setReportTime] = useState<number>(0);

  // Stări pentru UI și feedback
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });
  // Funcție pentru generarea automată a datei, orei și schimbului
  const getAutomatedDateTimeAndShift = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const currentDateStr = `${year}-${month}-${day}`;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${String(hours).padStart(2, "0")}:${minutes}`;

    let currentShift = 3;
    if (hours >= 7 && hours < 15) {
      currentShift = 1;
    } else if (hours >= 15 && hours < 23) {
      currentShift = 2;
    }

    return { currentDateStr, currentTimeStr, currentShift };
  };

  // Hook principal pentru încărcarea tehnicienilor și precompletarea automată din Breakdown Tracker
  useEffect(() => {
    async function loadInitialData() {
      // 1. Încarcă tehnicienii din baza de date
      try {
        setLoadingTechnicians(true);
        const { data, error } = await supabase
          .from("technicians")
          .select("id, name")
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) console.error("Error loading technicians:", error.message);
        else if (data) setTechnicians(data);
      } catch (err) {
        console.error("Catch loading technicians:", err);
      } finally {
        setLoadingTechnicians(false);
      }

      // 2. Inițializează datele de timp curente (valori implicite ca fallback)
      const { currentDateStr, currentTimeStr, currentShift } =
        getAutomatedDateTimeAndShift();

      setReportDate(currentDateStr);
      setMalfunctionEndDate(currentDateStr);
      setStartTime(currentTimeStr);
      setShift(currentShift);

      // 3. Integrare completă Cerința 3: preluare date live din tabela breakdowns
      if (breakdownId) {
        try {
          const { data: breakdown, error: bdError } = await supabase
            .from("breakdowns")
            .select("*")
            .eq("id", breakdownId)
            .single();

          if (bdError) {
            console.error("Error fetching active breakdown:", bdError.message);
          } else if (breakdown) {
            // Maparea câmpurilor din înregistrarea din baza de date în stările UI
            setBreakdownDescription(breakdown.issue_description || "");
            setPersonResponsible(breakdown.technician_name || "");
            setEquipmentCode(breakdown.press_number || "");

            if (breakdown.start_time) {
              const startDateTime = new Date(breakdown.start_time);

              // Formatează corect data: YYYY-MM-DD
              const year = startDateTime.getFullYear();
              const month = String(startDateTime.getMonth() + 1).padStart(
                2,
                "0",
              );
              const day = String(startDateTime.getDate()).padStart(2, "0");
              const bdDateStr = `${year}-${month}-${day}`;

              // Formatează corect ora: HH:MM
              const hours = String(startDateTime.getHours()).padStart(2, "0");
              const minutes = String(startDateTime.getMinutes()).padStart(
                2,
                "0",
              );
              const bdTimeStr = `${hours}:${minutes}`;

              setReportDate(bdDateStr);
              setStartTime(bdTimeStr);
              setMalfunctionEndDate(bdDateStr);

              // Calcul automat al schimbului în funcție de ora nativă la care s-a pornit avaria
              const hrInt = startDateTime.getHours();
              let bdShift = 3;
              if (hrInt >= 7 && hrInt < 15) bdShift = 1;
              else if (hrInt >= 15 && hrInt < 23) bdShift = 2;
              setShift(bdShift);
            }
          }
        } catch (err) {
          console.error("Catch fetching active breakdown details:", err);
        }
      }
    }

    loadInitialData();
  }, [breakdownId]);
  // Căutare asincronă în tabela spare_parts pe baza coloanelor reale din schemă
  useEffect(() => {
    if (!sparePartsUsed || sparePartsUsed.trim().length < 2) {
      setSparePartsSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearchingParts(true);
        const queryTerm = `%${sparePartsUsed}%`;
        const { data, error } = await supabase
          .from("spare_parts")
          .select(
            "id, tool_number, endr_code, specification, part_number, manufacturer",
          )
          .or(
            `tool_number.ilike.${queryTerm},endr_code.ilike.${queryTerm},specification.ilike.${queryTerm},part_number.ilike.${queryTerm},manufacturer.ilike.${queryTerm}`,
          )
          .limit(10);

        if (!error && data) {
          setSparePartsSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching spare parts:", err);
      } finally {
        setSearchingParts(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [sparePartsUsed]);

  // Click outside pentru ascunderea panoului de sugestii
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calcul inteligent pentru Total Downtime & Auto Calculation End Time / End Date cu Manual Override
  const sumOfDetailedTimes =
    waitingTime +
    diagnosticTime +
    sparePartTime +
    repairTime +
    testTime +
    reportTime;
  const [calculatedTotalTime, setCalculatedTotalTime] = useState<number>(0);

  useEffect(() => {
    if (sumOfDetailedTimes > 0) {
      setCalculatedTotalTime(sumOfDetailedTimes);

      // Calculăm orele automate doar dacă utilizatorul nu a făcut o editare manuală directă
      if (!endTimeManuallyEdited && reportDate && startTime) {
        try {
          const startDateTime = new Date(`${reportDate}T${startTime}`);
          if (!isNaN(startDateTime.getTime())) {
            const endDateTime = new Date(
              startDateTime.getTime() + sumOfDetailedTimes * 60 * 1000,
            );

            const endHours = String(endDateTime.getHours()).padStart(2, "0");
            const endMinutes = String(endDateTime.getMinutes()).padStart(
              2,
              "0",
            );
            setMalfunctionEndTime(`${endHours}:${endMinutes}`);

            const endYear = endDateTime.getFullYear();
            const endMonth = String(endDateTime.getMonth() + 1).padStart(
              2,
              "0",
            );
            const endDay = String(endDateTime.getDate()).padStart(2, "0");
            setMalfunctionEndDate(`${endYear}-${endMonth}-${endDay}`);
          }
        } catch (e) {
          console.error("Error computing end time automatically", e);
        }
      }
    } else if (reportDate && startTime && malfunctionEndTime) {
      // Dacă nu există timpi detaliați, calculăm diferența brută dintre timestamps
      try {
        const startDateTime = new Date(`${reportDate}T${startTime}`);
        const endDateTime = new Date(`${reportDate}T${malfunctionEndTime}`);

        let differenceInMs = endDateTime.getTime() - startDateTime.getTime();
        if (differenceInMs < 0) {
          differenceInMs += 24 * 60 * 60 * 1000;
        }

        const differenceInMin = Math.max(
          0,
          Math.floor(differenceInMs / 1000 / 60),
        );
        setCalculatedTotalTime(differenceInMin);
      } catch (e) {
        setCalculatedTotalTime(0);
      }
    } else {
      setCalculatedTotalTime(0);
    }
  }, [
    sumOfDetailedTimes,
    reportDate,
    startTime,
    malfunctionEndTime,
    endTimeManuallyEdited,
  ]);

  const totalTime = calculatedTotalTime;

  const formatDowntimeDisplay = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const selectedData =
    selectedMainEquipment &&
    equipmentData[selectedMainEquipment as keyof typeof equipmentData]
      ? equipmentData[selectedMainEquipment as keyof typeof equipmentData]
      : null;
  const handleClearForm = () => {
    const { currentDateStr, currentTimeStr, currentShift } =
      getAutomatedDateTimeAndShift();

    setReportDate(currentDateStr);
    setStartTime(currentTimeStr);
    setShift(currentShift);
    setMalfunctionEndDate(currentDateStr);
    setEndTimeManuallyEdited(false); // Reactivează calculul automat

    setSelectedMainEquipment("");
    setEquipmentCode("");
    setSubEquipment("");
    setDefectionType("");
    setBreakdownDescription("");
    setEndrCode("");
    setPersonResponsible("");
    setMalfunctionEndTime("");
    setSparePartsUsed("");

    setFunctionalLocation("");
    setRootCause("");
    setCorrectiveAction("");
    setTechnicianComments("");
    setStoppageCode("");
    setProductionOrder("");
    setTotalProductionAmount(0);
    setPlannedProductionAmount(0);

    setWaitingTime(0);
    setDiagnosticTime(0);
    setSparePartTime(0);
    setRepairTime(0);
    setTestTime(0);
    setReportTime(0);
    setStatusMessage({ type: null, text: "" });
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage({ type: null, text: "" });

    // Permitem flexibilitate la salvare dacă codul de echipament a venit deja precompletat din tracker
    if (!reportDate || !equipmentCode) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all mandatory fields (Date, Equipment Code).",
      });
      setIsLoading(false);
      return;
    }

    try {
      // NOU: Detectăm dinamic tipul matriței din baza de date pentru a clasifica raportul
      let computedMainEqu = selectedMainEquipment || "Stamping Press";

      try {
        const { data: toolData, error: toolError } = await supabase
          .from("tools")
          .select("tool_type")
          .eq("tool_number", equipmentCode.trim())
          .maybeSingle();

        if (!toolError && toolData && toolData.tool_type) {
          computedMainEqu = toolData.tool_type;
        }
      } catch (dbFetchErr) {
        console.error(
          "Eșec la determinarea automată a tool_type-ului:",
          dbFetchErr,
        );
      }

      const recordToInsert = {
        sap_notification: sapNotification,
        functional_location: functionalLocation,
        report_date: reportDate,
        shift: shift,

        // ADAPTARE DINAMICĂ: Salvează categoria reală detectată (PROGRESIV, TRANSFER, BLANKING)
        main_equ: computedMainEqu,

        equipment_code: equipmentCode,
        sub_equ: subEquipment || "",
        defection_type: defectionType || "",
        breakdown_description: breakdownDescription || null,
        start_time: startTime || null,
        waiting_time: waitingTime,
        diagnostic_time: diagnosticTime,
        spare_part_time: sparePartTime,
        repair_time: repairTime,
        test_time: testTime,
        report_time: reportTime,
        total_time: totalTime,
        endr_code: endrCode || null,
        person_responsible: personResponsible,
        malfunction_end_date: malfunctionEndDate || null,
        malfunction_end_time: malfunctionEndTime || null,
        stoppage_code: stoppageCode || null,
        production_order: productionOrder || null,
        total_production_amount: totalProductionAmount,
        planned_production_amount: plannedProductionAmount,
        root_cause: rootCause || null,
        corrective_action: correctiveAction || null,
        technician_comments: technicianComments || null,
        spare_parts_used: sparePartsUsed || null,
      };

      const { error: supabaseError } = await supabase
        .from("maintenance_reports")
        .insert([recordToInsert]);

      if (supabaseError) {
        const errorText = `Supabase Error: ${supabaseError.message}. Details: ${supabaseError.details || "None"}`;
        alert(errorText);
        setStatusMessage({ type: "error", text: errorText });
        setIsLoading(false);
        return;
      }

      // Cerința 4 & 5: Actualizarea statusului avariei în tabela breakdowns după inserarea cu succes
      if (breakdownId) {
        const { error: updateError } = await supabase
          .from("breakdowns")
          .update({
            status: "completed",
            end_time: new Date().toISOString(),
          })
          .eq("id", breakdownId);

        if (updateError) {
          console.error(
            "Failed to update breakdown status in Supabase:",
            updateError.message,
          );
        }
      }

      setStatusMessage({
        type: "success",
        text: "Maintenance report saved successfully and active breakdown closed!",
      });

      handleClearForm(); // Curățare inteligentă a formularului cu repunerea flag-urilor pe false
    } catch (catchErr: any) {
      const genericMessage = catchErr?.message || "Unknown execution error";
      alert(`Catch Triggered: ${genericMessage}`);
      setStatusMessage({ type: "error", text: genericMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Daily Maintenance Report
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Fast shop-floor reporting for SAP notification closure.
          </p>
        </div>

        <Link
          href="/maintenance-reports/history"
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm border border-slate-200 transition-colors text-sm font-medium"
        >
          View History
        </Link>
      </div>

      {/* Mesaje Status */}
      {statusMessage.type && (
        <div
          className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSaveReport} className="space-y-6">
        {/* SECTION 1: GENERAL INFORMATION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            General Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Date *
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Shift
              </label>
              <select
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
              >
                <option value={1}>Shift 1</option>
                <option value={2}>Shift 2</option>
                <option value={3}>Shift 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Person Responsible
              </label>
              <select
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                value={personResponsible}
                onChange={(e) => setPersonResponsible(e.target.value)}
                disabled={loadingTechnicians}
              >
                {loadingTechnicians ? (
                  <option value="">Loading technicians...</option>
                ) : technicians.length === 0 ? (
                  <option value="">No technicians available</option>
                ) : (
                  <>
                    <option value="">Select Technician</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.name}>
                        {tech.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
        {/* SECTION 2: EQUIPMENT INFORMATION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Equipment Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Main Equipment *
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  value={selectedMainEquipment}
                  onChange={(e) => {
                    setSelectedMainEquipment(e.target.value);
                    setEquipmentCode("");
                    setSubEquipment("");
                    setDefectionType("");
                  }}
                >
                  <option value="">Select Main Equipment</option>
                  <option value="DETECTARE_AUTOMATA">
                    Detectare Automată (Din cod utilaj)
                  </option>
                  <option value="PROGRESIV">PRESA PROGRESIVA (PROG)</option>
                  <option value="TRANSFER">PRESA TRANSFER (TRANS)</option>
                  <option value="BLANKING">LINIE BLANKING / TĂIERE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Equipment Code *
                </label>
                {selectedMainEquipment &&
                selectedMainEquipment !== "DETECTARE_AUTOMATA" ? (
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-medium"
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    required
                  >
                    <option value="">Select Equipment Code</option>
                    {/* 
        METODĂ DUBLĂ DE SIGURANȚĂ:
        Dacă dbToolsWithData conține elemente, filtrăm după tool_type.
        Dacă baza de date nu a apucat să se încarce în această stare, filtrăm direct pe ecran 
        după prefixul codului utilajului pentru a debloca selecția instant!
      */}
                    {dbToolsWithData && dbToolsWithData.length > 0 ? (
                      dbToolsWithData
                        .filter((t: any) => {
                          if (!t.tool_type) return false;
                          return (
                            String(t.tool_type).trim().toUpperCase() ===
                            String(selectedMainEquipment).trim().toUpperCase()
                          );
                        })
                        .map((t: any) => (
                          <option key={t.tool_number} value={t.tool_number}>
                            {t.tool_number}
                          </option>
                        ))
                    ) : /* FALLBACK INTELIGENT: Dacă tabela înca se încarcă în fundal, pre-afișăm seriile cunoscute */
                    selectedMainEquipment === "PROGRESIV" ? (
                      <>
                        <option value="M250SP001 - 002">M250SP001 - 002</option>
                        <option value="M250SP004">M250SP004</option>
                        <option value="M250SP008 - 009">M250SP008 - 009</option>
                        <option value="M250SP010">M250SP010</option>
                        <option value="M250SP013">M250SP013</option>
                        <option value="M250SP015">M250SP015</option>
                        <option value="M250SP017">M250SP017</option>
                        <option value="M250SP018">M250SP018</option>
                        <option value="M250SP108">M250SP108</option>
                        <option value="M250SP109">M250SP109</option>
                        <option value="M250SP110">M250SP110</option>
                        <option value="M250SP217">M250SP217</option>
                        <option value="M250SP308">M250SP308</option>
                        <option value="M250SP309">M250SP309</option>
                        <option value="M250SP401 - 402">M250SP401 - 402</option>
                        <option value="M250SP403">M250SP403</option>
                        <option value="M250SP409">M250SP409</option>
                        <option value="M250SP425">M250SP425</option>
                        <option value="M250SP426">M250SP426</option>
                      </>
                    ) : selectedMainEquipment === "TRANSFER" ? (
                      <>
                        <option value="M315SP003">M315SP003</option>
                        <option value="M315SP004">M315SP004</option>
                        <option value="M315SP006 - 007">M315SP006 - 007</option>
                        <option value="M315SP008 - 009">M315SP008 - 009</option>
                        <option value="M315SP010 - 011">M315SP010 - 011</option>
                        <option value="M315SP012">M315SP012</option>
                        <option value="M315SP013 - 018">M315SP013 - 018</option>
                        <option value="M315SP015">M315SP015</option>
                        <option value="M315SP016">M315SP016</option>
                        <option value="M315SP017">M315SP017</option>
                        <option value="M315SP020">M315SP020</option>
                        <option value="M315SP022">M315SP022</option>
                        <option value="M315SP023">M315SP023</option>
                        <option value="M315SP024">M315SP024</option>
                        <option value="M315SP027">M315SP027</option>
                        <option value="M315SP109">M315SP109</option>
                        <option value="M315SP118">M315SP118</option>
                        <option value="M315SP119">M315SP119</option>
                        <option value="M315SP211">M315SP211</option>
                        <option value="M315SP212">M315SP212</option>
                        <option value="M315SP217">M315SP217</option>
                        <option value="M315SP220">M315SP220</option>
                        <option value="M315SP222">M315SP222</option>
                        <option value="M315SP308">M315SP308</option>
                        <option value="M315SP309">M315SP309</option>
                        <option value="M315SP318">M315SP318</option>
                        <option value="M315SP403">M315SP403</option>
                        <option value="M315SP407">M315SP407</option>
                        <option value="M315SP408">M315SP408</option>
                        <option value="M315SP413">M315SP413</option>
                        <option value="M315SP426">M315SP426</option>
                        <option value="M315SP427">M315SP427</option>
                        <option value="M315SP429">M315SP429</option>
                        <option value="M315SP430">M315SP430</option>
                        <option value="M315SP431">M315SP431</option>
                        <option value="M315SP434">M315SP434</option>
                        <option value="M315SP435">M315SP435</option>
                        <option value="M315SP438">M315SP438</option>
                        <option value="M315SP439">M315SP439</option>
                        <option value="M315SP440 - 441">M315SP440 - 441</option>
                        <option value="M315SP442">M315SP442</option>
                        <option value="M315SP443">M315SP443</option>
                        <option value="M315SP446">M315SP446</option>
                        <option value="M315SP448">M315SP448</option>
                        <option value="M315SP453">M315SP453</option>
                        <option value="M315SP454">M315SP454</option>
                        <option value="M315SP455">M315SP455</option>
                        <option value="M315SP457">M315SP457</option>
                        <option value="M315SP458">M315SP458</option>
                        <option value="M315SP510">M315SP510</option>
                        <option value="M315SP512">M315SP512</option>
                        <option value="M315SP514">M315SP514</option>
                        <option value="M315SP612">M315SP612</option>
                        <option value="M315SP614">M315SP614</option>
                      </>
                    ) : (
                      <>
                        <option value="M251SP403">M251SP403</option>
                        <option value="M251SP407 - 408">M251SP407 - 408</option>
                        <option value="M251SP410- 427">M251SP410- 427</option>
                        <option value="M310SP027">M310SP027</option>
                        <option value="M530SP404">M530SP404</option>
                      </>
                    )}
                  </select>
                ) : selectedMainEquipment === "DETECTARE_AUTOMATA" ? (
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    required
                  >
                    <option value="">
                      Alege orice matriță (Toate înregistrate)
                    </option>
                    <option value="M250SP001 - 002">
                      M250SP001 - 002 [PROGRESIV]
                    </option>
                    <option value="M315SP220">M315SP220 [TRANSFER]</option>
                    <option value="M530SP404">M530SP404 [BLANKING]</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Introduceți codul echipamentului..."
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 font-medium"
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Sub Equipment
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-medium"
                  value={subEquipment}
                  onChange={(e) => setSubEquipment(e.target.value)}
                  disabled={!selectedMainEquipment}
                >
                  <option value="">Select Sub Equipment</option>
                  <option value="PUNCH">PUNCH (Module Poansoane)</option>
                  <option value="TRIM">TRIM (Module Lame / Cuțite)</option>
                  <option value="MECHANICAL">
                    MECHANICAL (Structură / Ghidaje / Glisiere)
                  </option>
                  <option value="GENERAL">GENERAL / ALTELE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Defection Type
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-medium"
                  value={defectionType}
                  onChange={(e) => setDefectionType(e.target.value)}
                  disabled={!selectedMainEquipment}
                >
                  <option value="">Select Defection Type</option>
                  <option value="UZURA">
                    Uzură Normală (Ascuțire / Corecții)
                  </option>
                  <option value="RUPTURA">
                    Rupere / Ciobire Element Activ
                  </option>
                  <option value="BLOCAJ">
                    Gripare / Blocaj Mecanic Glisieră
                  </option>
                  <option value="REGLAJ">
                    Problemă Reglaj / Jocuri Incorecte
                  </option>
                  <option value="ALTELE">Alte Cauze Tehnice</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: BREAKDOWN DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Breakdown Details
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Breakdown Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe the technical issue here..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={breakdownDescription}
              onChange={(e) => setBreakdownDescription(e.target.value)}
            />
          </div>
        </div>

        {/* SECTION 4: REPAIR INFORMATION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Repair Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Spare Parts Used
              </label>
              <input
                type="text"
                placeholder="Type to search parts..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={sparePartsUsed}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSparePartsUsed(e.target.value);
                  setShowSuggestions(true);
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1 italic">
                Search by tool number, ENDR code, manufacturer or specification
              </p>
              {/* Dropdown modern bazat pe coloanele reale din baza de date */}
              {showSuggestions && sparePartsUsed.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchingParts ? (
                    <div className="p-3 text-xs text-slate-500 italic">
                      Searching database...
                    </div>
                  ) : sparePartsSuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 italic">
                      No parts found
                    </div>
                  ) : (
                    sparePartsSuggestions.map((part) => (
                      <button
                        key={part.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-slate-50 transition-colors block"
                        onClick={() => {
                          setSparePartsUsed(part.tool_number || "");
                          if (part.endr_code) {
                            setEndrCode(part.endr_code);
                          }
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="font-semibold text-sm text-slate-900">
                          {part.tool_number}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                          {part.endr_code && <div>ENDR: {part.endr_code}</div>}
                          {part.part_number && (
                            <div>PN: {part.part_number}</div>
                          )}
                          {part.manufacturer && <div>{part.manufacturer}</div>}
                        </div>
                        {part.specification && (
                          <div className="text-xs text-slate-400 italic mt-1 border-t pt-1 truncate">
                            {part.specification}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                ENDR Code
              </label>
              <input
                type="text"
                placeholder="Technical code..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={endrCode}
                onChange={(e) => setEndrCode(e.target.value)}
              />
            </div>
          </div>
        </div>
        {/* SECTION 5: DOWNTIME INFORMATION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Downtime Information
          </h2>
          <div className="space-y-4">
            {/* Rând 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Start Time
                </label>
                <input
                  type="time"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Malfunction End Time
                </label>
                <input
                  type="time"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={malfunctionEndTime}
                  onChange={(e) => {
                    setMalfunctionEndTime(e.target.value);
                    setEndTimeManuallyEdited(true); // Activează blocarea suprascrierii automate
                  }}
                />
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Auto calculated from downtime values. Can be edited manually.
                </p>
              </div>
            </div>

            {/* Rând 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Waiting Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={waitingTime || ""}
                  onChange={(e) =>
                    setWaitingTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Diagnostic Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={diagnosticTime || ""}
                  onChange={(e) =>
                    setDiagnosticTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Spare Part Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={sparePartTime || ""}
                  onChange={(e) =>
                    setSparePartTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
            </div>

            {/* Rând 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Repair Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={repairTime || ""}
                  onChange={(e) =>
                    setRepairTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Test Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={testTime || ""}
                  onChange={(e) =>
                    setTestTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Report Time (min)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={reportTime || ""}
                  onChange={(e) =>
                    setReportTime(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>
            </div>

            {/* Card supradimensionat pentru Total Downtime */}
            <div className="mt-6 pt-4 border-t">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
                    Total Downtime
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Calculated via timestamps difference or aggregate breakdown
                    structure.
                  </p>
                </div>
                <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200 tracking-tight self-start sm:self-center">
                  {formatDowntimeDisplay(totalTime)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Butoane Formular */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 font-semibold text-sm transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Report"}
          </button>

          <button
            type="button"
            onClick={handleClearForm}
            disabled={isLoading}
            className="bg-slate-200 text-slate-700 p-3.5 rounded-xl hover:bg-slate-300 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}

// Exportul implicit înfășoară componenta într-un Suspense Boundary pentru utilizarea regulamentară a useSearchParams() în Next.js
export default function MaintenanceReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm text-slate-500">
          Loading form contexts...
        </div>
      }
    >
      <MaintenanceReportsForm />
    </Suspense>
  );
}
