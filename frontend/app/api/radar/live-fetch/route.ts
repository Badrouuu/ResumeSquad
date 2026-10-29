import { NextResponse } from "next/server";
import { RadarJobOffer } from "@/app/data/radarOffers";

export const dynamic = "force-dynamic";

// Fonction d'extraction légère des offres LinkedIn (API Guest ouverte, sans compte ni clé payante)
async function fetchLinkedInGuestJobs(
  keywords: string,
  location: string,
  country: "Suisse" | "Luxembourg" | "Belgique",
  countryFlag: string
): Promise<RadarJobOffer[]> {
  const offers: RadarJobOffer[] = [];
  try {
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedKeywords}&location=${encodedLocation}&start=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      },
      next: { revalidate: 1800 }, // Cache 30 minutes
    });

    if (!res.ok) return offers;

    const html = await res.text();
    const titles = [...html.matchAll(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/g)].map((m) =>
      m[1].trim().replace(/&amp;/g, "&").replace(/&#39;/g, "'")
    );
    const companies = [...html.matchAll(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/g)].map((m) =>
      m[1].trim().replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim()
    );
    const locations = [...html.matchAll(/<span class="job-search-card__location">([\s\S]*?)<\/span>/g)].map((m) =>
      m[1].trim()
    );
    const links = [...html.matchAll(/<a class="base-card__full-link[^"]*" href="([^"]*)"/g)].map((m) =>
      m[1].trim().split("?")[0]
    );

    for (let i = 0; i < titles.length; i++) {
      const rawTitle = titles[i] || "";
      const rawCompany = companies[i] || "Entreprise Internationale";
      const rawLocation = locations[i] || location;
      const jobUrl =
        links[i] ||
        `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}`;

      // Déduction dynamique des compétences techniques
      const lower = rawTitle.toLowerCase();
      const detectedSkills: string[] = ["Python"];
      if (lower.includes("machine learning") || lower.includes("ml")) detectedSkills.push("Machine Learning", "PyTorch");
      if (lower.includes("vision") || lower.includes("image")) detectedSkills.push("Computer Vision", "OpenCV");
      if (lower.includes("nlp") || lower.includes("llm") || lower.includes("language")) detectedSkills.push("NLP", "LLMs");
      if (lower.includes("data") || lower.includes("scientist") || lower.includes("analytics")) detectedSkills.push("Data Science", "SQL");
      if (lower.includes("autonomy") || lower.includes("robotics")) detectedSkills.push("C++", "Robotics");
      if (lower.includes("signal") || lower.includes("sensor")) detectedSkills.push("Signal Processing", "NumPy");

      const estimatedSalary =
        country === "Suisse"
          ? "3,500 - 6,000 CHF / mois (est.)"
          : "1,850 - 3,200 € / mois (est.)";

      offers.push({
        id: `live-linkedin-${country.toLowerCase()}-${i}-${rawCompany.slice(0, 10).replace(/\s+/g, "").toLowerCase()}`,
        company: rawCompany,
        title: rawTitle,
        location: rawLocation,
        country: country,
        countryFlag: countryFlag,
        workplace: "Hybride",
        compensation: estimatedSalary,
        skills: detectedSkills,
        url: jobUrl,
        description: `Offre en direct détectée sur LinkedIn (${country}).
Poste : ${rawTitle}
Entreprise : ${rawCompany}
Localisation : ${rawLocation}
Contrat : Stage / Internship (PFE)
Source : Flux de recrutement direct LinkedIn Jobs.
Cliquez sur "Importer & Adapter ce CV" pour lancer l'escouade multi-agents Gemini ou sur "Offre ↗" pour postuler.`,
      });
    }
  } catch (err) {
    console.warn(`Erreur récupération LinkedIn pour ${location}:`, err);
  }
  return offers;
}

export async function GET() {
  try {
    const liveOffers: RadarJobOffer[] = [];

    // Exécution concurrente pour vitesse maximale (< 3s)
    const [linkedInCh, linkedInLux, linkedInBe, swissDevJobs, germanJobs] = await Promise.allSettled([
      fetchLinkedInGuestJobs("Machine Learning Intern", "Switzerland", "Suisse", "🇨🇭"),
      fetchLinkedInGuestJobs("Machine Learning Intern", "Luxembourg", "Luxembourg", "🇱🇺"),
      fetchLinkedInGuestJobs("Machine Learning Intern", "Brussels", "Belgique", "🇧🇪"),
      // SwissDevJobs API
      (async () => {
        const res = await fetch("https://swissdevjobs.ch/api/jobsLight", {
          headers: { "User-Agent": "ResumeSquad-Bot/1.0" },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const jobs = await res.json();
        if (!Array.isArray(jobs)) return [];
        return jobs
          .filter((j: any) => {
            const combined = `${j.name || ""} ${j.company || ""} ${(j.technologies || []).join(" ")}`.toLowerCase();
            const isAi = combined.includes("machine learning") || combined.includes("ai") || combined.includes("python") || combined.includes("data");
            const isJunior = combined.includes("intern") || combined.includes("junior") || combined.includes("stage") || j.expLevel === "Junior";
            return isAi && isJunior && j.workplace !== "remote";
          })
          .slice(0, 6)
          .map((j: any) => ({
            id: `live-sdj-${j._id}`,
            company: j.company,
            title: j.name,
            location: `${j.actualCity || j.cityCategory || "Suisse"}, Suisse`,
            country: "Suisse" as const,
            countryFlag: "🇨🇭",
            workplace: (j.workplace === "office" ? "Présentiel" : "Hybride") as "Présentiel" | "Hybride",
            compensation: j.annualSalaryFrom ? `${Math.round(j.annualSalaryFrom / 12).toLocaleString("fr-CH")} CHF / mois` : "Selon profil",
            skills: (j.technologies || ["Python", "Machine Learning"]).slice(0, 6),
            url: j.redirectJobUrl || `https://swissdevjobs.ch/jobs/${j.jobUrl}`,
            description: `Poste tech en direct en Suisse (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          }));
      })(),
      // GermanTechJobs API
      (async () => {
        const res = await fetch("https://germantechjobs.de/api/jobsLight", {
          headers: { "User-Agent": "ResumeSquad-Bot/1.0" },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const jobs = await res.json();
        if (!Array.isArray(jobs)) return [];
        return jobs
          .filter((j: any) => {
            const combined = `${j.name || ""} ${j.company || ""} ${(j.technologies || []).join(" ")}`.toLowerCase();
            const isAi = combined.includes("machine learning") || combined.includes("computer vision") || combined.includes("deep learning") || combined.includes("python");
            const isJunior = combined.includes("intern") || combined.includes("werkstudent") || combined.includes("junior") || j.expLevel === "Junior";
            return isAi && isJunior && j.workplace !== "remote";
          })
          .slice(0, 4)
          .map((j: any) => ({
            id: `live-gtj-${j._id}`,
            company: j.company,
            title: j.name,
            location: `${j.actualCity || j.cityCategory || "Munich"}, Allemagne`,
            country: "Allemagne" as const,
            countryFlag: "🇩🇪",
            workplace: (j.workplace === "office" ? "Présentiel" : "Hybride") as "Présentiel" | "Hybride",
            compensation: j.annualSalaryFrom ? `${Math.round(j.annualSalaryFrom / 12).toLocaleString("de-DE")} € / mois` : "Selon convention",
            skills: (j.technologies || ["Python", "Computer Vision"]).slice(0, 6),
            url: j.redirectJobUrl || `https://germantechjobs.de/jobs/${j.jobUrl}`,
            description: `Opportunité en direct en Allemagne (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          }));
      })(),
    ]);

    // Rassembler les résultats validés
    if (linkedInCh.status === "fulfilled") liveOffers.push(...linkedInCh.value);
    if (linkedInLux.status === "fulfilled") liveOffers.push(...linkedInLux.value);
    if (linkedInBe.status === "fulfilled") liveOffers.push(...linkedInBe.value);
    if (swissDevJobs.status === "fulfilled") liveOffers.push(...swissDevJobs.value);
    if (germanJobs.status === "fulfilled") liveOffers.push(...germanJobs.value);

    // Déduplication par entreprise + titre
    const seen = new Set<string>();
    const deduplicatedOffers = liveOffers.filter((o) => {
      const key = `${o.company.toLowerCase().trim()}-${o.title.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: deduplicatedOffers.length,
      offers: deduplicatedOffers,
    });
  } catch (error: any) {
    console.error("Erreur live radar scanner:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur de scan en direct" },
      { status: 500 }
    );
  }
}
