"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PMTask {
  id: string;
  tool_number: string;
  equipment: string;
  action: string;
  next_due_at: string;
  last_completed_at?: string | null;
  estimated_time: number | null;
  frequency: string;
}

interface ActiveWorkOrder {
  tool_number: string;
  wo_number: string;
  status: string;
}

// CHANGE 1 & 2: PM Package grouped by tool_number + frequency
interface GroupedPMPackage {
  package_key: string; // `${tool_number}__${frequency}`
  tool_number: string;
  equipment: string;
  frequency: string;
  category_label: string;
  number_of_tasks: number;
  duration_minutes: number;
  planned_day: string;
  selected: boolean;
  shift: string;
  earliest_next_due: string | null;
  latest_last_pm: string | null;
}

interface MaintenancePlan {
  id: string;
  tool_number: string;
  machine_name: string;
  planned_day: string;
  duration_minutes: number;
  status: string;
  week_number: number;
  year: number;
  shift?: string;
  action?: string;
  production_status: "PENDING" | "APPROVED" | "REJECTED";
  production_comment?: string | null;
  approval_token?: string | null;
}

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const FREQUENCY_OPTIONS = ["ALL", "WEEKLY", "MONTHLY", "YEARLY"];
const SHIFT_OPTIONS = ["SHIFT 1", "SHIFT 2", "SHIFT 3"];
const APPROVAL_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

// CHANGE 3: Future-driven filter options
const FUTURE_FILTER_OPTIONS = [
  "OVERDUE",
  "NEXT WEEK",
  "NEXT MONTH",
  "NEXT 3 MONTHS",
  "NEXT 6 MONTHS",
  "NEXT YEAR",
  "ALL",
] as const;

type FutureFilterType = (typeof FUTURE_FILTER_OPTIONS)[number];

const SORT_OPTIONS = [
  { value: "PRIORITY", label: "Planning Priority" },
  { value: "NEXT_DUE", label: "Next Due" },
  { value: "TOOL_NUMBER", label: "Tool Number" },
  { value: "DURATION_DESC", label: "Duration Desc" },
  { value: "DURATION_ASC", label: "Duration Asc" },
  { value: "TASKS_COUNT", label: "Tasks Count" },
];
// CHANGE 2: User-friendly PM Category Mapping
const PM_CATEGORY_MAP: Record<string, { label: string; style: string }> = {
  "1S": {
    label: "WEEKLY",
    style: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "15D": {
    label: "15 DAYS",
    style: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  "1L": {
    label: "MONTHLY",
    style: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "3L": {
    label: "QUARTERLY",
    style: "bg-orange-50 text-orange-700 border-orange-200",
  },
  "6L": {
    label: "SEMI ANNUAL",
    style: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  "1A": {
    label: "YEARLY",
    style: "bg-purple-50 text-purple-700 border-purple-200",
  },
  "2A": {
    label: "2 YEARS",
    style: "bg-purple-50 text-purple-700 border-purple-200",
  },
  "3A": {
    label: "3 YEARS",
    style: "bg-purple-50 text-purple-700 border-purple-200",
  },
  "5A": {
    label: "5 YEARS",
    style: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ON_DEMAND: {
    label: "ON DEMAND",
    style: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export function getPMCategoryInfo(freq: string): {
  label: string;
  style: string;
} {
  const normalized = (freq || "ON_DEMAND").trim().toUpperCase();
  return (
    PM_CATEGORY_MAP[normalized] || {
      label: normalized || "N/A",
      style: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

// =========================================================
// UTILITY FUNCTIONS FOR DUE DATES & PLANNING PRIORITY
// =========================================================
export function getDaysUntilDue(nextDueAt: string | null): number | null {
  if (!nextDueAt) return null;
  const due = new Date(nextDueAt);
  if (isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function isDueInWeekRange(
  nextDueAt: string | null,
  weekStartStr: string,
  weekEndStr: string,
): boolean {
  if (!nextDueAt) return false;
  const due = new Date(nextDueAt);
  if (isNaN(due.getTime())) return false;
  due.setHours(0, 0, 0, 0);
  const start = new Date(`${weekStartStr}T00:00:00`);
  const end = new Date(`${weekEndStr}T23:59:59`);
  return due >= start && due <= end;
}

// CHANGE 8: Planning Priority Rank (1 = OVERDUE ... 6 = NEXT YEAR, 7 = OTHER)
export function getPlanningPriorityRank(
  pkg: { earliest_next_due: string | null; frequency: string },
  nextWeekStart: string,
  nextWeekEnd: string,
): { rank: number; badgeLabel: string; badgeStyle: string } {
  const daysUntil = getDaysUntilDue(pkg.earliest_next_due);
  const freq = (pkg.frequency || "").trim().toUpperCase();

  if (daysUntil !== null && daysUntil < 0) {
    return {
      rank: 1,
      badgeLabel: "OVERDUE",
      badgeStyle: "bg-red-100 text-red-800 border-red-300",
    };
  }
  if (isDueInWeekRange(pkg.earliest_next_due, nextWeekStart, nextWeekEnd)) {
    return {
      rank: 2,
      badgeLabel: "NEXT WEEK",
      badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }
  if (freq === "1L") {
    return {
      rank: 3,
      badgeLabel: "NEXT MONTH",
      badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (freq === "3L") {
    return {
      rank: 4,
      badgeLabel: "NEXT 3 MONTHS",
      badgeStyle: "bg-orange-50 text-orange-700 border-orange-200",
    };
  }
  if (freq === "6L") {
    return {
      rank: 5,
      badgeLabel: "NEXT 6 MONTHS",
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if (["1A", "2A", "3A", "5A"].includes(freq)) {
    return {
      rank: 6,
      badgeLabel: "NEXT YEAR",
      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }
  return {
    rank: 7,
    badgeLabel: "SCHEDULED",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Never";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
export default function WeeklyMaintenancePage() {
  const [packages, setPackages] = useState<GroupedPMPackage[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<MaintenancePlan[]>([]);
  const [activeWorkOrders, setActiveWorkOrders] = useState<
    Record<string, ActiveWorkOrder>
  >({});
  const [loading, setLoading] = useState(false);
  const [weekNumber, setWeekNumber] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  // CHANGE 4: Default view set to OVERDUE
  const [futureFilter, setFutureFilter] = useState<FutureFilterType>("OVERDUE");
  // CHANGE 8: Default sorting follows planning priority
  const [sortBy, setSortBy] = useState("PRIORITY");
  // CHANGE 6: Used ONLY for Manual Plan mode
  const [manualDefaultShift, setManualDefaultShift] = useState("SHIFT 1");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  useEffect(() => {
    const now = new Date();
    const w = getWeekNumber(now);
    const y = now.getFullYear();
    setWeekNumber(w);
    setCurrentYear(y);
    loadData(w, y, frequencyFilter);
  }, []);

  function getWeekNumber(date: Date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  function getWeekDateRange(weekNum: number, yr: number) {
    const fourthOfJanuary = new Date(yr, 0, 4);
    const dayOfWeek = fourthOfJanuary.getDay();
    const isoWeek1Monday = new Date(fourthOfJanuary);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    isoWeek1Monday.setDate(fourthOfJanuary.getDate() - daysToSubtract);

    const targetMonday = new Date(isoWeek1Monday);
    targetMonday.setDate(isoWeek1Monday.getDate() + (weekNum - 1) * 7);
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    return {
      weekStart: formatDate(targetMonday),
      weekEnd: formatDate(targetSunday),
    };
  }

  async function loadData(w: number, y: number, freq: string) {
    setLoading(true);
    await Promise.all([
      loadAvailableTasks(freq),
      loadCurrentCalendar(w, y),
      loadActiveWorkOrders(),
    ]);
    setLoading(false);
  }

  async function loadActiveWorkOrders() {
    const { data } = await supabase
      .from("work_orders")
      .select("tool_number, wo_number, status")
      .in("status", ["OPEN", "IN PROGRESS"]);

    if (data) {
      const woMap: Record<string, ActiveWorkOrder> = {};
      (data as ActiveWorkOrder[]).forEach((wo) => {
        if (wo.tool_number && !woMap[wo.tool_number]) {
          woMap[wo.tool_number] = wo;
        }
      });
      setActiveWorkOrders(woMap);
    }
  }
  async function loadAvailableTasks(freq: string) {
    let query = supabase.from("pm_tasks").select("*");
    if (freq === "WEEKLY") query = query.eq("frequency", "1S");
    else if (freq === "MONTHLY")
      query = query.in("frequency", ["1L", "3L", "6L", "12L"]);
    else if (freq === "YEARLY")
      query = query.in("frequency", ["1A", "2A", "3A", "5A"]);

    const { data } = await query;
    if (data) {
      // CHANGE 1: Group by tool_number + frequency (no mixing intervals)
      const groups: {
        [packageKey: string]: {
          tool_number: string;
          equipment: string;
          frequency: string;
          count: number;
          totalMinutes: number;
          earliestNextDue: string | null;
          latestLastPm: string | null;
        };
      } = {};

      (data as PMTask[]).forEach((task) => {
        const freqKey = (task.frequency || "ON_DEMAND").trim().toUpperCase();
        const pkgKey = `${task.tool_number}__${freqKey}`;

        if (!groups[pkgKey]) {
          groups[pkgKey] = {
            tool_number: task.tool_number,
            equipment: task.equipment || "Unknown",
            frequency: freqKey,
            count: 0,
            totalMinutes: 0,
            earliestNextDue: null,
            latestLastPm: null,
          };
        }
        groups[pkgKey].count++;
        groups[pkgKey].totalMinutes += task.estimated_time || 0;

        if (task.next_due_at) {
          if (
            !groups[pkgKey].earliestNextDue ||
            new Date(task.next_due_at) <
              new Date(groups[pkgKey].earliestNextDue!)
          ) {
            groups[pkgKey].earliestNextDue = task.next_due_at;
          }
        }

        if (task.last_completed_at) {
          if (
            !groups[pkgKey].latestLastPm ||
            new Date(task.last_completed_at) >
              new Date(groups[pkgKey].latestLastPm!)
          ) {
            groups[pkgKey].latestLastPm = task.last_completed_at;
          }
        }
      });

      setPackages(
        Object.keys(groups)
          .sort()
          .map((pkgKey, idx) => {
            const g = groups[pkgKey];
            const catInfo = getPMCategoryInfo(g.frequency);
            return {
              package_key: pkgKey,
              tool_number: g.tool_number,
              equipment: g.equipment,
              frequency: g.frequency,
              category_label: catInfo.label,
              number_of_tasks: g.count,
              duration_minutes: g.totalMinutes,
              planned_day: DAYS_OF_WEEK[idx % DAYS_OF_WEEK.length],
              selected: false,
              shift: manualDefaultShift,
              earliest_next_due: g.earliestNextDue,
              latest_last_pm: g.latestLastPm,
            };
          }),
      );
    }
  }

  async function loadCurrentCalendar(w: number, y: number) {
    const { data } = await supabase
      .from("weekly_maintenance_plans")
      .select("*")
      .eq("week_number", w)
      .eq("year", y);

    if (data) setCalendarPlans(data as MaintenancePlan[]);
  }

  function handleFilterChange(freq: string) {
    setFrequencyFilter(freq);
    loadData(weekNumber, currentYear, freq);
  }

  // Helper to check if a specific PM package (tool_number + category) is already planned
  function isPackagePlanned(
    pkg: GroupedPMPackage,
    plans: MaintenancePlan[] = calendarPlans,
  ): MaintenancePlan | undefined {
    return plans.find(
      (p) =>
        p.tool_number === pkg.tool_number &&
        (!p.action ||
          p.action.includes(`[${pkg.frequency}]`) ||
          p.action.includes(pkg.category_label) ||
          !p.action.includes("[")),
    );
  }

  function handleCheckboxChange(packageKey: string, checked: boolean) {
    const target = packages.find((p) => p.package_key === packageKey);
    if (!target || activeWorkOrders[target.tool_number]) return;

    setPackages((prev) =>
      prev.map((p) =>
        p.package_key === packageKey ? { ...p, selected: checked } : p,
      ),
    );
  }

  function handleSelectAllChange(checked: boolean) {
    setPackages((prev) =>
      prev.map((p) =>
        isPackagePlanned(p) || Boolean(activeWorkOrders[p.tool_number])
          ? p
          : { ...p, selected: checked },
      ),
    );
  }

  function handleDurationChange(packageKey: string, val: number) {
    setPackages((prev) =>
      prev.map((p) =>
        p.package_key === packageKey ? { ...p, duration_minutes: val } : p,
      ),
    );
  }

  function handleDayChange(packageKey: string, val: string) {
    setPackages((prev) =>
      prev.map((p) =>
        p.package_key === packageKey ? { ...p, planned_day: val } : p,
      ),
    );
  }

  function handleShiftChange(packageKey: string, val: string) {
    setPackages((prev) =>
      prev.map((p) =>
        p.package_key === packageKey ? { ...p, shift: val } : p,
      ),
    );
  }
  async function sendToProduction() {
    if (calendarPlans.length === 0) {
      alert("Nu există utilaje planificate pentru această săptămână.");
      return;
    }

    const existingPlanWithToken = calendarPlans.find(
      (p) => p.approval_token && p.approval_token.trim() !== "",
    );
    let token = existingPlanWithToken
      ? existingPlanWithToken.approval_token
      : null;
    if (!token) {
      token =
        "tok_" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from("weekly_maintenance_plans")
        .update({ approval_token: token })
        .eq("week_number", weekNumber)
        .eq("year", currentYear);

      if (error) {
        alert(`Eroare la generarea token-ului: ${error.message}`);
        return;
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setShareUrl(`${baseUrl}/approval/${token}`);
    setShowShareModal(true);
    await loadCurrentCalendar(weekNumber, currentYear);
  }

  async function clearPlan() {
    if (!confirm("Sigur dorești să ștergi întregul plan?")) return;
    setLoading(true);
    await supabase
      .from("weekly_maintenance_plans")
      .delete()
      .eq("week_number", weekNumber)
      .eq("year", currentYear);
    setLoading(false);
    setCalendarPlans([]);
  }

  // =========================================================
  // CHANGE 5, 6 & 9: AUTO PLAN WITH DAY + SHIFT BALANCING & ELIGIBILITY
  // =========================================================
  async function autoGeneratePlan() {
    setLoading(true);
    try {
      // Preserve rejected records so they are respected and not re-planned
      const rejectedPlans = calendarPlans.filter(
        (p) => p.production_status === "REJECTED",
      );

      // Delete non-rejected plans for the week before regenerating balanced schedule
      await supabase
        .from("weekly_maintenance_plans")
        .delete()
        .eq("week_number", weekNumber)
        .eq("year", currentYear)
        .neq("production_status", "REJECTED");

      const { weekStart, weekEnd } = getWeekDateRange(weekNumber, currentYear);
      const { weekStart: nextWeekStart, weekEnd: nextWeekEnd } =
        getWeekDateRange(weekNumber + 1, currentYear);

      // Build eligible PM packages from loaded tasks that are Overdue or Due in Selected/Next Week
      const eligiblePackages = packages.filter((pkg) => {
        // 1. Invalid next_due_at check
        if (!pkg.earliest_next_due) return false;
        const dueDate = new Date(pkg.earliest_next_due);
        if (isNaN(dueDate.getTime())) return false;

        // 2. Skip if OPEN or IN PROGRESS Work Order exists
        if (activeWorkOrders[pkg.tool_number]) return false;

        // 3. Skip if rejected production record exists for this package/tool
        const hasRejected = rejectedPlans.some(
          (rp) =>
            rp.tool_number === pkg.tool_number &&
            (!rp.action || rp.action.includes(`[${pkg.frequency}]`)),
        );
        if (hasRejected) return false;

        // 4. Eligible if Overdue, Due This Week, or Due Next Week
        const daysUntil = getDaysUntilDue(pkg.earliest_next_due);
        const isOverdue = daysUntil !== null && daysUntil < 0;
        const isThisWeek = isDueInWeekRange(
          pkg.earliest_next_due,
          weekStart,
          weekEnd,
        );
        const isNextWeek = isDueInWeekRange(
          pkg.earliest_next_due,
          nextWeekStart,
          nextWeekEnd,
        );

        return isOverdue || isThisWeek || isNextWeek;
      });

      if (eligiblePackages.length === 0) {
        await loadCurrentCalendar(weekNumber, currentYear);
        return;
      }

      // Sort by priority (Overdue first) and descending duration (Longest Processing Time first for optimal balancing)
      const sortedPackages = [...eligiblePackages].sort((a, b) => {
        const rankA = getPlanningPriorityRank(
          a,
          nextWeekStart,
          nextWeekEnd,
        ).rank;
        const rankB = getPlanningPriorityRank(
          b,
          nextWeekStart,
          nextWeekEnd,
        ).rank;
        if (rankA !== rankB) return rankA - rankB;
        return b.duration_minutes - a.duration_minutes;
      });

      // Track load per day and per shift: dayShiftLoad[DAY][SHIFT] = minutes
      const dayShiftLoad: Record<string, Record<string, number>> = {};
      DAYS_OF_WEEK.forEach((d) => {
        dayShiftLoad[d] = {
          "SHIFT 1": 0,
          "SHIFT 2": 0,
          "SHIFT 3": 0,
        };
      });

      // Seed existing rejected plans load if any remain on calendar
      rejectedPlans.forEach((rp) => {
        const d = (rp.planned_day || "MONDAY").toUpperCase();
        const s = (rp.shift || "SHIFT 1").toUpperCase();
        if (dayShiftLoad[d] && dayShiftLoad[d][s] !== undefined) {
          dayShiftLoad[d][s] += rp.duration_minutes || 0;
        }
      });

      const records = sortedPackages.map((pkg) => {
        // Step 1: Find day with lowest total load across all 3 shifts
        let bestDay = DAYS_OF_WEEK[0];
        let lowestDayTotal = Infinity;

        for (const day of DAYS_OF_WEEK) {
          const dayTotal =
            dayShiftLoad[day]["SHIFT 1"] +
            dayShiftLoad[day]["SHIFT 2"] +
            dayShiftLoad[day]["SHIFT 3"];
          if (dayTotal < lowestDayTotal) {
            lowestDayTotal = dayTotal;
            bestDay = day;
          }
        }

        // Step 2: Inside bestDay, assign to the shift with the LOWEST current load
        let bestShift = SHIFT_OPTIONS[0];
        let lowestShiftLoad = Infinity;

        for (const shift of SHIFT_OPTIONS) {
          if (dayShiftLoad[bestDay][shift] < lowestShiftLoad) {
            lowestShiftLoad = dayShiftLoad[bestDay][shift];
            bestShift = shift;
          }
        }

        // Update cumulative load for subsequent packages
        dayShiftLoad[bestDay][bestShift] += pkg.duration_minutes || 0;

        return {
          week_number: weekNumber,
          year: currentYear,
          planned_day: bestDay,
          tool_number: pkg.tool_number,
          machine_name: pkg.equipment,
          action: `[${pkg.frequency}] ${pkg.category_label} PM (${pkg.number_of_tasks} tasks)`,
          duration_minutes: pkg.duration_minutes,
          status: "PENDING",
          production_status: "PENDING",
          shift: bestShift,
        };
      });

      if (records.length > 0) {
        await supabase.from("weekly_maintenance_plans").insert(records);
      }
      await loadCurrentCalendar(weekNumber, currentYear);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  async function manualGeneratePlan() {
    const validSelected = packages.filter(
      (p) =>
        p.selected && !activeWorkOrders[p.tool_number] && !isPackagePlanned(p),
    );
    if (validSelected.length === 0) return;

    setLoading(true);
    const records = validSelected.map((p) => ({
      week_number: weekNumber,
      year: currentYear,
      planned_day: p.planned_day,
      tool_number: p.tool_number,
      machine_name: p.equipment,
      action: `[${p.frequency}] ${p.category_label} Manual PM (${p.number_of_tasks} tasks)`,
      duration_minutes: p.duration_minutes,
      status: "PENDING",
      production_status: "PENDING",
      shift: p.shift || manualDefaultShift,
    }));
    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .insert(records);
    if (!error) {
      await loadCurrentCalendar(weekNumber, currentYear);
      setPackages((prev) =>
        prev.map((p) => (p.selected ? { ...p, selected: false } : p)),
      );
    }
    setLoading(false);
  }

  async function updatePlannedDay(planId: string, targetDay: string) {
    const previousState = [...calendarPlans];
    setCalendarPlans((prev) =>
      prev.map((p) =>
        String(p.id) === planId ? { ...p, planned_day: targetDay } : p,
      ),
    );

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .update({ planned_day: targetDay })
      .eq("id", planId);

    if (error) setCalendarPlans(previousState);
  }

  async function deletePlanTask(planId: string) {
    if (!confirm("Sigur dorești să ștergi acest pachet PM?")) return;
    setCalendarPlans((prev) => prev.filter((p) => String(p.id) !== planId));

    await supabase.from("weekly_maintenance_plans").delete().eq("id", planId);
    await loadCurrentCalendar(weekNumber, currentYear);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const planId = String(active.id);
    const targetDay = String(over.id);
    const dragged = calendarPlans.find((p) => String(p.id) === planId);

    if (dragged && dragged.planned_day !== targetDay)
      updatePlannedDay(planId, targetDay);
  }

  function getDateFromPlannedDay(
    weekNum: number,
    yr: number,
    plannedDay: string,
  ): string {
    const fourthOfJanuary = new Date(yr, 0, 4);
    const dayOfWeek = fourthOfJanuary.getDay();
    const isoWeek1Monday = new Date(fourthOfJanuary);
    isoWeek1Monday.setDate(
      fourthOfJanuary.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
    );

    const targetMonday = new Date(isoWeek1Monday);
    targetMonday.setDate(isoWeek1Monday.getDate() + (weekNum - 1) * 7);
    const actualDate = new Date(targetMonday);

    const dayOffsets: { [key: string]: number } = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };

    actualDate.setTime(
      targetMonday.getTime() +
        (dayOffsets[plannedDay.toUpperCase()] ?? 0) * 86400000,
    );

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${String(actualDate.getDate()).padStart(2, "0")}-${months[actualDate.getMonth()]}-${actualDate.getFullYear()}`;
  }
  function exportPDF() {
    const doc = new jsPDF();

    doc
      .setFont("helvetica", "bold")
      .setFontSize(20)
      .text("WEEKLY PREVENTIVE MAINTENANCE REQUEST", 14, 20);
    doc.setFontSize(12).text(`Week ${weekNumber} / ${currentYear}`, 14, 27);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(10)
      .text("Please review proposed downtime windows.", 14, 33);

    const sourceData =
      calendarPlans.length > 0
        ? [...calendarPlans].sort(
            (a, b) =>
              DAYS_OF_WEEK.indexOf(a.planned_day) -
              DAYS_OF_WEEK.indexOf(b.planned_day),
          )
        : packages
            .map((p) => ({
              planned_day: p.planned_day,
              shift: p.shift,
              tool_number: p.tool_number,
              machine_name: `${p.equipment} (${p.category_label})`,
              duration_minutes: p.duration_minutes,
            }))
            .sort(
              (a, b) =>
                DAYS_OF_WEEK.indexOf(a.planned_day) -
                DAYS_OF_WEEK.indexOf(b.planned_day),
            );

    const totalMachines = sourceData.length;
    const totalMinutes = sourceData.reduce(
      (sum, item) => sum + (item.duration_minutes || 0),
      0,
    );
    const totalHours = (totalMinutes / 60).toFixed(1);

    const body = sourceData.map((p) => [
      getDateFromPlannedDay(weekNumber, currentYear, p.planned_day),
      p.shift || "SHIFT 1",
      p.tool_number,
      p.machine_name || "N/A",
      `${p.duration_minutes} min`,
      "  [  ] OK   [  ] REJ",
    ]);

    autoTable(doc, {
      startY: 43,
      head: [
        [
          "Date",
          "Shift",
          "Machine ID",
          "Equipment / PM",
          "Duration",
          "Confirmation",
        ],
      ],
      body: body,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 45;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`Total Planned PM Packages: ${totalMachines}`, 14, finalY + 12);
    doc.text(
      `Total Maintenance Time: ${totalMinutes} min (~${totalHours} hours)`,
      14,
      finalY + 18,
    );

    const signatureY = finalY + 40;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, signatureY - 10, 196, signatureY - 10);

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("Prepared By (Maintenance Lead):", 14, signatureY);
    doc.line(14, signatureY + 15, 80, signatureY + 15);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Date: ____ / ____ / ________", 14, signatureY + 22);

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Approved By (Production Manager):", 120, signatureY);
    doc.line(120, signatureY + 15, 186, signatureY + 15);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Date: ____ / ____ / ________", 120, signatureY + 22);

    doc.save(`Production_Downtime_Request_W${weekNumber}_${currentYear}.pdf`);
  }

  // CHANGE 2: Render user-friendly PM Category Badge
  function renderPMCategoryBadge(freq: string) {
    const info = getPMCategoryInfo(freq);
    return (
      <span
        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${info.style}`}
      >
        {info.label}
      </span>
    );
  }

  function renderNextDueBadge(nextDueAt: string | null) {
    if (!nextDueAt) {
      return <span className="text-xs text-slate-400 italic">Not set</span>;
    }
    const daysUntil = getDaysUntilDue(nextDueAt);
    const formatted = formatDisplayDate(nextDueAt);

    let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (daysUntil !== null && daysUntil < 0) {
      colorClass = "bg-red-50 text-red-700 border-red-200";
    } else if (daysUntil !== null && daysUntil <= 7) {
      colorClass = "bg-amber-50 text-amber-700 border-amber-200";
    }

    return (
      <span
        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${colorClass}`}
      >
        {formatted}
      </span>
    );
  }
  // CHANGE 10: Planning-oriented KPIs (OVERDUE PM, NEXT WEEK PM, NEXT MONTH PM, ACTIVE WO CONFLICTS)
  const planningKPIs = useMemo(() => {
    const { weekStart: nextWeekStart, weekEnd: nextWeekEnd } = getWeekDateRange(
      weekNumber + 1,
      currentYear,
    );

    let overdueCount = 0;
    let nextWeekCount = 0;
    let nextMonthCount = 0;
    let activeWoConflicts = 0;

    packages.forEach((pkg) => {
      const daysUntil = getDaysUntilDue(pkg.earliest_next_due);
      const freq = (pkg.frequency || "").trim().toUpperCase();

      if (daysUntil !== null && daysUntil < 0) {
        overdueCount++;
      }
      if (isDueInWeekRange(pkg.earliest_next_due, nextWeekStart, nextWeekEnd)) {
        nextWeekCount++;
      }
      if (freq === "1L") {
        nextMonthCount++;
      }
      if (activeWorkOrders[pkg.tool_number]) {
        activeWoConflicts++;
      }
    });

    return {
      overdueCount,
      nextWeekCount,
      nextMonthCount,
      activeWoConflicts,
    };
  }, [packages, activeWorkOrders, weekNumber, currentYear]);

  // CHANGE 3, 4 & 8: Filter by future maintenance horizon & sort by Planning Priority
  const processedPackages = useMemo(() => {
    const { weekStart: nextWeekStart, weekEnd: nextWeekEnd } = getWeekDateRange(
      weekNumber + 1,
      currentYear,
    );

    const enriched = packages.map((pkg) => {
      const priorityInfo = getPlanningPriorityRank(
        pkg,
        nextWeekStart,
        nextWeekEnd,
      );
      const planData = isPackagePlanned(pkg, calendarPlans);
      const isAlreadyPlanned = Boolean(planData);
      const activeWO = activeWorkOrders[pkg.tool_number] || null;

      return {
        ...pkg,
        priorityInfo,
        isAlreadyPlanned,
        planData,
        activeWO,
      };
    });

    const filtered = enriched.filter((item) => {
      const daysUntil = getDaysUntilDue(item.earliest_next_due);
      const freq = (item.frequency || "").trim().toUpperCase();

      // CHANGE 3: Future Maintenance Filter Rules
      switch (futureFilter) {
        case "OVERDUE":
          if (!(daysUntil !== null && daysUntil < 0)) return false;
          break;
        case "NEXT WEEK":
          if (
            !isDueInWeekRange(
              item.earliest_next_due,
              nextWeekStart,
              nextWeekEnd,
            )
          )
            return false;
          break;
        case "NEXT MONTH":
          if (freq !== "1L") return false;
          break;
        case "NEXT 3 MONTHS":
          if (freq !== "3L") return false;
          break;
        case "NEXT 6 MONTHS":
          if (freq !== "6L") return false;
          break;
        case "NEXT YEAR":
          if (!["1A", "2A", "3A", "5A"].includes(freq)) return false;
          break;
        case "ALL":
        default:
          break;
      }

      // Approval View filter
      if (
        approvalFilter !== "ALL" &&
        item.planData?.production_status !== approvalFilter
      ) {
        if (!(approvalFilter === "PENDING" && !item.isAlreadyPlanned)) {
          return false;
        }
      }

      return true;
    });

    // CHANGE 8: Priority order (1. OVERDUE -> 2. NEXT WEEK -> 3. NEXT MONTH -> 4. NEXT 3M -> 5. NEXT 6M -> 6. NEXT YEAR)
    return filtered.sort((a, b) => {
      if (sortBy === "PRIORITY") {
        if (a.priorityInfo.rank !== b.priorityInfo.rank) {
          return a.priorityInfo.rank - b.priorityInfo.rank;
        }
        if (!a.earliest_next_due && !b.earliest_next_due)
          return a.tool_number.localeCompare(b.tool_number);
        if (!a.earliest_next_due) return 1;
        if (!b.earliest_next_due) return -1;
        return (
          new Date(a.earliest_next_due).getTime() -
          new Date(b.earliest_next_due).getTime()
        );
      }

      // Secondary sorts keep OVERDUE first
      const aOverdue = a.priorityInfo.rank === 1 ? 0 : 1;
      const bOverdue = b.priorityInfo.rank === 1 ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      switch (sortBy) {
        case "TOOL_NUMBER":
          return a.tool_number.localeCompare(b.tool_number);
        case "DURATION_DESC":
          return b.duration_minutes - a.duration_minutes;
        case "DURATION_ASC":
          return a.duration_minutes - b.duration_minutes;
        case "TASKS_COUNT":
          return b.number_of_tasks - a.number_of_tasks;
        case "NEXT_DUE":
        default: {
          if (!a.earliest_next_due && !b.earliest_next_due) return 0;
          if (!a.earliest_next_due) return 1;
          if (!b.earliest_next_due) return -1;
          return (
            new Date(a.earliest_next_due).getTime() -
            new Date(b.earliest_next_due).getTime()
          );
        }
      }
    });
  }, [
    packages,
    calendarPlans,
    activeWorkOrders,
    weekNumber,
    currentYear,
    futureFilter,
    approvalFilter,
    sortBy,
  ]);
  return (
    <div className="p-6 max-w-[1650px] mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Weekly Preventive Maintenance Planner
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <span>Week:</span>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setWeekNumber(w);
                  loadData(w, currentYear, frequencyFilter);
                }}
                className="w-14 border rounded text-center font-bold bg-white py-1"
              />
              <span>Year:</span>
              <input
                type="number"
                value={currentYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setCurrentYear(y);
                  loadData(weekNumber, y, frequencyFilter);
                }}
                className="w-20 border rounded text-center font-bold bg-white py-1"
              />
            </div>

            {/* CHANGE 3: Future Maintenance Horizon Filters */}
            <div className="inline-flex flex-wrap rounded-lg border bg-slate-100 p-0.5">
              <span className="text-xs text-slate-400 self-center px-2 font-semibold">
                Horizon:
              </span>
              {FUTURE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFutureFilter(opt)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    futureFilter === opt
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Approval Filter */}
            <div className="inline-flex rounded-lg border bg-slate-100 p-0.5">
              <span className="text-xs text-slate-400 self-center px-2">
                Approval:
              </span>
              {APPROVAL_FILTERS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setApprovalFilter(opt)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                    approvalFilter === opt
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Sorting Selector */}
            <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1">
              <span className="text-xs text-slate-400 font-semibold">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CHANGE 6: Dropdown kept strictly for Manual Plan mode */}
          <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Manual Shift:
            </span>
            <select
              value={manualDefaultShift}
              onChange={(e) => {
                const newShift = e.target.value;
                setManualDefaultShift(newShift);
                setPackages((prev) =>
                  prev.map((p) =>
                    !isPackagePlanned(p) ? { ...p, shift: newShift } : p,
                  ),
                );
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              {SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={autoGeneratePlan}
            title="Automatically balances load across days and shifts"
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            🤖 Auto Plan (Balanced)
          </button>
          <button
            onClick={manualGeneratePlan}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ✍️ Manual Plan
          </button>
          <button
            onClick={exportPDF}
            className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={sendToProduction}
            className="bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            📧 Send To Production
          </button>
          <button
            onClick={clearPlan}
            className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* CHANGE 10: Planning-Oriented KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setFutureFilter("OVERDUE")}
          className="cursor-pointer bg-white border border-red-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between hover:bg-red-50/30 transition-colors"
        >
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              OVERDUE PM
            </p>
            <p className="text-2xl font-black text-red-600">
              {planningKPIs.overdueCount}
            </p>
          </div>
          <span className="text-2xl">🚨</span>
        </div>
        <div
          onClick={() => setFutureFilter("NEXT WEEK")}
          className="cursor-pointer bg-white border border-amber-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between hover:bg-amber-50/30 transition-colors"
        >
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              NEXT WEEK PM
            </p>
            <p className="text-2xl font-black text-amber-600">
              {planningKPIs.nextWeekCount}
            </p>
          </div>
          <span className="text-2xl">📆</span>
        </div>
        <div
          onClick={() => setFutureFilter("NEXT MONTH")}
          className="cursor-pointer bg-white border border-blue-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between hover:bg-blue-50/30 transition-colors"
        >
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              NEXT MONTH PM
            </p>
            <p className="text-2xl font-black text-blue-600">
              {planningKPIs.nextMonthCount}
            </p>
          </div>
          <span className="text-2xl">🗓️</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              ACTIVE WO CONFLICTS
            </p>
            <p className="text-2xl font-black text-slate-800">
              {planningKPIs.activeWoConflicts}
            </p>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>
      </div>
      {loading ? (
        <p className="text-center py-12 text-slate-500 font-medium">
          Loading data...
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1150px]">
                <thead>
                  <tr className="border-b bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          handleSelectAllChange(e.target.checked)
                        }
                      />
                    </th>
                    <th className="px-2">Tool</th>
                    {/* CHANGE 2: New PM Category Column */}
                    <th className="px-2">PM Category</th>
                    <th className="px-2">Equipment</th>
                    <th className="px-2">Active WO</th>
                    <th className="px-2">Last PM</th>
                    <th className="px-2">Next Due</th>
                    <th className="px-2">Priority</th>
                    <th className="px-1 text-center">Tasks</th>
                    <th className="px-1 text-center w-20">Duration</th>
                    <th className="px-2 w-28">Shift</th>
                    <th className="px-2 w-32">Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-slate-700">
                  {processedPackages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-10 text-slate-400 italic"
                      >
                        No PM packages match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    processedPackages.map((pkg) => {
                      const {
                        isAlreadyPlanned,
                        planData,
                        activeWO,
                        priorityInfo,
                      } = pkg;
                      const hasActiveWO = Boolean(activeWO);
                      const isRowDisabled = isAlreadyPlanned || hasActiveWO;

                      return (
                        <tr
                          key={pkg.package_key}
                          className={
                            hasActiveWO
                              ? "bg-slate-100/90 text-slate-400 opacity-75"
                              : isAlreadyPlanned
                                ? "bg-emerald-50/60"
                                : "hover:bg-slate-50"
                          }
                        >
                          <td className="text-center py-3">
                            <input
                              type="checkbox"
                              checked={isAlreadyPlanned ? true : pkg.selected}
                              disabled={isRowDisabled}
                              onChange={(e) =>
                                handleCheckboxChange(
                                  pkg.package_key,
                                  e.target.checked,
                                )
                              }
                            />
                          </td>
                          <td className="font-mono font-bold px-2 whitespace-nowrap">
                            {pkg.tool_number}
                          </td>
                          <td className="px-2 whitespace-nowrap">
                            {renderPMCategoryBadge(pkg.frequency)}
                          </td>
                          <td
                            className="px-2 max-w-[180px] truncate"
                            title={pkg.equipment}
                          >
                            <div>{pkg.equipment}</div>
                            {activeWO && (
                              <span className="inline-block mt-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                                ⚠ Active WO: {activeWO.wo_number} (
                                {activeWO.status})
                              </span>
                            )}
                          </td>
                          <td className="px-2 font-mono text-xs font-bold whitespace-nowrap">
                            {activeWO ? (
                              <span className="text-amber-700">
                                {activeWO.wo_number}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-2 text-xs text-slate-600 whitespace-nowrap">
                            {formatDisplayDate(pkg.latest_last_pm)}
                          </td>
                          <td className="px-2 whitespace-nowrap">
                            {renderNextDueBadge(pkg.earliest_next_due)}
                          </td>
                          <td className="px-2 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap ${priorityInfo.badgeStyle}`}
                            >
                              {priorityInfo.badgeLabel}
                            </span>
                          </td>
                          <td className="text-center px-1 font-semibold">
                            {pkg.number_of_tasks}
                          </td>
                          <td className="px-1">
                            <input
                              type="number"
                              value={pkg.duration_minutes}
                              disabled={isRowDisabled}
                              onChange={(e) =>
                                handleDurationChange(
                                  pkg.package_key,
                                  Number(e.target.value),
                                )
                              }
                              className="w-full border rounded text-center bg-white py-0.5 text-xs font-semibold disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2">
                            <select
                              value={planData?.shift || pkg.shift}
                              disabled={isRowDisabled}
                              onChange={(e) =>
                                handleShiftChange(
                                  pkg.package_key,
                                  e.target.value,
                                )
                              }
                              className="w-full border rounded p-1 bg-white text-xs font-semibold disabled:bg-slate-100"
                            >
                              {SHIFT_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2">
                            <select
                              value={planData?.planned_day || pkg.planned_day}
                              disabled={isRowDisabled}
                              onChange={(e) =>
                                handleDayChange(pkg.package_key, e.target.value)
                              }
                              className="w-full border rounded p-1 bg-white text-xs font-semibold disabled:bg-slate-100"
                            >
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5 self-start">
            <h2 className="text-xl font-bold text-slate-900 mb-5 border-b pb-3">
              📅 Weekly Calendar
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-5">
                {DAYS_OF_WEEK.map((day) => {
                  const dayPlans = calendarPlans.filter(
                    (p) =>
                      String(p.planned_day).trim().toUpperCase() ===
                      day.toUpperCase(),
                  );

                  // CHANGE 7: Shift load calculation per day
                  const shift1Min = dayPlans
                    .filter((p) => (p.shift || "SHIFT 1") === "SHIFT 1")
                    .reduce((sum, p) => sum + (p.duration_minutes || 0), 0);
                  const shift2Min = dayPlans
                    .filter((p) => p.shift === "SHIFT 2")
                    .reduce((sum, p) => sum + (p.duration_minutes || 0), 0);
                  const shift3Min = dayPlans
                    .filter((p) => p.shift === "SHIFT 3")
                    .reduce((sum, p) => sum + (p.duration_minutes || 0), 0);
                  const totalDayMinutes = shift1Min + shift2Min + shift3Min;

                  return (
                    <DroppableContainer
                      key={day}
                      id={day}
                      label={day}
                      totalMinutes={totalDayMinutes}
                      shiftLoads={{
                        shift1: shift1Min,
                        shift2: shift2Min,
                        shift3: shift3Min,
                      }}
                    >
                      {dayPlans.map((plan) => (
                        <DraggableCard
                          key={plan.id}
                          id={plan.id}
                          toolNumber={plan.tool_number}
                          action={plan.action}
                          duration={plan.duration_minutes}
                          shift={plan.shift}
                          status={plan.production_status}
                          comment={plan.production_comment}
                          onDelete={deletePlanTask}
                        />
                      ))}
                    </DroppableContainer>
                  );
                })}
              </div>
            </DndContext>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border">
            <div className="text-center mb-4">
              <span className="text-3xl">🔒</span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Link de Aprobare Securizat
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Producția va accesa doar tabelul izolat public.
              </p>
            </div>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full border p-2.5 rounded-lg text-xs bg-slate-50 font-mono mb-4 text-blue-600 font-bold text-center select-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link copiat!");
                }}
                className="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copiază URL
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// CHANGE 7: DroppableContainer displaying Shift 1, Shift 2, Shift 3 loads below day header
function DroppableContainer({
  id,
  label,
  totalMinutes,
  shiftLoads,
  children,
}: {
  id: string;
  label: string;
  totalMinutes: number;
  shiftLoads: { shift1: number; shift2: number; shift3: number };
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: String(id) });
  const totalHours = (totalMinutes / 60).toFixed(1);

  let capacityBadge = {
    text: "🟢 Capacity OK",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardBorder: "border-slate-200",
  };

  if (totalMinutes > 480) {
    capacityBadge = {
      text: "🔴 Overloaded",
      badgeStyle: "bg-red-50 text-red-700 border-red-200",
      cardBorder: "border-red-300 bg-red-50/20",
    };
  } else if (totalMinutes > 360) {
    capacityBadge = {
      text: "🟡 Near Capacity",
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
      cardBorder: "border-amber-300 bg-amber-50/20",
    };
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-xl border min-h-[135px] transition-colors ${
        isOver ? "border-blue-500 bg-blue-50" : capacityBadge.cardBorder
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
            {label}
          </h3>
          <p className="text-[11px] font-bold text-slate-500">
            Total: {totalMinutes} min ({totalHours} h)
          </p>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${capacityBadge.badgeStyle}`}
        >
          {capacityBadge.text}
        </span>
      </div>

      {/* Shift load breakdown below day header */}
      <div className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100/80 rounded px-2 py-1 mb-2.5 space-y-0.5">
        <div>Shift 1 = {shiftLoads.shift1} min</div>
        <div>Shift 2 = {shiftLoads.shift2} min</div>
        <div>Shift 3 = {shiftLoads.shift3} min</div>
      </div>

      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DraggableCard({
  id,
  toolNumber,
  action,
  duration,
  shift,
  status,
  comment,
  onDelete,
}: {
  id: string;
  toolNumber: string;
  action?: string;
  duration: number;
  shift?: string;
  status?: string;
  comment?: string | null;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: String(id) });
  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
  };
  const icons: { [key: string]: string } = {
    APPROVED: "🟢",
    REJECTED: "🔴",
    PENDING: "🟡",
  };

  const freqMatch = action?.match(/^\[([^\]]+)\]/);
  const freqTag = freqMatch ? freqMatch[1] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex flex-col text-sm bg-white px-3 py-1.5 rounded-lg border select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-30 scale-95"
          : status === "REJECTED"
            ? "shadow-sm border-red-300 bg-red-50/20 hover:bg-red-50/40 transition-colors"
            : "shadow-sm border-slate-200 hover:bg-slate-50 transition-colors"
      }`}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="text-slate-300 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
          <span className="font-mono font-black text-slate-800">
            {toolNumber}
          </span>
          {freqTag && (
            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded font-bold">
              {freqTag}
            </span>
          )}
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold">
            {shift?.replace("SHIFT ", "S") || "S1"}
          </span>
          <span title={`Status: ${status || "PENDING"}`}>
            {icons[status || "PENDING"]}
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border">
          {duration}m
        </span>
      </div>

      {/* Afișare comentariu de la producție */}
      {comment && comment.trim().length > 0 && (
        <div
          className={`mt-1.5 text-[11px] font-medium px-2 py-1 rounded border leading-snug ${
            status === "REJECTED"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-blue-50/70 text-slate-700 border-blue-200"
          }`}
        >
          💬 {comment}
        </div>
      )}
    </div>
  );
}
