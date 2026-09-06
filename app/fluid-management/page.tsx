"use client";

import * as React from "react";
import {
  Plus,
  Droplets,
  DollarSign,
  Activity,
  RefreshCw,
  Calendar,
  User,
  FileText,
  Cpu,
  Layers,
  AlertCircle,
  Calculator,
  Wrench,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FluidMaster {
  fluid_name: string;
  fluid_type: string;
  price_per_liter: number;
}

export interface FluidTransaction {
  id: string;
  equipment_name: string;
  system_name: string;
  fluid_name: string;
  fluid_type: string;
  transaction_type: "Full Change" | "Top Up";
  quantity_liters: number;
  price_per_liter: number;
  total_cost: number;
  operating_hours: number;
  transaction_date: string;
  technician_name: string;
  notes: string;
  created_at: string;
}

interface FormInputs {
  equipment_name: string;
  system_name: string;
  fluid_name: string;
  fluid_type: string;
  transaction_type: "Full Change" | "Top Up";
  quantity_liters: number;
  price_per_liter: number;
  operating_hours: number;
  transaction_date: string;
  technician_name: string;
  notes: string;
}

interface TechnicianRecord {
  id: number;
  name: string;
}

const useToast = () => ({
  toast: ({
    title,
    description,
    variant,
  }: {
    title: string;
    description?: string;
    variant?: string;
  }) => {
    alert(
      `${variant === "destructive" ? "❌" : "✅"} ${title}\n${description || ""}`,
    );
  },
});

interface ToolRecord {
  id: number;
  tool_number: string;
  machine_name: string;
}

export default function FluidManagementPage() {
  const [toolsList, setToolsList] = React.useState<ToolRecord[]>([]);
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<FluidTransaction[]>(
    [],
  );
  const [techniciansList, setTechniciansList] = React.useState<
    TechnicianRecord[]
  >([]);
  const [fluidMasterList, setFluidMasterList] = React.useState<FluidMaster[]>(
    [],
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSubmitLoading, setIsSubmitLoading] = React.useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false);
  const systemOptions = [
    "Hydraulic Unit",
    "Automatic Lubrication",
    "Transfer Gearbox",
    "Main Gearbox",
    "Slide Guides",
    "Cooling System",
    "Other",
  ];

  const { register, handleSubmit, watch, setValue, reset } =
    useForm<FormInputs>({
      defaultValues: {
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "Top Up",
        quantity_liters: 0,
        price_per_liter: 0,
        operating_hours: 0,
        fluid_name: "",
        fluid_type: "",
        equipment_name: "",
        system_name: "",
        technician_name: "",
        notes: "",
      },
    });

  React.useEffect(() => {
    register("equipment_name");
    register("system_name");
    register("fluid_name");
    register("technician_name");
  }, [register]);

  const watchQuantity = watch("quantity_liters");
  const watchPrice = watch("price_per_liter");

  const calculatedTotalCost = React.useMemo(() => {
    const qty = Number(watchQuantity) || 0;
    const price = Number(watchPrice) || 0;
    return Number((qty * price).toFixed(2));
  }, [watchQuantity, watchPrice]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("id, tool_number, machine_name")
        .order("tool_number");

      if (toolsError) throw toolsError;

      setToolsList(toolsData || []);

      const { data: techniciansData, error: techniciansError } = await supabase
        .from("technicians")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (techniciansError) throw techniciansError;

      setTechniciansList(techniciansData || []);

      const { data: masterData, error: masterError } = await supabase
        .from("fluid_master")
        .select("fluid_name, fluid_type, price_per_liter");
      if (masterError) throw masterError;
      setFluidMasterList((masterData as FluidMaster[]) || []);

      const { data: txData, error: txError } = await supabase
        .from("fluid_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (txError) throw txError;
      setTransactions((txData as FluidTransaction[]) || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not retrieve records from database.";
      toast({
        variant: "destructive",
        title: "Error loading records",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleFluidChange = (
    selectedName: string | null,
    _eventDetails?: unknown,
  ) => {
    if (!selectedName) return;

    setValue("fluid_name", selectedName);

    const matchedFluid = fluidMasterList.find(
      (f) => f.fluid_name === selectedName,
    );

    if (matchedFluid) {
      setValue("fluid_type", matchedFluid.fluid_type);
      setValue("price_per_liter", Number(matchedFluid.price_per_liter));
    }
  };
  const onSubmit = async (formData: FormInputs) => {
    setIsSubmitLoading(true);
    try {
      const finalPayload = {
        ...formData,
        quantity_liters: Number(formData.quantity_liters),
        price_per_liter: Number(formData.price_per_liter),
        operating_hours: Number(formData.operating_hours),
        total_cost: calculatedTotalCost,
      };

      const { error } = await supabase
        .from("fluid_transactions")
        .insert([finalPayload]);
      if (error) throw error;

      toast({
        variant: "default",
        title: "Transaction saved",
        description: "The fluid log metric entry was added successfully.",
      });

      setIsDialogOpen(false);
      reset({
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "Top Up",
        quantity_liters: 0,
        price_per_liter: 0,
        operating_hours: 0,
        fluid_name: "",
        fluid_type: "",
        equipment_name: "",
        system_name: "",
        technician_name: "",
        notes: "",
      });
      fetchData();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An issue occurred while pushing to database server.";
      toast({
        variant: "destructive",
        title: "Failed to save record",
        description: message,
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const kpis = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalCostYTD = 0;
    let totalConsumptionLiters = 0;
    let topUpsThisMonth = 0;
    let fullChangesThisMonth = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.transaction_date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (txYear === currentYear) {
        totalCostYTD += tx.total_cost || 0;
      }

      totalConsumptionLiters += tx.quantity_liters || 0;

      if (txYear === currentYear && txMonth === currentMonth) {
        if (tx.transaction_type === "Top Up") {
          topUpsThisMonth++;
        } else if (tx.transaction_type === "Full Change") {
          fullChangesThisMonth++;
        }
      }
    });

    return {
      totalCostYTD: totalCostYTD.toFixed(2),
      totalConsumptionLiters: totalConsumptionLiters.toFixed(1),
      topUpsThisMonth,
      fullChangesThisMonth,
    };
  }, [transactions]);
  return (
    <div className="w-full min-h-screen p-4 md:p-8 space-y-8 bg-gradient-to-b from-background via-muted/20 to-background text-foreground antialiased">
      {/* Premium Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 shadow-xl dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex p-3.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Droplets className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                Fluid Management
              </h1>
              <p className="text-zinc-400 text-sm md:text-base mt-1 max-w-xl font-medium">
                Enterprise asset optimization ledger. Track, audit, and log
                precision industrial fluids and lubrication parameters.
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {/* PASUL 1: Adaugă proprietatea asChild aici */}
            <DialogTrigger>
              <span className="group relative inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-500 transition-all duration-300 h-12 px-6 w-full md:w-auto gap-2 border border-emerald-400/20 overflow-hidden transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                <span className="tracking-wide">New Transaction</span>
              </span>
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto rounded-xl p-0 border bg-background shadow-2xl dark:border-zinc-800">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white border-b dark:border-zinc-800">
                <DialogHeader>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Wrench className="h-3.5 w-3.5" /> Maintenance Portal
                  </div>
                  <DialogTitle className="text-xl md:text-2xl font-bold text-white">
                    Log Fluid Transaction
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs md:text-sm mt-1">
                    Input asset logs, quantities, and calculations for the
                    system telemetry ledger.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Section 1: Asset Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-muted-foreground dark:border-zinc-800">
                    <Cpu className="h-4 w-4 text-indigo-500" />
                    <span>Asset Identification</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="equipment_name"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Equipment Name
                      </Label>
                      <Select
                        onValueChange={(val) => {
                          setValue("equipment_name", String(val));
                        }}
                      >
                        <SelectTrigger
                          id="equipment_name"
                          className="h-11 rounded-lg border-input bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <SelectValue placeholder="Select Equipment Target" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          {toolsList.map((tool) => (
                            <SelectItem
                              key={tool.id}
                              value={tool.tool_number}
                              className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40"
                            >
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {tool.tool_number}
                              </span>
                              <span className="text-muted-foreground mx-1.5">
                                •
                              </span>
                              <span className="text-xs">
                                {tool.machine_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="system_name"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        System Unit Name
                      </Label>
                      <Select
                        onValueChange={(val) => {
                          setValue("system_name", String(val));
                        }}
                      >
                        <SelectTrigger
                          id="system_name"
                          className="h-11 rounded-lg border-input bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <SelectValue placeholder="Select System Unit" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          {systemOptions.map((sys) => (
                            <SelectItem
                              key={sys}
                              value={sys}
                              className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40"
                            >
                              {sys}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {/* Section 2: Fluid Metrics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-muted-foreground dark:border-zinc-800">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    <span>Fluid Specification & Volume</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="fluid_name"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Fluid Nomenclature
                      </Label>
                      <Select onValueChange={handleFluidChange}>
                        <SelectTrigger
                          id="fluid_name"
                          className="h-11 rounded-lg border-input bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <SelectValue placeholder="Select master fluid type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          {fluidMasterList.map((fluid) => (
                            <SelectItem
                              key={fluid.fluid_name}
                              value={fluid.fluid_name}
                              className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40"
                            >
                              {fluid.fluid_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="fluid_type"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Fluid Category
                      </Label>
                      <Input
                        id="fluid_type"
                        {...register("fluid_type", { required: true })}
                        placeholder="Auto-filled from master"
                        readOnly
                        className="h-11 rounded-lg bg-muted/60 font-medium text-muted-foreground cursor-not-allowed border-dashed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction_type"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Operation Mode
                      </Label>
                      <Select
                        defaultValue="Top Up"
                        onValueChange={(val) => {
                          if (val === "Full Change" || val === "Top Up") {
                            setValue("transaction_type", val);
                          }
                        }}
                      >
                        <SelectTrigger
                          id="transaction_type"
                          className="h-11 rounded-lg border-input bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="Top Up">
                            Top Up (Refill)
                          </SelectItem>
                          <SelectItem value="Full Change">
                            Full Change (Flush Cycle)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="operating_hours"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Operating Runtime (Hours)
                      </Label>
                      <Input
                        id="operating_hours"
                        type="number"
                        step="any"
                        {...register("operating_hours", {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="h-11 rounded-lg border-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label
                        htmlFor="quantity_liters"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Quantity (Liters)
                      </Label>
                      <Input
                        id="quantity_liters"
                        type="number"
                        step="any"
                        {...register("quantity_liters", {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="h-11 rounded-lg border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="price_per_liter"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Unit Cost (€/L)
                      </Label>
                      <Input
                        id="price_per_liter"
                        type="number"
                        step="any"
                        {...register("price_per_liter", {
                          required: true,
                          valueAsNumber: true,
                        })}
                        className="h-11 rounded-lg border-input"
                      />
                    </div>

                    {/* PREMIUM HIGH-VISIBILITY CARD FOR TOTAL COST */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Calculator className="h-3 w-3 text-emerald-500" />{" "}
                        Total Cost
                      </Label>
                      <div className="h-11 px-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-black text-lg flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold uppercase text-emerald-600/70 dark:text-emerald-400/60">
                          EUR
                        </span>
                        <span>€{calculatedTotalCost}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Section 3: Operational Logistics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-muted-foreground dark:border-zinc-800">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span>Operational Logistics</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="transaction_date"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Transaction Logging Date
                      </Label>
                      <Input
                        id="transaction_date"
                        type="date"
                        {...register("transaction_date", { required: true })}
                        className="h-11 rounded-lg border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="technician_name"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Authorized Operator
                      </Label>
                      <Select
                        onValueChange={(val) => {
                          setValue("technician_name", String(val));
                        }}
                      >
                        <SelectTrigger
                          id="technician_name"
                          className="h-11 rounded-lg border-input bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <SelectValue placeholder="Select Technician Name" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          {techniciansList.map((tech) => (
                            <SelectItem
                              key={tech.id}
                              value={tech.name}
                              className="focus:bg-indigo-50 dark:focus:bg-indigo-950/40"
                            >
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="notes"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3 text-muted-foreground" />{" "}
                      Internal System Observations
                    </Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Specify internal metrics, variations, custom component pressure points or visual leaks..."
                      className="min-h-[80px] rounded-lg border-input resize-none focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-lg h-11 px-5 font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitLoading}
                    className="rounded-lg h-11 px-6 font-semibold bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {isSubmitLoading ? "Committing Logs..." : "Save Record"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modernized Interactive KPI Indicator Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: GREEN STYLING FOR TOTAL COST YTD */}
        <Card className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-background via-emerald-500/[0.01] to-emerald-500/[0.04] p-1 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-300 transform hover:-translate-y-1">
          <div className="p-5 flex flex-col justify-between h-full">
            <div className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Total Fluid Cost YTD
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                €{kpis.totalCostYTD}
              </div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Financial
                resource allocation
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 2: BLUE STYLING FOR TOTAL CONSUMPTION */}
        <Card className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-background via-blue-500/[0.01] to-blue-500/[0.04] p-1 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all duration-300 transform hover:-translate-y-1">
          <div className="p-5 flex flex-col justify-between h-full">
            <div className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Total Consumption
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Droplets className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-blue-700 dark:text-blue-400">
                {kpis.totalConsumptionLiters}{" "}
                <span className="text-lg font-bold text-muted-foreground">
                  L
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Cumulative volume metric
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 3: AMBER STYLING FOR TOP UPS */}
        <Card className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-background via-amber-500/[0.01] to-amber-500/[0.04] p-1 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
          <div className="p-5 flex flex-col justify-between h-full">
            <div className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Top Ups This Month
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-amber-700 dark:text-amber-400">
                {kpis.topUpsThisMonth}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Refill events registered
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 4: PURPLE STYLING FOR FULL CHANGES */}
        <Card className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-background via-purple-500/[0.01] to-purple-500/[0.04] p-1 shadow-sm hover:shadow-md hover:border-purple-500/40 transition-all duration-300 transform hover:-translate-y-1">
          <div className="p-5 flex flex-col justify-between h-full">
            <div className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Full Changes This Month
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-purple-700 dark:text-purple-400">
                {kpis.fullChangesThisMonth}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Complete core flushes executed
              </p>
            </div>
          </div>
        </Card>
      </div>
      {/* Premium Ledger Card and Advanced Table Framework */}
      <Card className="rounded-xl border shadow-md overflow-hidden bg-card">
        <CardHeader className="border-b bg-muted/30 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg md:text-xl font-bold tracking-tight">
                Transactions Log
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-0.5">
                Historical architectural ledger of fluid variations, changes,
                and standard machine tops ups.
              </CardDescription>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 self-start sm:self-center">
              System Live Ledger
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            /* Premium Loading State Design Block */
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 bg-background/40">
              <div className="relative flex items-center justify-center">
                <div className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-indigo-400 opacity-20" />
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/20 border-t-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-wide">
                  Syncing Telemetry Engine
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Fetching transactions logs and authenticating system metrics
                  safely from node cluster...
                </p>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            /* Premium Empty State Block */
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 bg-background/30">
              <div className="p-4 rounded-full bg-muted text-muted-foreground/60 shadow-inner">
                <Inbox className="h-10 w-10 stroke-[1.5]" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold tracking-tight">
                  No Fluid Records Found
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The centralized log repository contains zero operational
                  indexes. Create a new fluid entry above to seed ledger
                  indices.
                </p>
              </div>
            </div>
          ) : (
            /* Data Grid with Sticky Headers, Zebra Alternation & Precision Typography */
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
              <Table className="relative w-full border-collapse">
                <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md shadow-sm z-20 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      Equipment Target
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      System Location
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      Fluid Metadata
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      Operation Mode
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4 text-right">
                      Quantity
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4 text-right">
                      Aggregated Cost
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-11 px-4">
                      Technician
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => (
                    <TableRow
                      key={tx.id}
                      className={`group transition-colors duration-150 border-b dark:border-zinc-800/60 ${
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                      } hover:bg-indigo-500/[0.02] dark:hover:bg-indigo-500/[0.04]`}
                    >
                      <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-indigo-500/60" />
                          <span>{tx.transaction_date}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tx.equipment_name}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-xs font-medium text-muted-foreground">
                        {tx.system_name}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {tx.fluid_name}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-0.5">
                            {tx.fluid_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide shadow-sm border ${
                            tx.transaction_type === "Full Change"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full mr-1.5 animate-pulse ${
                              tx.transaction_type === "Full Change"
                                ? "bg-purple-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {tx.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right px-4 py-3.5">
                        {tx.quantity_liters.toFixed(1)}{" "}
                        <span className="text-[10px] text-muted-foreground font-sans">
                          L
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-extrabold text-right text-slate-900 dark:text-zinc-100 px-4 py-3.5">
                        €{tx.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs font-medium">
                        <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-indigo-500 border">
                            {tx.technician_name.charAt(0).toUpperCase()}
                          </div>
                          <span>{tx.technician_name}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
