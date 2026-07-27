"use client";

import { useState } from "react";
import { DBTool, DBTech, DBPart } from "@/lib/useRepairsData";

interface RepairFormProps {
  t: any;
  isSaving: boolean;
  dbTools: DBTool[];
  dbTechs: DBTech[];
  dbParts: DBPart[];
  onSubmit: (data: any, files: any, reset: () => void) => void;
}

export default function RepairForm({ t, isSaving, dbTools, dbTechs, dbParts, onSubmit }: RepairFormProps) {
  const [toolNumber, setToolNumber] = useState("");
  const [failure, setFailure] = useState("");
  const [technician, setTechnician] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [replacedPart, setReplacedPart] = useState("");
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);

  const resetForm = () => {
    setToolNumber(""); setFailure(""); setTechnician(""); setPriority("Medium"); setReplacedPart("");
    setFileBefore(null); setFileAfter(null);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach((input: any) => { input.value = ""; });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ toolNumber, failure, technician, priority, replacedPart }, { before: fileBefore, after: fileAfter }, resetForm);
  };

  return (
    <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-4xl">
      <h2 className="text-base font-bold text-slate-800">{t.formTitle}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={toolNumber} onChange={(e) => setToolNumber(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="">-- {t.selectTool} --</option>
          {dbTools.map((tool) => <option key={tool.id} value={tool.tool_number || ""}>{tool.tool_number}</option>)}
        </select>

        <select value={technician} onChange={(e) => setTechnician(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="">-- {t.selectTech} --</option>
          {dbTechs.map((tech) => <option key={tech.id} value={tech.name || ""}>{tech.name}</option>)}
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="High">{t.priorityHigh}</option>
          <option value="Medium">{t.priorityMedium}</option>
          <option value="Low">{t.priorityLow}</option>
        </select>
      </div>

      <textarea value={failure} onChange={(e) => setFailure(e.target.value)} placeholder={t.inputFailure} rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-500" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <select value={replacedPart} onChange={(e) => setReplacedPart(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <option value="">-- {t.selectPart} --</option>
          {dbParts.map((part) => <option key={part.id} value={part.endr_code || ""}>{part.endr_code} - {part.specification}</option>)}
        </select>

        <label className="flex flex-col text-xs text-slate-500 font-bold">{t.fileBefore}
          <input type="file" accept="image/*" onChange={(e) => setFileBefore(e.target.files?.[0] || null)} className="mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />
        </label>

        <label className="flex flex-col text-xs text-slate-500 font-bold">{t.fileAfter}
          <input type="file" accept="image/*" onChange={(e) => setFileAfter(e.target.files?.[0] || null)} className="mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700" />
        </label>
      </div>

      <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:bg-slate-400">
        {isSaving ? t.btnSaving : t.btnSave}
      </button>
    </form>
  );
}
