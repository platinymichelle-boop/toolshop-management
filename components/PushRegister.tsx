"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

export default function PushRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Verificăm dacă browserul curent (mai ales pe mobil) suportă tehnic notificările push
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            // Dacă există deja un abonament valid în browser, îl setăm ca activ
            setIsSubscribed(true);
          }
        })
        .catch((err) => console.error("Eroare inițializare SW:", err));
    }
  }, []);

  const handleSubscribe = async () => {
    const loadingToast = toast.loading("Se activează notificările...");
    try {
      // 1. Verificare cheie VAPID
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Lipsește cheia publică VAPID din setările serverului (.env).");
      }

      // 2. Cerere permisiune nativă
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permisiunea a fost respinsă. Activează notificările din setările browserului/telefonului.");
      }

      // 3. Așteptăm ca Service Worker să fie gata complet
      const reg = await navigator.serviceWorker.ready;
      
      // 4. Înregistrare în Push Server-ul Google/Apple
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 5. Verificare autentificare utilizator în depozit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Trebuie să fii autentificat în aplicație pentru a primi alerte.");

      // 6. Salvare securizată în Supabase
      const { error: dbError } = await supabase
        .from("user_push_tokens")
        .upsert(
          { 
            user_id: user.id, 
            token_data: JSON.stringify(subscription),
            updated_at: new Date().toISOString() 
          }, 
          { onConflict: "user_id" }
        );

      if (dbError) throw dbError;

      setIsSubscribed(true);
      toast.dismiss(loadingToast);
      toast.success("Notificări activate cu succes! 📲");
    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      // Afișăm eroarea exactă direct în interfață ca să o poți citi pe telefon
      toast.error(error.message || "Eroare la activarea alertelor.");
    }
  };

  const handleUnsubscribe = async () => {
    const loadingToast = toast.loading("Se dezactivează notificările...");
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_push_tokens")
          .delete()
          .eq("user_id", user.id);
      }

      setIsSubscribed(false);
      toast.dismiss(loadingToast);
      toast.success("Notificări mobile dezactivate. 🔕");
    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Eroare la dezactivare.");
    }
  };

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

  // Dacă telefonul sau modul de navigare (ex: Incognito) nu suportă Web Push, butonul nu apare deloc
  if (!isSupported) {
    return (
      <div className="text-xs text-amber-500 bg-amber-50 p-2 rounded-lg border border-amber-200">
        ⚠️ Acest dispozitiv sau browser nu suportă notificări Push mobile (Verifică dacă ești pe HTTPS sau dacă ai adăugat aplicația pe ecranul principal dacă folosești iPhone).
      </div>
    );
  }

  return (
    <button
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      className={`px-4 py-2 rounded-xl shadow text-sm font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 border ${
        isSubscribed
          ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
          : "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700"
      }`}
    >
      {isSubscribed ? "🔕 Dezactivează Alerte" : "🔔 Activează Alerte"}
    </button>
  );
}
