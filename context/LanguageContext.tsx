"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const translations = {
  ro: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Dashboard", repairs: "🔧 Reparații", tools: "🧰 Utilaje / Matrițe", parts: "📦 Piese de Schimb",
    technicians: "🧑‍🔧 Echipa Tehnică", improvements: "💡 Îmbunătățiri", reports: "📊 Rapoarte", settings: "⚙️ GPO / Setări",
    logout: "Deconectare", logoutConfirm: "Sigur dorești să te deconectezi din sistem?",
    dashBadge: "Sistem Management Operational", dashTitle: "ToolShop Pro — Control Panel",
    dashSub: "Sistem integrat pentru monitorizarea stocurilor, eficienței tehnicienilor.",
    cardTools: "Total Scule", cardToolsSub: "● Live din depozit", cardParts: "Piese Stoc", cardPartsSub: "Sistem Kardex",
    cardRepairs: "În Service", cardRepairsSub: "⚠️ Necesită atenție", cardTechs: "Tehnicieni", cardTechsSub: "Disponibili azi",
    cardKaizen: "Kaizen / Idei", cardKaizenSub: "🚀 Propuneri active", sectionTitle: "Eficientizarea Proceselor din Atelier",
    barTechs: "Rată de ocupare tehnicieni", barStock: "Acuratețe Stoc Piese (Kardex Automatic)",

    // Modul Repairs - Formular și Liste
    repTitle: "Gestionare Tichete Mentenanță", repSub: "Deschiderea și urmărirea fișelor tehnice de service",
    formTitle: "Deschide Fișă Service Nouă", selectTool: "Selectează Sculă / Matriță",
    inputFailure: "Descriere Defecțiune Constatată...", selectTech: "Asignează Tehnician (Opțional)",
    selectPriority: "Prioritate Tichet", selectPart: "Piesă Înlocuită din Kardex (Opțional)",
    fileBefore: "Foto Înainte (Defect)", fileAfter: "Foto După (Reparat)",
    btnSave: "Deschide Fișă Service", btnSaving: "Se salvează în sistem...",
    alertFields: "Te rog să selectezi scula și să introduci defectul constatat.", alertSuccess: "Fișa de reparație a fost deschisă cu succes!",
    statusNew: "Tichete Noi", statusProgress: "În Lucru", statusTesting: "Verificare / Teste", statusClosed: "Finalizate / Închise",
    btnExport: "Export", noRepairs: "Niciun tichet în acest stadiu", priorityHigh: "Ridicată", priorityMedium: "Medie", priorityLow: "Scăzută",

    // Modul Reports
    repPageTitle: "Rapoarte și Analitice", repPageSub: "Performanța atelierului și indicatorii cheie de eficiență (KPI) extrași din baza de date.",
    repLoading: "Se generează analizele financiare și operaționale...", kpiResolveRate: "Rată Rezolvare Tichete",
    kpiTotalService: "din total service", kpiAvgTime: "Timp Mediu Alocat", kpiPerTool: "per echipament",
    kpiHoursCalc: "Calculat pe baza coloanei hours_worked", kpiCritical: "Tichete Critice", kpiHighPriority: "prioritate ridicată",
    kpiImmediateAttention: "⚠️ Necesită atenție imediată", secVolTitle: "Sumar Activitate Volum Service",
    tabTotal: "Total Înregistrate", tabActive: "În Curs (Active)", tabCompleted: "Reparate Complet", tabStockEff: "Eficiență Stoc Piese", tabStable: "Stabilă"
  },
  en: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Dashboard", repairs: "🔧 Repairs", tools: "🧰 Tools / Molds", parts: "📦 Spare Parts",
    technicians: "🧑‍🔧 Technicians Team", improvements: "💡 Improvements", reports: "📊 Reports", settings: "⚙️ GPO / Settings",
    logout: "Logout", logoutConfirm: "Are you sure you want to log out?",
    dashBadge: "Operational Management System", dashTitle: "ToolShop Pro — Control Panel",
    dashSub: "Integrated system for inventory monitoring, technician efficiency.",
    cardTools: "Total Tools", cardToolsSub: "● Live from warehouse", cardParts: "Stock Parts", cardPartsSub: "Kardex System",
    cardRepairs: "In Service", cardRepairsSub: "⚠️ Requires attention", cardTechs: "Technicians", cardTechsSub: "Available today",
    cardKaizen: "Kaizen / Ideas", cardKaizenSub: "🚀 Active proposals", sectionTitle: "Workshop Process Efficiency",
    barTechs: "Technician occupancy rate", barStock: "Parts Stock Accuracy (Automatic Kardex)",

    // Modul Repairs
    repTitle: "Maintenance Ticket Management", repSub: "Opening and tracking of technical service files",
    formTitle: "Open New Service File", selectTool: "Select Tool / Mold",
    inputFailure: "Description of failure found...", selectTech: "Assign Technician (Optional)",
    selectPriority: "Ticket Priority", selectPart: "Replaced Part from Kardex (Optional)",
    fileBefore: "Photo Before (Faulty)", fileAfter: "Photo After (Repaired)",
    btnSave: "Open Service File", btnSaving: "Saving to system...",
    alertFields: "Please select the tool and enter the failure description.", alertSuccess: "Service ticket has been opened successfully!",
    statusNew: "New Tickets", statusProgress: "In Progress", statusTesting: "Testing / QC", statusClosed: "Completed / Closed",
    btnExport: "Export", noRepairs: "No tickets in this stage", priorityHigh: "High", priorityMedium: "Medium", priorityLow: "Low",

    // Modul Reports
    repPageTitle: "Reports & Analytics", repPageSub: "Workshop performance and key efficiency indicators (KPIs) extracted from the database.",
    repLoading: "Generating financial and operational analysis...", kpiResolveRate: "Ticket Resolution Rate",
    kpiTotalService: "of total service", kpiAvgTime: "Average Time Spent", kpiPerTool: "per equipment",
    kpiHoursCalc: "Calculated based on the hours_worked column", kpiCritical: "Critical Tickets", kpiHighPriority: "high priority",
    kpiImmediateAttention: "⚠️ Requires immediate attention", secVolTitle: "Service Volume Activity Summary",
    tabTotal: "Total Registered", tabActive: "In Progress (Active)", tabCompleted: "Fully Repaired", tabStockEff: "Parts Stock Efficiency", tabStable: "Stable"
  },
  tr: {
    // Sidebar & Dashboard Base
    dashboard: "🏠 Panel", repairs: "🔧 Onarımlar", tools: "🧰 Araçlar / Kalıplar", parts: "📦 Yedek Parçalar",
    technicians: "🧑‍🔧 Teknisyen Ekibi", improvements: "💡 İyileştirmeler", reports: "📊 Raporlar", settings: "⚙️ GPO / Ayarlar",
    logout: "Çıkış Yap", logoutConfirm: "Sistemden extraction yapmak istediğinize emin misiniz?",
    dashBadge: "Operasyonel Yönetim Sistemi", dashTitle: "ToolShop Pro — Kontrol Paneli",
    dashSub: "Stok izleme, teknisyen verimliliği iş akışlarının uygulanması.",
    cardTools: "Toplam Ekipman", cardToolsSub: "● Depodan canlı", cardParts: "Stoktaki Parçalar", cardPartsSub: "Kardex Sistemi",
    cardRepairs: "Serviste", cardRepairsSub: "⚠️ Dikkat gerektiriyor", cardTechs: "Teknisyenler", cardTechsSub: "Bugün müsait",
    cardKaizen: "Kaizen / Fikirler", cardKaizenSub: "🚀 Aktif öneriler", sectionTitle: "Atölye Süreç Verimliliği",
    barTechs: "Teknisyen doluluk oranı", barStock: "Parça Stok Doğruluğu (Otomatik Kardex)",

    // Modul Repairs
    repTitle: "Bakım Talebi Yönetimi", repSub: "Teknik servis dosyalarının açılması ve takibi",
    formTitle: "Yeni Servis Dosyası Aç", selectTool: "Ekipman / Kalıp Seçin",
    inputFailure: "Tespit edilen arıza açıklaması...", selectTech: "Teknisyen Ata (İsteğe Bağlı)",
    selectPriority: "Talep Önceliği", selectPart: "Kardex'ten Değiştirilen Parça (İsteğe Bağlı)",
    fileBefore: "Önceki Fotoğraf (Arızalı)", fileAfter: "Sonraki Fotoğraf (Onarılmış)",
    btnSave: "Servis Dosyasını Aç", btnSaving: "Sisteme kaydediliyor...",
    alertFields: "Lütfen ekipmanı seçin ve arıza açıklamasını girin.", alertSuccess: "Servis talebi başarıyla açıldı!",
    statusNew: "Yeni Talepler", statusProgress: "İşlemde", statusTesting: "Test / Kontrol", statusClosed: "Tamamlandı / Kapandı",
    btnExport: "Dışa Aktar", noRepairs: "Bu aşamada talep bulunmamaktadır", priorityHigh: "Yüksek", priorityMedium: "Orta", priorityLow: "Düşük",

    // Modul Reports
    repPageTitle: "Raporlar ve Analizler", repPageSub: "Veritabanından alınan atölye performansı ve temel verimlilik göstergeleri (KPI).",
    repLoading: "Finansal ve operasyonel analizler oluşturuluyor...", kpiResolveRate: "Talep Çözüm Oranı",
    kpiTotalService: "toplam servisin", kpiAvgTime: "Harcanan Ortalama Süre", kpiPerTool: "ekipman başına",
    kpiHoursCalc: "hours_worked sütununa göre hesaplanmıştır", kpiCritical: "Kritik Talepler", kpiHighPriority: "yüksek öncelikli",
    kpiImmediateAttention: "⚠️ Acil müdahale gerektiriyor", secVolTitle: "Servis Hacmi Faaliyet Özeti",
    tabTotal: "Toplam Kayıtlı", tabActive: "İşlemde (Aktif)", tabCompleted: "Tamamen Onarıldı", tabStockEff: "Parça Stok Verimliliği", tabStable: "Dengeli"
  },
};

type Language = "ro" | "en" | "tr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.ro;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ro");

  useEffect(() => {
    const savedLang = localStorage.getItem("toolshop_lang") as Language;
    if (savedLang && (savedLang === "ro" || savedLang === "en" || savedLang === "tr")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("toolshop_lang", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage trebuie folosit în interiorul unui LanguageProvider");
  return context;
}
