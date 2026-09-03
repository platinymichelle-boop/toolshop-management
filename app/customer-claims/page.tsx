"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import {
  ClipboardCheck,
  Plus,
  FileText,
  Eye,
  Trash2,
  AlertCircle,
  Users,
  Activity,
  CheckCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";

interface ClaimFormData {
  claim_number: string;
  customer: string;
  status: "Open" | "Investigation" | "Closed";
  file: FileList | null;
}

interface ClaimRecord {
  id: string;
  claim_number: string;
  customer: string;
  status: string;
  uploaded_file: string;
  file_url: string;
  created_at: string;
}

export default function CustomerClaimsPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClaimFormData>({
    defaultValues: {
      claim_number: "",
      customer: "",
      status: "Open",
      file: null,
    },
  });

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("quality_claims")
        .select(
          "id, claim_number, customer, status, uploaded_file, file_url, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (err) {
      console.error("Error fetching claims:", err);
    } finally {
      setIsLoading(false);
    }
  }
  async function onSubmit(data: ClaimFormData) {
    try {
      setIsSubmitting(true);

      if (!data.file || data.file.length === 0) {
        alert("Please select a PPTX file to upload.");
        setIsSubmitting(false);
        return;
      }

      const file = data.file[0];
      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("quality-claims")
        .upload(uniqueFileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("quality-claims")
        .getPublicUrl(uniqueFileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Could not retrieve public URL for uploaded file.");
      }

      const { error: insertError } = await supabase
        .from("quality_claims")
        .insert([
          {
            claim_number: data.claim_number,
            customer: data.customer,
            status: data.status,
            uploaded_file: file.name,
            file_url: urlData.publicUrl,
          },
        ]);

      if (insertError) throw insertError;

      setIsDialogOpen(false);
      fetchClaims();
      reset();
    } catch (err) {
      console.error("Error saving claim:", err);
      alert("An error occurred while saving the claim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error } = await supabase
        .from("quality_claims")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchClaims();
    } catch (err) {
      console.error("Error deleting claim:", err);
      alert("An error occurred while deleting the claim.");
    }
  }

  const kpis = {
    total: claims.length,
    open: claims.filter((c) => c.status === "Open").length,
    investigation: claims.filter((c) => c.status === "Investigation").length,
    closed: claims.filter((c) => c.status === "Closed").length,
    uniqueCustomers: new Set(claims.map((c) => c.customer.toLowerCase())).size,
  };
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-50 p-6 md:p-10 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner Premium */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 md:p-12 shadow-2xl shadow-emerald-950/20">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/30 rounded-2xl shadow-inner shadow-emerald-500/10">
                <ClipboardCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Customer Claims
                </h1>
                <p className="mt-2 text-slate-400 font-medium">
                  Digital One Page Report Management
                </p>
              </div>
            </div>

            {/* Dialog New Claim */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger className="h-12 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 border-0 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center rounded-md">
                <Plus className="w-5 h-5 mr-2 stroke-[2.5]" />
                New Claim
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-50 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-emerald-400" />{" "}
                    Create Quality Claim
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Introduceți detaliile reclamației și încărcați raportul One
                    Page în format PPTX.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5 pt-4"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="claim_number"
                      className="text-slate-300 font-medium"
                    >
                      Claim Number
                    </Label>
                    <Input
                      id="claim_number"
                      placeholder="e.g. CLM-2026-001"
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      {...register("claim_number", {
                        required: "Claim number is required",
                      })}
                    />
                    {errors.claim_number && (
                      <span className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {errors.claim_number.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="customer"
                      className="text-slate-300 font-medium"
                    >
                      Customer
                    </Label>
                    <Input
                      id="customer"
                      placeholder="e.g. Global Motors Inc."
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      {...register("customer", {
                        required: "Customer name is required",
                      })}
                    />
                    {errors.customer && (
                      <span className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {errors.customer.message}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-slate-300 font-medium"
                    >
                      Status
                    </Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""} // 👈 Change defaultValue to value with a fallback
                        >
                          <SelectTrigger
                            id="status"
                            className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                          >
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-800 text-white">
                            <SelectItem
                              value="Open"
                              className="focus:bg-slate-800 focus:text-white"
                            >
                              Open
                            </SelectItem>
                            <SelectItem
                              value="Investigation"
                              className="focus:bg-slate-800 focus:text-white"
                            >
                              Investigation
                            </SelectItem>
                            <SelectItem
                              value="Closed"
                              className="focus:bg-slate-800 focus:text-white"
                            >
                              Closed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="file"
                      className="text-slate-300 font-medium"
                    >
                      Upload PPTX
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".ppt,.pptx"
                      className="bg-slate-950 border-slate-800 text-slate-300 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:hover:bg-slate-700 cursor-pointer focus-visible:ring-emerald-500"
                      {...register("file", {
                        required: "PPTX report file is required",
                      })}
                    />
                    {errors.file && (
                      <span className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />{" "}
                        {errors.file.message}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsDialogOpen(false)}
                      className="border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold disabled:opacity-50"
                    >
                      {isSubmitting ? "Uploading..." : "Save Claim"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-slate-950/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-400">
                Total Claims
              </CardTitle>
              <FileText className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-white">
                {kpis.total}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Înregistrări active în sistem
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-slate-950/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-400">
                Open Claims
              </CardTitle>
              <Activity className="w-4 h-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-rose-400">
                {kpis.open}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Necesită atenție imediată
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-slate-950/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-400">
                Closed Claims
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-400">
                {kpis.closed}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Reclamații rezolvate cu succes
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-slate-950/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-400">
                Customers Impacted
              </CardTitle>
              <Users className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-white">
                {kpis.uniqueCustomers}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Clienți unici cu sesizări
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        {/* Tabel Principal, Loading state & Empty State */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-400">
                Se încarcă datele reclamațiilor...
              </p>
            </div>
          ) : claims.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                <ClipboardCheck className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Nu există reclamații active
                </h3>
                <p className="text-sm text-slate-400">
                  Începeți managementul digital prin adăugarea primului raport
                  One Page folosind butonul de mai sus.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold h-12">
                    Claim Number
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold h-12">
                    Customer
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold h-12">
                    File
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold h-12">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold h-12">
                    Created
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold h-12 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-slate-800/60 hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-4 py-4 font-bold text-white text-sm">
                      {row.claim_number}
                    </td>
                    <td className="px-4 py-4 text-slate-300 text-sm">
                      {row.customer}
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      <div
                        className="flex items-center gap-2 max-w-[200px] truncate"
                        title={row.uploaded_file}
                      >
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate">{row.uploaded_file}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          row.status === "Open"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : row.status === "Investigation"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {new Date(row.created_at).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            router.push(`/customer-claims/${row.id}`)
                          }
                          className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                          title="View File"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="w-8 h-8 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
