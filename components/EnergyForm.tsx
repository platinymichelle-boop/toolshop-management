"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onSaved: () => void;
};

export default function EnergyForm({ onSaved }: Props) {
  const [periodDate, setPeriodDate] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [consumption, setConsumption] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    await supabase.from("energy_consumption").insert({
      period_date: periodDate,
      period_type: periodType,
      consumption_kwh: Number(consumption),
      energy_cost: Number(cost),
      price_per_kwh: Number(price),
      notes,
    });

    setPeriodDate("");
    setConsumption("");
    setCost("");
    setPrice("");
    setNotes("");

    onSaved();
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h2 className="text-lg font-semibold">Energy Data</h2>

      <input
        type="date"
        value={periodDate}
        onChange={(e) => setPeriodDate(e.target.value)}
        className="w-full border rounded p-2"
      />

      <select
        value={periodType}
        onChange={(e) => setPeriodType(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      <input
        placeholder="Consumption kWh"
        value={consumption}
        onChange={(e) => setConsumption(e.target.value)}
        className="w-full border rounded p-2"
      />

      <input
        placeholder="Energy Cost"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="w-full border rounded p-2"
      />

      <input
        placeholder="Price per kWh"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full border rounded p-2"
      />

      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full border rounded p-2"
      />

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Entry
      </button>
    </div>
  );
}
