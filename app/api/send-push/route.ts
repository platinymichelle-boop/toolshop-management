import { NextResponse } from "next/server";
import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Inițializăm clientul Supabase cu variabilele tale de mediu existente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// !!! ATENȚIE: ÎNLOCUIEȘTE TEXTELE DE MAI JOS CU CHEILE TALE REALE GENERATE ÎN TERMINAL !!!
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  "mailto:admin@toolshop-pro.ro", // Adresă de contact cerută de protocoalele Google/Apple
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(request: Request) {
  try {
    const { title, body, url } = await request.json();

    // 1. Preluăm toate telefoanele/dispozitivele abonate din tabela Supabase
    const { data: devices, error } = await supabase
      .from("user_push_tokens")
      .select("token_data");

    if (error) {
      console.error("Eroare interogare Supabase:", error);
      throw error;
    }

    if (!devices || devices.length === 0) {
      console.log("Niciun telefon înregistrat în tabelă momentan.");
      return NextResponse.json({ success: true, message: "Niciun abonat gasit." });
    }

    // 2. Trimitem notificarea push către fiecare telefon din listă
    const pushPromises = devices.map((device) => {
      const subscription = JSON.parse(device.token_data);
      const payload = JSON.stringify({ title, body, url });
      
      return webpush.sendNotification(subscription, payload).catch((err) => {
        console.error("Eroare la trimiterea către un token specific:", err.statusCode);
        // Opțional: dacă statusul este 410, înseamnă că utilizatorul a blocat notificările 
        // sau a dezinstalat aplicația și token-ul poate fi șters din baza de date.
      });
    });

    // Așteptăm ca toate notificările să fie livrate către Google/Apple Push Servers
    await Promise.all(pushPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Eroare critică API Push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
