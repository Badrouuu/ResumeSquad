import { NextResponse } from "next/server";
import { RadarJobOffer } from "@/app/data/radarOffers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const liveOffers: RadarJobOffer[] = [];

    // 1. Récupération du flux en direct SwissDevJobs (Suisse 🇨🇭)
    try {
      const chRes = await fetch("https://swissdevjobs.ch/api/jobsLight", {
        headers: { "User-Agent": "ResumeSquad-PFE-Bot/1.0" },
        next: { revalidate: 3600 }, // Cache 1h
      });

      if (chRes.ok) {
        const chJobs = await chRes.json();
        if (Array.isArray(chJobs)) {
          // Filtrer les postes orientés IA / ML / Data / Python qui ne sont PAS en 100% full remote
          const matchingCh = chJobs.filter((j: any) => {
            const combined = `${j.name || ""} ${j.company || ""} ${(j.technologies || []).join(" ")} ${(j.filterTags || []).join(" ")}`.toLowerCase();
            const isAiOrPython =
              combined.includes("machine learning") ||
              combined.includes("deep learning") ||
              combined.includes("nlp") ||
              combined.includes("vision") ||
              combined.includes("pytorch") ||
              combined.includes("python") ||
              combined.includes("data scientist") ||
              combined.includes("ai engineer");
            const isInternOrJuniorOrRelevant =
              combined.includes("intern") ||
              combined.includes("stage") ||
              combined.includes("pfe") ||
              combined.includes("junior") ||
              combined.includes("trainee") ||
              combined.includes("entry") ||
              combined.includes("graduate") ||
              j.expLevel === "Junior" ||
              j.expLevel === "Regular";
            const isNotRemote = j.workplace !== "remote";
            return isAiOrPython && isInternOrJuniorOrRelevant && isNotRemote;
          });

          // Convertir en format RadarJobOffer
          matchingCh.slice(0, 8).forEach((j: any) => {
            const city = j.actualCity || j.cityCategory || "Suisse";
            const salary = j.annualSalaryFrom
              ? `${Math.round(j.annualSalaryFrom / 12).toLocaleString("fr-CH")} CHF / mois (est.)`
              : "Selon profil & convention";
            const directUrl =
              j.redirectJobUrl || `https://swissdevjobs.ch/jobs/${j.jobUrl || ""}`;

            liveOffers.push({
              id: `live-ch-${j._id || Math.random()}`,
              company: j.company || "Entreprise Tech Suisse",
              title: j.name || "AI / Python Software Engineer",
              location: `${city}, Suisse`,
              country: "Suisse",
              countryFlag: "🇨🇭",
              workplace: j.workplace === "office" ? "Présentiel" : "Hybride",
              compensation: salary,
              skills: (j.technologies || ["Python", "Machine Learning"]).slice(0, 6),
              url: directUrl,
              description: `Poste détecté en direct sur le marché suisse (${city}).
Technologies clés : ${(j.technologies || []).join(", ")}.
Entreprise : ${j.company} (${j.companySize || "PME/Scale-up"}).
Langue de travail : ${j.language || "Anglais / Français"}.
Type de présence : ${j.workplace === "office" ? "Présentiel" : "Hybride"}.
Lien direct d'application disponible.`,
            });
          });
        }
      }
    } catch (chErr) {
      console.warn("Erreur récupération SwissDevJobs:", chErr);
    }

    // 2. Récupération du flux en direct GermanTechJobs (Munich/Berlin, Allemagne 🇩🇪)
    try {
      const deRes = await fetch("https://germantechjobs.de/api/jobsLight", {
        headers: { "User-Agent": "ResumeSquad-PFE-Bot/1.0" },
        next: { revalidate: 3600 },
      });

      if (deRes.ok) {
        const deJobs = await deRes.json();
        if (Array.isArray(deJobs)) {
          const matchingDe = deJobs.filter((j: any) => {
            const combined = `${j.name || ""} ${j.company || ""} ${(j.technologies || []).join(" ")} ${(j.filterTags || []).join(" ")}`.toLowerCase();
            const isAiOrPython =
              combined.includes("machine learning") ||
              combined.includes("computer vision") ||
              combined.includes("ai") ||
              combined.includes("deep learning") ||
              combined.includes("python");
            const isStudentOrJunior =
              combined.includes("intern") ||
              combined.includes("werkstudent") ||
              combined.includes("working student") ||
              combined.includes("trainee") ||
              combined.includes("pfe") ||
              combined.includes("junior") ||
              j.expLevel === "Junior";
            const isNotRemote = j.workplace !== "remote";
            return isAiOrPython && isStudentOrJunior && isNotRemote;
          });

          matchingDe.slice(0, 4).forEach((j: any) => {
            const city = j.actualCity || j.cityCategory || "Munich";
            const salary = j.annualSalaryFrom
              ? `${Math.round(j.annualSalaryFrom / 12).toLocaleString("de-DE")} € / mois (est.)`
              : "Selon convention";
            const directUrl =
              j.redirectJobUrl || `https://germantechjobs.de/jobs/${j.jobUrl || ""}`;

            liveOffers.push({
              id: `live-de-${j._id || Math.random()}`,
              company: j.company || "German Tech Hub",
              title: j.name || "Deep Learning / Python Engineer",
              location: `${city}, Allemagne`,
              country: "Allemagne",
              countryFlag: "🇩🇪",
              workplace: j.workplace === "office" ? "Présentiel" : "Hybride",
              compensation: salary,
              skills: (j.technologies || ["Python", "Deep Learning"]).slice(0, 6),
              url: directUrl,
              description: `Opportunité en direct en Allemagne (${city}).
Stack technique : ${(j.technologies || []).join(", ")}.
Profil recherché : Étudiant(e) / Jeune diplômé en Informatique & IA.
Environnement : ${j.workplace === "office" ? "Présentiel" : "Hybride"}.`,
            });
          });
        }
      }
    } catch (deErr) {
      console.warn("Erreur récupération GermanTechJobs:", deErr);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: liveOffers.length,
      offers: liveOffers,
    });
  } catch (error: any) {
    console.error("Erreur live radar scanner:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur de scan en direct" },
      { status: 500 }
    );
  }
}
