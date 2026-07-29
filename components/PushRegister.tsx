"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

// !!! ÎNLOCUIEȘTE TEXTUL DE MAI JOS CU CHEIA TA PUBLICĂ GENERATĂ ÎN TERMINAL !!!
const VAPID_PUBLIC_KEY = "BD1c1nt9ppUG71T9vmfze2UCp4CcEmjrMIJKbg9a0-4yNkjpFbdX3PB2m8qF8QMCmXG9L5li8Nqfm29UZL2Erpg";

export default function PushRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Verificăm dacă browserul/dispozitivul suportă Service Workers și Push
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);

      // Înregistrăm Service Worker-ul din folderul public
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker înregistrat cu succes în scopul:", reg.scope);
          // Verificăm dacă utilizatorul este deja abonat la notificări pe acest telefon
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
        })
        .catch((err) => console.error("Eroare la inițializarea Service Worker:", err));
    }
  }, []);

  const handleSubscribe = async () => {
    const loadingToast = toast.loading("Se activează notificările pe telefon...");
    try {
      // 1. Solicităm permisiunea nativă a telefonului mobil
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permisiunea pentru notificări a fost respinsă de utilizator.");
      }

      // 2. Generăm token-ul unic (adresa push a telefonului)
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 3. Preluăm utilizatorul curent logat în aplicație
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Trebuie să fii autentificat pentru a înregistra telefonul.");
      }

      // 4. Salvăm sau actualizăm adresa telefonului în noua tabelă din Supabase
      const { error: dbError } = await supabase
        .from("user_push_tokens")
        .upsert(
          {
            user_id: user.id,
            token_data: JSON.stringify(subscription),
          },
          { onConflict: "user_id" }
        );

      if (dbError) throw dbError;

      setIsSubscribed(true);
      toast.dismiss(loadingToast);
      toast.success("Telefon înregistrat! Vei primi alerte pe ecranul blocat. 📲");
    } catch (error: any) {
      console.error("Eroare abonare push:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Eroare la activarea alertelor mobile.");
    }
  };

  // Funcție tehnică utilitară necesară pentru decodarea cheii publice securizate
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Dacă telefonul sau PC-ul curent nu are un browser capabil, ascundem complet butonul
  if (!isSupported) return null;

  return (
    <button
      onClick={handleSubscribe}
      className={`px-4 py-2 rounded shadow text-sm font-medium transition duration-200 ${
        isSubscribed
          ? "bg-emerald-600 text-white cursor-default"
          : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
      }`}
      disabled={isSubscribed}
    >
      {isSubscribed ? "📲 Notificări Mobile Active" : "🔔 Activează Alerte pe Telefon"}
    </button>
  );
}
