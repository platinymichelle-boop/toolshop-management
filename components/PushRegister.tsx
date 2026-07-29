"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

export default function PushRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setIsSubscribed(true);
        })
        .catch((err) => console.error("Eroare inițializare SW:", err));
    }
  }, []);

  // COMANDA 1: ACTIVARE NOTIFICĂRI
  const handleSubscribe = async () => {
    const loadingToast = toast.loading("Se activează notificările...");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permisiunea pentru notificări a fost respinsă.");
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Trebuie să fii autentificat.");

      const { error: dbError } = await supabase
        .from("user_push_tokens")
        .upsert({ user_id: user.id, token_data: JSON.stringify(subscription) }, { onConflict: "user_id" });

      if (dbError) throw dbError;

      setIsSubscribed(true);
      toast.dismiss(loadingToast);
      toast.success("Notificări activate cu succes! 📲");
    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Eroare la activare.");
    }
  };

  // COMANDA 2: DEZACTIVARE NOTIFICĂRI
  const handleUnsubscribe = async () => {
    const loadingToast = toast.loading("Se dezactivează notificările...");
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      
      // 1. Eliminăm abonamentul din motorul browserului de pe telefon
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Trebuie să fii autentificat.");

      // 2. Ștergem rândul cu token-ul din tabela Supabase
      const { error: dbError } = await supabase
        .from("user_push_tokens")
        .delete()
        .eq("user_id", user.id);

      if (dbError) throw dbError;

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

  if (!isSupported) return null;

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
