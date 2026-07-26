"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Autentificare prin modulul oficial de securitate Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

           // 2. Extragere detalii utilizator și rol din tabela ta publică `users`
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, active")
        .eq("username", email.trim())
        .maybeSingle(); // Modificat din .single() în .maybeSingle()

      if (userError) {
        console.error("Eroare la citirea profilului:", userError.message);
      }


      if (userError) {
        console.error("Nu s-a putut citi profilul din tabela users:", userError.message);
      }

      // 3. Verificăm dacă contul este marcat ca activ în tabelă
      if (userData && userData.active === false) {
        await supabase.auth.signOut();
        alert("Acest cont a fost dezactivat de un administrator.");
        return;
      }

      // Redirecționare cu succes în Dashboard
      router.push("/dashboard");
    } catch (error: any) {
      alert("Eroare la autentificare: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-800">ToolShop Pro</h1>
          <p className="text-sm text-gray-500 mt-2">Sistem de Gestiune și Control Service</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Email Utilizator</label>
            <input
              type="email"
              required
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-blue-500 text-slate-900"
              placeholder="ionut.micsa@marturfompak.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Parolă</label>
            <input
              type="password"
              required
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-blue-500 text-slate-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium p-3 rounded-lg text-sm transition-colors"
          >
            {isLoading ? "Se verifică credențialele..." : "Conectare în Panou"}
          </button>
        </form>
      </div>
    </div>
  );
}
