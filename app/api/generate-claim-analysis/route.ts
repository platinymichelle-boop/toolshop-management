import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import JSZip from "jszip";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function extractTextFromSlideXml(xmlText: string): string {
  const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let matches;
  let extractedText = "";

  while ((matches = regex.exec(xmlText)) !== null) {
    if (matches && matches[1]) {
      extractedText += matches[1] + " ";
    }
  }
  return extractedText;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { file_base64 } = body;

    if (!file_base64) {
      return NextResponse.json(
        { error: "Conținutul Base64 al fișierului lipsește." },
        { status: 400 },
      );
    }

    // 1. Convertim stringul primit din Base64 în Buffer binar direct în memoria serverului Node.js
    const fileBuffer = Buffer.from(file_base64, "base64");

    // 2. Extragem textul din toate slide-urile PPTX utilizând JSZip
    const zip = await JSZip.loadAsync(fileBuffer);
    let fullPptxText = "";

    const slideFiles = Object.keys(zip.files).filter(
      (path) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml"),
    );

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
      return numA - numB;
    });

    for (const slidePath of slideFiles) {
      const slideContent = await zip.files[slidePath].async("text");
      fullPptxText +=
        `\n--- START SLIDE ---\n` + extractTextFromSlideXml(slideContent);
    }

    if (!fullPptxText.trim()) {
      throw new Error(
        "Nu s-a putut citi sau extrage text din interiorul prezentării PPTX.",
      );
    }

    // 3. Inițializăm modelul Gemini cu responseMimeType obligatoriu în format JSON
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      Ești un inginer expert în managementul calității automotive și de producție (specializat în standarde IATF 16949, metodologii 8D, 5 Why și Ishikawa).
      Rolul tău este să analizezi textul brut extras dintr-o prezentare PPTX (un raport tehnic de reclamație) și să generezi un obiect JSON cu datele extrase sau deduse logic.

      INSTRUCTIUNI CRITICE PENTRU CAUZELE RĂDĂCINĂ (ROOT CAUSE):
      Dacă în text nu există titluri explicite numite "Root Cause Occurrence" sau "Root Cause Non Detection", localizează orice secțiuni globale precum: "Root Cause", "Root Cause Analysis", "5 Why", "Direct Cause", "Final Conclusion" sau "Lessons Learned". Analizează contextul tehnic al defectului și completează:
      
      1. "root_cause_occurrence": Reprezintă defecțiunea tehnică la nivel de proces, mașină, matriță sau parametru care A PERMIS apariția defectului fizic (de ce s-a produs piesa defectă). Dacă nu e explicit, dedu-o din analiza tehnică.
      2. "root_cause_non_detection": Reprezintă breșa în sistemul de control, inspecție, senzor, barieră de calitate sau test care A PERMIS ca piesa defectă să iasă din fabrică fără să fie interceptată (de ce NU a fost detectat defectul intern înainte de livrare).

      REGULI SUPLIMENTARE DE FORMAT:
      - "date_detected": Convertește data identificată în format standard ISO YYYY-MM-DD (ex: "17/08/2026" devine "2026-08-17").
      - Pentru orice câmp completat din deducție tehnică (unde textul din PPT era compact sau global), generează o explicație tehnică profesională și concisă în limba română (maximum 2 propoziții).
      - Nu lăsa aceste două câmpuri goale sau null dacă în text există orice fel de analiză a cauzelor sau descriere a incidentului.

      Structura JSON returnată trebuie să fie STRICT următoarea:
      {
        "part_number": "string",
        "defect_type": "string",
        "date_detected": "string (YYYY-MM-DD)",
        "what_happened": "string",
        "why_problem": "string",
        "root_cause_occurrence": "string",
        "root_cause_non_detection": "string"
      }

      Textul brut extras din prezentarea PPTX:
      ${fullPptxText}
    `;

    const result = await model.generateContent(prompt);
    const rawResponseText = result.response.text();

    const extractedJson = JSON.parse(rawResponseText);
    return NextResponse.json(extractedJson);
  } catch (error: any) {
    console.error("PPTX Extraction Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Eroare internă în timpul procesării PPTX." },
      { status: 500 },
    );
  }
}
