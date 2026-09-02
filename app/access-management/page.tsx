"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import {
  KeyRound,
  Plus,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccessCredential {
  id: string;
  equipment_name: string;
  system_name: string;
  username: string;
  password: string;
  technician_name: string;
  notes: string | null;
  created_at: string;
}

interface Tool {
  tool_number: string;
}

interface Technician {
  name: string;
}

interface LocalToast {
  title: string;
  description: string;
  type: "success" | "destructive";
}

export default function AccessManagementPage() {
  const [credentials, setCredentials] = React.useState<AccessCredential[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [technicians, setTechnicians] = React.useState<Technician[]>([]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [visiblePasswords, setVisiblePasswords] = React.useState<
    Record<string, boolean>
  >({});
  const [toast, setToast] = React.useState<LocalToast | null>(null);

  const { register, handleSubmit, setValue, reset, watch } = useForm({
    defaultValues: {
      equipment_name: "",
      system_name: "",
      username: "",
      password: "",
      technician_name: "",
      notes: "",
    },
  });

  const selectedEquipment = watch("equipment_name");
  const selectedTechnician = watch("technician_name");

  const showToast = (
    title: string,
    description: string,
    type: "success" | "destructive",
  ) => {
    setToast({ title, description, type });
    setTimeout(() => setToast(null), 4000);
  };
  const fetchData = React.useCallback(async () => {
    try {
      const [credentialsRes, toolsRes, techniciansRes] = await Promise.all([
        supabase
          .from("access_credentials")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("tools").select("tool_number"),
        supabase.from("technicians").select("name"),
      ]);

      if (credentialsRes.error) throw credentialsRes.error;
      if (toolsRes.error) throw toolsRes.error;
      if (techniciansRes.error) throw techniciansRes.error;

      setCredentials(credentialsRes.data || []);
      setTools(toolsRes.data || []);
      setTechnicians(techniciansRes.data || []);
    } catch (error: any) {
      showToast(
        "Eroare rețea",
        error.message || "Nu s-au putut încărca datele.",
        "destructive",
      );
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (values: any) => {
    if (
      !values.equipment_name ||
      !values.system_name ||
      !values.username ||
      !values.password ||
      !values.technician_name
    ) {
      showToast(
        "Validare eșuată",
        "Vă rugăm să completați toate câmpurile obligatorii.",
        "destructive",
      );
      return;
    }

    try {
      // Injectăm valori implicite pentru a satisface constrângerea "NOT NULL" din baza de date
      const dataToSave = {
        ...values,
        category: "General", // sau orice valoare implicită dorești
        vendor: "N/A",
      };

      const { error } = await supabase
        .from("access_credentials")
        .insert([dataToSave]);
      if (error) throw error;

      showToast("Succes", "Datele de acces au fost înregistrate.", "success");
      setIsDialogOpen(false);
      reset();
      fetchData();
    } catch (error: any) {
      showToast("Eroare salvare", error.message, "destructive");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți această înregistrare?")) return;

    try {
      const { error } = await supabase
        .from("access_credentials")
        .delete()
        .eq("id", id);
      if (error) throw error;

      showToast(
        "Ștergere reușită",
        "Înregistrarea a fost eliminată.",
        "success",
      );
      fetchData();
    } catch (error: any) {
      showToast("Eroare ștergere", error.message, "destructive");
    }
  };

  const filteredCredentials = credentials.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.equipment_name.toLowerCase().includes(searchLower) ||
      item.system_name.toLowerCase().includes(searchLower) ||
      item.username.toLowerCase().includes(searchLower) ||
      item.technician_name.toLowerCase().includes(searchLower)
    );
  });

  const totalCredentials = credentials.length;
  const uniqueEquipments = new Set(credentials.map((c) => c.equipment_name))
    .size;
  const uniqueTechnicians = new Set(credentials.map((c) => c.technician_name))
    .size;
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg border text-white max-w-sm transition-all ${
            toast.type === "destructive"
              ? "bg-red-600 border-red-700"
              : "bg-green-600 border-green-700"
          }`}
        >
          <div className="font-bold text-sm">{toast.title}</div>
          <div className="text-xs opacity-90 mt-0.5">{toast.description}</div>
        </div>
      )}

      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Access Management
          </h2>
          <p className="text-muted-foreground">
            Administrarea conturilor de acces și mentenanță echipamente
            industriale.
          </p>
        </div>
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button className="group relative inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-500 transition-all duration-300 h-12 px-6 w-full md:w-auto gap-2 border border-blue-400/20 overflow-hidden transform hover:-translate-y-0.5 active:translate-y-0">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                <span className="tracking-wide">New Credential</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adăugare Date Acces</DialogTitle>
                <DialogDescription>
                  Introduceți datele administrative de conectare. Toate
                  câmpurile sunt obligatorii.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1">
                  <Label>Echipament / Mașină</Label>
                  <Select
                    onValueChange={(v) => setValue("equipment_name", v || "")}
                    value={selectedEquipment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectați utilajul" />
                    </SelectTrigger>
                    <SelectContent>
                      {tools.map((t) => (
                        <SelectItem key={t.tool_number} value={t.tool_number}>
                          {t.tool_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Nume Sistem / Subsistem (ex: PLC, HMI)</Label>
                  <Input
                    {...register("system_name")}
                    placeholder="Introduceți tipul de sistem"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Utilizator</Label>
                    <Input {...register("username")} placeholder="Username" />
                  </div>
                  <div className="space-y-1">
                    <Label>Parolă</Label>
                    <Input
                      type="password"
                      {...register("password")}
                      placeholder="Password"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Tehnician Responsabil</Label>
                  <Select
                    onValueChange={(v) => setValue("technician_name", v || "")} // <- Aici a fost corectat adăugând ", v"
                    value={selectedTechnician}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectați tehnicianul" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.name} value={tech.name}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Observații / Note</Label>
                  <Textarea
                    {...register("notes")}
                    placeholder="Detalii suplimentare despre conexiune..."
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Anulează
                  </Button>
                  <Button type="submit">Salvează Datele</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Credențiale
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredentials}</div>
            <p className="text-xs text-muted-foreground">
              Conturi securizate active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Echipamente Acoperite
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEquipments}</div>
            <p className="text-xs text-muted-foreground">
              Utilaje cu acces configurat
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">
              Tehnicieni Responsabili
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTechnicians}</div>
            <p className="text-xs text-muted-foreground">
              Operatori unici cu drepturi
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Registre Conexiune Active</CardTitle>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută utilaj, sistem, utilizator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                type="search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Echipament</TableHead>
                  <TableHead>Sistem</TableHead>
                  <TableHead>Utilizator</TableHead>
                  <TableHead>Parolă</TableHead>
                  <TableHead>Tehnician</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[70px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredentials.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nicio înregistrare găsită în sistem.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCredentials.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.equipment_name}
                      </TableCell>
                      <TableCell>{row.system_name}</TableCell>
                      <TableCell>
                        <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {row.username}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Input
                            type={
                              visiblePasswords[row.id] ? "text" : "password"
                            }
                            value={row.password}
                            readOnly
                            className="h-7 w-28 text-xs font-mono bg-muted/50 border-none p-1 focus-visible:ring-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setVisiblePasswords((p) => ({
                                ...p,
                                [row.id]: !p[row.id],
                              }))
                            }
                          >
                            {visiblePasswords[row.id] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{row.technician_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {row.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
