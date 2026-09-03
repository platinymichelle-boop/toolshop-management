import { NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { claim, actions } = body;

    if (!claim) {
      return NextResponse.json(
        { error: "Datele reclamației lipsesc din cerere." },
        { status: 400 },
      );
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";

    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // =========================================================================
    // 1. TOP HEADER BRANDING & DYNAMIC TITLE (IDENTIC IMAGINE)
    // =========================================================================
    // Titlu stânga sus: Part Number – Defect Type
    const topTitle = `${claim.part_number || "M250SP015"} – ${claim.defect_type || "Deformed part"}`;
    slide.addText(topTitle, {
      x: 0.3,
      y: 0.3,
      w: 7.5,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: "000000",
      fontFace: "Arial",
      align: "left",
    });

    // Logo text oficial în dreapta sus
    slide.addText("MARTUR FOMPAK", {
      x: 8.5,
      y: 0.25,
      w: 4.0,
      h: 0.3,
      fontSize: 18,
      bold: true,
      color: "000000",
      fontFace: "Arial",
      align: "right",
    });
    slide.addText("I N T E R N A T I O N A L", {
      x: 8.5,
      y: 0.55,
      w: 4.0,
      h: 0.2,
      fontSize: 9,
      color: "94A3B8",
      fontFace: "Arial",
      align: "right",
    });

    // Linie neagră subțire sub branding-ul principal
    slide.addShape(pptx.ShapeType.line, {
      x: 0.25,
      y: 0.85,
      w: 12.33,
      h: 0,
      line: { color: "000000", width: 1.5 },
    });

    // =========================================================================
    // 2. CASETA PROBLEM DESCRIPTION (STÂNGA)
    // =========================================================================
    const dynamicSubtitle = `Problem Description : X52 - ${claim.defect_type || "Deformed part"}`;
    slide.addText(dynamicSubtitle, {
      x: 0.25,
      y: 0.95,
      w: 5.5,
      h: 0.3,
      fontSize: 13,
      bold: true,
      color: "000000",
      fontFace: "Arial",
    });

    // Border Caseta Text
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.25,
      y: 1.25,
      w: 5.0,
      h: 4.0,
      fill: { color: "FFFFFF" },
      line: { color: "000000", width: 2 },
    });

    const dateStr = claim.date_detected
      ? new Date(claim.date_detected).toLocaleDateString("ro-RO")
      : "01.09.2026";
    const qtyStr =
      claim.qty_nok !== null && claim.qty_nok !== undefined
        ? `${claim.qty_nok} part`
        : "1 part";

    const mainBlockText = [
      { text: "What happened: ", options: { bold: true, fontSize: 10 } },
      {
        text: `${claim.what_happened || "Dimensional/geometric deviations and the part's deformation"}\n`,
        options: { fontSize: 10 },
      },

      { text: "Why is it a problem: ", options: { bold: true, fontSize: 10 } },
      {
        text: `${claim.why_problem || "Part cannot be assembled"}\n`,
        options: { fontSize: 10 },
      },

      { text: "When detected: ", options: { bold: true, fontSize: 10 } },
      { text: `${dateStr}\n`, options: { fontSize: 10 } },

      { text: "Who detected: ", options: { bold: true, fontSize: 10 } },
      {
        text: `${claim.detected_by || "Customer"}\n`,
        options: { fontSize: 10 },
      },

      { text: "Where detected: ", options: { bold: true, fontSize: 10 } },
      {
        text: `${claim.where_detected || "Customer"}\n`,
        options: { fontSize: 10 },
      },

      { text: "How detected: ", options: { bold: true, fontSize: 10 } },
      {
        text: `${claim.how_detected || "During assambly"}\n`,
        options: { fontSize: 10 },
      },

      { text: "How many bad parts: ", options: { bold: true, fontSize: 10 } },
      { text: `${qtyStr}\n\n\n`, options: { fontSize: 10 } },

      {
        text: "Root Cause occurrence :\n",
        options: { bold: true, fontSize: 10 },
      },
      {
        text: `${claim.root_cause_occurrence || ""}\n\n`,
        options: { fontSize: 10 },
      },

      {
        text: "Root Cause non-detection:\n",
        options: { bold: true, fontSize: 10 },
      },
      {
        text: `${claim.root_cause_non_detection || ""}`,
        options: { fontSize: 10 },
      },
    ];

    slide.addText(mainBlockText, {
      x: 0.35,
      y: 1.35,
      w: 4.8,
      h: 3.8,
      fontFace: "Arial",
      color: "000000",
      valign: "top",
    });

    // =========================================================================
    // 3. CASETA DETALII FOTO (DREAPTA)
    // =========================================================================
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.5,
      y: 1.25,
      w: 7.08,
      h: 4.0,
      fill: { color: "FFFFFF" },
      line: { color: "000000", width: 2 },
    });

    slide.addText("Photo of the claimed effect :", {
      x: 5.5,
      y: 1.35,
      w: 7.08,
      h: 0.3,
      fontSize: 13,
      bold: true,
      color: "000000",
      fontFace: "Arial",
      align: "center",
    });

    // Logica de descărcare și atașare imagine din Supabase Storage (dacă file_url există)
    if (claim.file_url) {
      try {
        const imageRes = await fetch(claim.file_url);
        if (imageRes.ok) {
          const imgArrayBuffer = await imageRes.arrayBuffer();
          const base64Image = `data:image/png;base64,${Buffer.from(imgArrayBuffer).toString("base64")}`;

          // Injectează imaginea reală centrat în interiorul casetei dedicate
          slide.addImage({
            data: base64Image,
            x: 5.8,
            y: 1.8,
            w: 6.4,
            h: 3.2,
          });
        }
      } catch (imgErr) {
        console.error("Failed to embedded image into slide:", imgErr);
      }
    }

    // =========================================================================
    // 4. TABEL DE ACȚIUNI CORECOTI-STIL MARTUR CLASIC (IDENTIC)
    // =========================================================================
    const tableRows: any[][] = [
      [
        {
          text: "Interim & Permanent Actions",
          options: { bold: true, color: "FFFFFF", fill: { color: "4675B4" } },
        },
        {
          text: "Due Date",
          options: {
            bold: true,
            color: "FFFFFF",
            fill: { color: "4675B4" },
            align: "center",
          },
        },
        {
          text: "Responsible",
          options: {
            bold: true,
            color: "FFFFFF",
            fill: { color: "4675B4" },
            align: "center",
          },
        },
        {
          text: "Status",
          options: {
            bold: true,
            color: "FFFFFF",
            fill: { color: "4675B4" },
            align: "center",
          },
        },
      ],
    ];

    // Clasa cromatică de fundal pentru rândurile goale (stilul cerut din imagine)
    const rowBgColor = "E2E8F3";

    if (actions && actions.length > 0) {
      actions.forEach((act: any) => {
        const dStr = act.due_date
          ? new Date(act.due_date).toLocaleDateString("ro-RO")
          : "-";
        tableRows.push([
          {
            text: act.action_text || "-",
            options: { fill: { color: rowBgColor } },
          },
          {
            text: dStr,
            options: { fill: { color: rowBgColor }, align: "center" },
          },
          {
            text: act.responsible || "-",
            options: { fill: { color: rowBgColor }, align: "center" },
          },
          {
            text: act.status || "-",
            options: { fill: { color: rowBgColor }, align: "center" },
          },
        ]);
      });

      // Dacă există puține acțiuni, completăm până la 4 rânduri pentru a păstra volumul tabelului fix
      if (actions.length < 4) {
        for (let k = actions.length; k < 4; k++) {
          tableRows.push([
            { text: "", options: { fill: { color: rowBgColor } } },
            { text: "", options: { fill: { color: rowBgColor } } },
            { text: "", options: { fill: { color: rowBgColor } } },
            { text: "", options: { fill: { color: rowBgColor } } },
          ]);
        }
      }
    } else {
      // Structura standard cu cele 4 rânduri gri goale identice cu șablonul Martur Martor gol
      for (let i = 0; i < 4; i++) {
        tableRows.push([
          { text: "", options: { fill: { color: rowBgColor } } },
          { text: "", options: { fill: { color: rowBgColor } } },
          { text: "", options: { fill: { color: rowBgColor } } },
          { text: "", options: { fill: { color: rowBgColor } } },
        ]);
      }
    }

    slide.addTable(tableRows, {
      x: 0.25,
      y: 5.4,
      w: 12.33,
      colW: [7.33, 1.66, 2.0, 1.34],
      fontSize: 10,
      color: "000000",
      fontFace: "Arial",
      border: { pt: 1, color: "FFFFFF" }, // Liniile albe de demarcație dintre celule
      valign: "middle",
      rowH: 0.35,
    });

    // Subsol text mic de confidențialitate în colțul din dreapta jos
    slide.addText(
      "Confidential document. Copyrights & all other rights are reserved",
      {
        x: 0.25,
        y: 7.15,
        w: 12.33,
        h: 0.2,
        fontSize: 8,
        color: "000000",
        fontFace: "Arial",
        align: "right",
      },
    );

    // =========================================================================
    // 5. COMPRESIE STREAM ȘI EXPORT BINAR SPRE CLIENT
    // =========================================================================
    const outputBuffer = (await pptx.write({
      outputType: "nodebuffer",
    })) as Buffer;
    const safeClaimNumber = (claim.claim_number || "Claim").replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );
    const downloadFileName = `${safeClaimNumber}_OnePage.pptx`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
      },
    });
  } catch (error: any) {
    console.error("PPTX Built-in Generator Server Error:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la generarea raportului Martur." },
      { status: 500 },
    );
  }
}
