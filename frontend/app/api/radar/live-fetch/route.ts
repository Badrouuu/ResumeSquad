import { NextRequest, NextResponse } from "next/server";
import { RadarJobOffer } from "@/app/data/radarOffers";

export const dynamic = "force-dynamic";

// Convertit les indications temporelles de LinkedIn en français lisible
function formatTimeAgo(raw: string): string {
  const clean = raw.toLowerCase().trim();
  if (!clean) return "Récent";
  if (clean.includes("minute")) {
    const m = clean.match(/(\d+)/);
    return m ? `Il y a ${m[1]} min` : "Il y a quelques minutes";
  }
  if (clean.includes("hour")) {
    const h = clean.match(/(\d+)/);
    return h ? `Il y a ${h[1]} h` : "Il y a 1 h";
  }
  if (clean.includes("1 day") || clean === "yesterday") {
    return "Hier";
  }
  if (clean.includes("day")) {
    const d = clean.match(/(\d+)/);
    return d ? `Il y a ${d[1]} jours` : "Il y a quelques jours";
  }
  if (clean.includes("week")) {
    const w = clean.match(/(\d+)/);
    return w ? `Il y a ${w[1]} sem.` : "Cette semaine";
  }
  return raw;
}

// Fonction d'extraction en direct des offres LinkedIn avec filtres de fraîcheur stricts (API Guest)
async function fetchLinkedInGuestJobs(
  keywords: string,
  location: string,
  country: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne",
  countryFlag: string,
  fTpr: string
): Promise<RadarJobOffer[]> {
  const offers: RadarJobOffer[] = [];
  try {
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(location);
    // sortBy=DD force le tri par date (du plus récent au plus ancien), f_TPR restreint la fenêtre temporelle
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedKeywords}&location=${encodedLocation}&sortBy=DD&f_TPR=${fTpr}&start=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      },
      next: { revalidate: 300 }, // Cache court de 5 minutes pour garantir l'extrême fraîcheur
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
    const dates = [...html.matchAll(/<time class="[^"]*job-search-card__listdate[^"]*"[^>]*>([\s\S]*?)<\/time>/g)].map((m) =>
      m[1].trim()
    );

    for (let i = 0; i < titles.length; i++) {
      const rawTitle = titles[i] || "";
      const rawCompany = companies[i] || "Entreprise Internationale";
      const rawLocation = locations[i] || location;
      const jobUrl =
        links[i] ||
        `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}&sortBy=DD&f_TPR=${fTpr}`;

      const rawDate = dates[i] || "";
      const formattedDate = formatTimeAgo(rawDate);
      const isUltraFresh =
        formattedDate.includes("min") ||
        formattedDate.includes(" h") ||
        formattedDate === "Hier" ||
        formattedDate.includes("1 jour") ||
        formattedDate.includes("2 jours");

      // Déduction dynamique des compétences techniques
      const lower = rawTitle.toLowerCase();
      const detectedSkills: string[] = ["Python"];
      if (lower.includes("machine learning") || lower.includes("ml")) detectedSkills.push("Machine Learning", "PyTorch");
      if (lower.includes("vision") || lower.includes("image")) detectedSkills.push("Computer Vision", "OpenCV");
      if (lower.includes("nlp") || lower.includes("llm") || lower.includes("language") || lower.includes("agentic")) detectedSkills.push("NLP", "LLMs", "RAG");
      if (lower.includes("data") || lower.includes("scientist") || lower.includes("analytics")) detectedSkills.push("Data Science", "SQL");
      if (lower.includes("autonomy") || lower.includes("robotics")) detectedSkills.push("C++", "Robotics");
      if (lower.includes("signal") || lower.includes("sensor")) detectedSkills.push("Signal Processing", "NumPy");

      const estimatedSalary =
        country === "Suisse"
          ? "3,500 - 5,500 CHF / mois (est.)"
          : "2,000 - 3,200 € / mois (est.)";

      offers.push({
        id: `live-linkedin-${country.toLowerCase()}-${i}-${rawCompany.slice(0, 10).replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
        company: rawCompany,
        title: rawTitle,
        location: rawLocation,
        country: country,
        countryFlag: countryFlag,
        workplace: "Hybride",
        compensation: estimatedSalary,
        skills: detectedSkills,
        url: jobUrl,
        postedAgo: formattedDate,
        isFresh: isUltraFresh,
        description: `Offre fraîche détectée en direct sur LinkedIn (${country}).
Poste : ${rawTitle}
Entreprise : ${rawCompany}
Localisation : ${rawLocation}
Publication : ${formattedDate}
Contrat : Stage / Internship (PFE 6 mois)
Source : Flux LinkedIn Jobs trié du plus récent au plus ancien.`,
      });
    }
  } catch (err) {
    console.warn(`Erreur récupération LinkedIn pour ${location}:`, err);
  }
  return offers;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframeParam = searchParams.get("timeframe") || "7d";

    // Mappage du Time Posted Range LinkedIn (en secondes)
    let fTpr = "r604800"; // Défaut : 7 jours (cette semaine)
    let timeframeLabel = "derniers 7 jours";

    if (timeframeParam === "24h") {
      fTpr = "r86400"; // 24 heures (ultra-frais)
      timeframeLabel = "dernières 24 heures";
    } else if (timeframeParam === "3d") {
      fTpr = "r259200"; // 3 jours
      timeframeLabel = "derniers 3 jours";
    } else if (timeframeParam === "30d") {
      fTpr = "r2592000"; // 30 jours
      timeframeLabel = "dernier mois";
    }

    const liveOffers: RadarJobOffer[] = [];

    // Exécution concurrente multi-pays et multi-mots-clés pour vitesse maximale (< 3s)
    const [
      linkedInChMl,
      linkedInChAi,
      linkedInLux,
      linkedInBe,
      linkedInDe,
      swissDevJobs,
      germanJobs,
    ] = await Promise.allSettled([
      fetchLinkedInGuestJobs("Machine Learning Intern", "Switzerland", "Suisse", "🇨🇭", fTpr),
      fetchLinkedInGuestJobs("AI Engineer Intern", "Switzerland", "Suisse", "🇨🇭", fTpr),
      fetchLinkedInGuestJobs("Internship Machine Learning", "Luxembourg", "Luxembourg", "🇱🇺", fTpr),
      fetchLinkedInGuestJobs("Machine Learning Intern", "Brussels", "Belgique", "🇧🇪", fTpr),
      fetchLinkedInGuestJobs("Machine Learning Intern", "Munich", "Allemagne", "🇩🇪", fTpr),
      // SwissDevJobs API
      (async () => {
        const res = await fetch("https://swissdevjobs.ch/api/jobsLight", {
          headers: { "User-Agent": "ResumeSquad-Bot/1.0" },
          next: { revalidate: 1800 },
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
            postedAgo: "Cette semaine",
            isFresh: true,
            description: `Poste tech en direct en Suisse (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          }));
      })(),
      // GermanTechJobs API
      (async () => {
        const res = await fetch("https://germantechjobs.de/api/jobsLight", {
          headers: { "User-Agent": "ResumeSquad-Bot/1.0" },
          next: { revalidate: 1800 },
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
          .slice(0, 5)
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
            postedAgo: "Cette semaine",
            isFresh: true,
            description: `Opportunité en direct en Allemagne (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          }));
      })(),
    ]);

    // Rassembler les résultats validés
    if (linkedInChMl.status === "fulfilled") liveOffers.push(...linkedInChMl.value);
    if (linkedInChAi.status === "fulfilled") liveOffers.push(...linkedInChAi.value);
    if (linkedInLux.status === "fulfilled") liveOffers.push(...linkedInLux.value);
    if (linkedInBe.status === "fulfilled") liveOffers.push(...linkedInBe.value);
    if (linkedInDe.status === "fulfilled") liveOffers.push(...linkedInDe.value);
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
      timeframe: timeframeParam,
      timeframeLabel,
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
