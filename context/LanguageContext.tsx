"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const translations = {
  ro: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Dashboard", repairs: "🔧 Reparații", tools: "🧰 Utilaje", parts: "📦 Piese de Schimb Kashif",
    technicians: "🧑‍🔧 Echipa Tehnică", improvements: "💡 Îmbunătățiri", reports: "📊 Rapoarte", settings: "⚙️ GPO / Setări",
    logout: "Deconectare", logoutConfirm: "Sigur dorești să te deconectezi din sistem?",
    dashBadge: "Sistem Management Operational", dashTitle: "Metal Stamping Maintenance — Control Panel",
    dashSub: "Sistem integrat pentru monitorizarea stocurilor, eficienței tehnicienilor.",
    cardTools: "Total echipamente", cardToolsSub: "● Live din depozit", cardParts: "Piese Stoc", cardPartsSub: "Sistem Kardex",
    cardRepairs: "În Service", cardRepairsSub: "⚠️ Necesită atenție", cardTechs: "Tehnicieni", cardTechsSub: "Disponibili azi",
    cardKaizen: "Kaizen / Idei", cardKaizenSub: "🚀 Propuneri active", sectionTitle: "Eficientizarea Proceselor din Atelier",
    barTechs: "Rată de ocupare tehnicieni", barStock: "Acuratețe Stoc Piese (Kardex Automatic)",
    cardCompleted: "Echipamente Finalizate", cardCompletedSub: "Pregătite pentru asamblare",

    // Modul Repairs - Formular și Liste
    repTitle: "Gestionare Tichete Mentenanță", repSub: "Deschiderea și urmărirea fișelor tehnice de service",
    formTitle: "Deschide Fișă Service Nouă", selectTool: "Selectează Presa / Subunitate",
    inputFailure: "Descriere Defecțiune Constatată...", selectTech: "Asignează Tehnician (Opțional)",
    selectPriority: "Prioritate Tichet", selectPart: "Piesă Înlocuită din Kardex (Opțional)",
    fileBefore: "Foto Înainte (Defect)", fileAfter: "Foto După (Reparat)",
    btnSave: "Deschide Fișă Service", btnSaving: "Se salvează în sistem...",
    alertFields: "Te rog să selectezi scula și să introduci defectul constatat.", alertSuccess: "Fișa de reparație a fost deschisă cu succes!",
    statusNew: "Tichete Noi", statusProgress: "În Lucru", statusTesting: "Verificare / Teste", statusClosed: "Finalizate / Închise",
    btnExport: "Export", noRepairs: "Niciun tichet în acest stadiu", priorityHigh: "Ridicată", priorityMedium: "Medie", priorityLow: "Scăzută",

    // Modul Reports (Inclusiv cheile din VS Code pentru eliminarea erorilor roșii)
    repPageTitle: "Rapoarte și Analitice", repPageSub: "Performanța atelierului și indicatorii cheie de eficiență (KPI) extrași din baza de date.",
    repLoading: "Se generează analizele financiare și operaționale...", kpiResolveRate: "Rată Rezolvare Tichete",
    kpiTotalService: "din total service", kpiAvgTime: "Timp Mediu Alocat", kpiPerTool: "per echipament",
    kpiHoursCalc: "Calculat pe baza coloanei hours_worked", kpiCritical: "Tichete Critice", kpiHighPriority: "prioritate ridicată",
    kpiImmediateAttention: "⚠️ Necesită atenție imediată", secVolTitle: "Sumar Activitate Volum Service",
    tabTotal: "Total Înregistrate", tabActive: "În Curs (Active)", tabCompleted: "Reparate Complet", tabStockEff: "Eficiență Stoc Piese", tabStable: "Stabilă",
    
    // Chei pentru compatibilitate grafice reports
    reportsTitle: "Rapoarte Performanță Ateliere",
    reportsSub: "Analiza metricilor cheie (KPI), eficienței echipei și consumului de piese din Supabase.",
    rateFinalizare: "Rată Finalizare", din: "din", ticheteInchise: "tichete închise",
    sculeRisc: "Echipament Risc Ridicat", highPrioritySub: "Echipamente marcate cu prioritate mare",
    pieseConsumateTitle: "Piese Consumate", kardexOutSub: "Total unități scăzute din stoc automat",
    clasamentTech: "Clasament Eficiență Tehnicieni", clasamentTechSub: "Numărul total de lucrări remediate cu succes și închise.",
    toolSingular: "echipament", toolPlural: "echipamente", tichete: "tichete",
    analizaIncarcare: "Analiza Încărcării după Prioritate", analizaIncarcareSub: "Distribuția totală a defectelor semnalate din producție."
  },
  en: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Dashboard", repairs: "🔧 Repairs", tools: "🧰 Equipments", parts: "📦 Spare Parts",
    technicians: "🧑‍🔧 Technical Team", improvements: "💡 Improvements", reports: "📊 Reports", settings: "⚙️ GPO / Settings",
    logout: "Logout", logoutConfirm: "Are you sure you want to log out of the system?",
    dashBadge: "Operational Management System", dashTitle: "Metal Stamping Maintenance — Control Panel",
    dashSub: "Integrated system for inventory tracking, technical efficiency and maintenance.",
    cardTools: "Total Tools", cardToolsSub: "● Live from warehouse", cardParts: "Stock Parts", cardPartsSub: "Kardex System",
    cardRepairs: "In Service", cardRepairsSub: "⚠️ Requires attention", cardTechs: "Technicians", cardTechsSub: "Available today",
    cardKaizen: "Kaizen / Ideas", cardKaizenSub: "🚀 Active proposals", sectionTitle: "Workshop Process Efficiency",
    barTechs: "Technician occupancy rate", barStock: "Parts Stock Accuracy (Automatic Kardex)",
    cardCompleted: "Completed Tools", cardCompletedSub: "Ready for workshop assembly",

    // Modul Repairs - Formular și Liste
    repTitle: "Manage Maintenance Tickets", repSub: "Open and monitor technical service files",
    formTitle: "Open New Service File", selectTool: "Select Tool / Mold",
    inputFailure: "Description of Failure Found...", selectTech: "Assign Technician (Optional)",
    selectPriority: "Ticket Priority", selectPart: "Replaced Part from Kardex (Optional)",
    fileBefore: "Photo Before (Faulty)", fileAfter: "Photo After (Repaired)",
    btnSave: "Open Service File", btnSaving: "Saving to system...",
    alertFields: "Please select the tool and enter the failure description.", alertSuccess: "Repair file successfully opened!",
    statusNew: "New Tickets", statusProgress: "In Progress", statusTesting: "Verification / Testing", statusClosed: "Completed / Closed",
    btnExport: "Export", noRepairs: "No tickets in this stage", priorityHigh: "High", priorityMedium: "Medium", priorityLow: "Low",

    // Modul Reports
    repPageTitle: "Reports & Analytics", repPageSub: "Workshop performance and key efficiency indicators (KPI) extracted from the database.",
    repLoading: "Generating financial and operational analysis...", kpiResolveRate: "Ticket Resolution Rate",
    kpiTotalService: "of total service", kpiAvgTime: "Average Time Allocated", kpiPerTool: "per equipment",
    kpiHoursCalc: "Calculated based on hours_worked column", kpiCritical: "Critical Tickets", kpiHighPriority: "high priority",
    kpiImmediateAttention: "⚠️ Requires immediate attention", secVolTitle: "Service Volume Activity Summary",
    tabTotal: "Total Registered", tabActive: "In Progress (Active)", tabCompleted: "Fully Repaired", tabStockEff: "Parts Stock Efficiency", tabStable: "Stable",
    
    // Chei pentru compatibilitate grafice reports
    reportsTitle: "Workshop Performance Reports",
    reportsSub: "Analysis of key metrics (KPI), team efficiency and parts consumption from Supabase.",
    rateFinalizare: "Resolution Rate", din: "out of", ticheteInchise: "tickets closed",
    sculeRisc: "High Risk Tools", highPrioritySub: "Equipments marked with high priority",
    pieseConsumateTitle: "Parts Consumed", kardexOutSub: "Total units automatically subtracted from stock",
    clasamentTech: "Technician Efficiency Ranking", clasamentTechSub: "Total number of jobs successfully resolved and closed.",
    toolSingular: "mold", toolPlural: "molds", tichete: "tickets",
    analizaIncarcare: "Load Analysis by Priority", analizaIncarcareSub: "Total distribution of defects reported from production."
  },

    tr: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Panel", repairs: "🔧 Onarımlar", tools: "🧰 Ekipman / Kalıplar", parts: "📦 Yedek Parçalar",
    technicians: "🧑‍🔧 Teknik Ekip", improvements: "💡 İyileştirmeler", reports: "📊 Raporlar", settings: "⚙️ GPO / Ayarlar",
    logout: "Çıkış Yap", logoutConfirm: "Sistemden çıkış yapmak istediğinize emin misiniz?",
    dashBadge: "Operasyonel Yönetim Sistemi", dashTitle: "Metal Stamping Maintenance — Kontrol Paneli",
    dashSub: "Stok takibi, teknisyen verimliliği ve bakım yönetimi için entegre sistem.",
    cardTools: "Toplam Kalıp", cardToolsSub: "● Depodan canlı", cardParts: "Stok Parçaları", cardPartsSub: "Kardex Sistemi",
    cardRepairs: "Serviste", cardRepairsSub: "⚠️ Dikkat gerektiriyor", cardTechs: "Teknisyenler", cardTechsSub: "Bugün uygun",
    cardKaizen: "Kaizen / Fikirler", cardKaizenSub: "🚀 Aktif öneriler", sectionTitle: "Atölye Süreç Verimliliği",
    barTechs: "Teknisyen doluluk oranı", barStock: "Parça Stok Doğruluğu (Otomatik Kardex)",
    cardCompleted: "Tamamlanan Kalıplar", cardCompletedSub: "Montaja hazır kalıplar",

    // Modul Repairs - Formular și Liste
    repTitle: "Bakım Taleplerini Yönet", repSub: "Teknik servis dosyalarının açılması ve takibi",
    formTitle: "Yeni Servis Dosyası Aç", selectTool: "Kalıp / Model Seçin",
    inputFailure: "Tespit Edilen Arıza Açıklaması...", selectTech: "Teknisyen Ata (İsteğe Bağlı)",
    selectPriority: "Talep Önceliği", selectPart: "Kardex'ten Değiştirilen Parça (İsteğe Bağlı)",
    fileBefore: "Önceki Fotoğraf (Arıza)", fileAfter: "Sonraki Fotoğraf (Onarıldı)",
    btnSave: "Servis Dosyası Aç", btnSaving: "Sisteme kaydediliyor...",
    alertFields: "Lütfen kalıbı seçin ve arıza açıklamasını girin.", alertSuccess: "Onarım dosyası başarıyla açıldı!",
    statusNew: "Yeni Talepler", statusProgress: "İşlemde", statusTesting: "Doğrulama / Test", statusClosed: "Tamamlandı / Kapatıldı",
    btnExport: "Dışa Aktar", noRepairs: "Bu aşamada talep bulunmamaktadır", priorityHigh: "Yüksek", priorityMedium: "Orta", priorityLow: "Düşük",

    // Modul Reports
    repPageTitle: "Raporlar ve Analizler", repPageSub: "Atölye performansı ve veri tabanından alınan temel verimlilik göstergeleri (KPI).",
    repLoading: "Finansal ve operasyonel analizler oluşturuluyor...", kpiResolveRate: "Talep Çözüm Oranı",
    kpiTotalService: "toplam servisten", kpiAvgTime: "Atanan Ortalama Süre", kpiPerTool: "ekipman başına",
    kpiHoursCalc: "hours_worked sütununa göre hesaplanmıştır", kpiCritical: "Kritik Talepler", kpiHighPriority: "yüksek öncelikli",
    kpiImmediateAttention: "⚠️ Acil dikkat gerektiriyor", secVolTitle: "Servis Hacmi Aktivite Özeti",
    tabTotal: "Toplam Kayıtlı", tabActive: "İşlemde (Aktif)", tabCompleted: "Tamamen Onarıldı", tabStockEff: "Parça Stok Verimliliği", tabStable: "Kararlı",
    
    // Chei pentru compatibilitate grafice reports
    reportsTitle: "Atölye Performans Raporları",
    reportsSub: "Supabase'den alınan temel metriklerin (KPI), ekip verimliliğinin ve parça tüketiminin analizi.",
    rateFinalizare: "Çözüm Oranı", din: "üzerinden", ticheteInchise: "talep kapatıldı",
    sculeRisc: "Yüksek Riskli Kalıplar", highPrioritySub: "Yüksek öncelikli olarak işaretlenmiş kalıplar",
    pieseConsumateTitle: "Tüketilen Parçalar", kardexOutSub: "Stoktan otomatik olarak düşülen toplam birim",
    clasamentTech: "Teknisyen Verimlilik Sıralaması", clasamentTechSub: "Başarıyla sonuçlanan ve kapatılan toplam iş sayısı.",
    toolSingular: "kalıp", toolPlural: "kalıplar", tichete: "talepler",
    analizaIncarcare: "Önceliğe Göre Yük Analizi", analizaIncarcareSub: "Üretimden bildirilen arızaların toplam dağılımı."
  }
};


type Language = "ro" | "en" | "tr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void; // CORECTAT: Schimbat => cu : pentru sintaxa de interface
  t: typeof translations.ro; 
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Declarăm starea cu S mare la State pentru a respecta standardul camelCase
  const [language, setLanguageState] = useState<Language>("ro");

  // Încarcă limba setată de utilizator la pornirea aplicației
  useEffect(() => {
    const savedLang = localStorage.getItem("toolshop_lang") as Language;
    if (savedLang && (savedLang === "ro" || savedLang === "en" || savedLang === "tr")) {
      setLanguageState(savedLang); // CORECTAT: S scris cu majusculă
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang); // CORECTAT: S scris cu majusculă
    localStorage.setItem("toolshop_lang", lang);
  };

  // Turnăm traducerea corectă în provider
  const currentTranslation = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: currentTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook-ul custom pentru ecrane
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage trebuie folosit în interiorul unui LanguageProvider");
  return context;
}

