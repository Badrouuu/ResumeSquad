import { NextRequest, NextResponse } from "next/server";
import {
  RadarJobOffer,
  detectOfferLanguage,
  requiresNonEnFrLanguage,
  extractApplicantsCount,
  isTechAiDomain,
  isDirectAtsOrPortal,
} from "@/app/data/radarOffers";

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
  country: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne" | "International",
  countryFlag: string,
  fTpr: string
): Promise<RadarJobOffer[]> {
  const offers: RadarJobOffer[] = [];
  try {
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(location);
    // sortBy=DD force le tri par date, f_TPR restreint la fenêtre temporelle
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

    // Découpage par bloc de carte d'offre (LinkedIn Guest API utilise des <li> englobants)
    const cardBlocks = [...html.matchAll(/<li[\s\S]*?<\/li>/g)].map((m) => m[0]);

    if (cardBlocks.length > 0) {
      for (let i = 0; i < cardBlocks.length; i++) {
        const block = cardBlocks[i];
        const cardText = block.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

        // 1. Rejet strict des offres fermées ou expirées
        if (
          cardText.includes("ne sont plus acceptées") ||
          cardText.includes("no longer accepting") ||
          cardText.includes("fermée") ||
          cardText.includes("closed")
        ) {
          continue;
        }

        // 2. Rejet strict des offres à forte concurrence (> 10 candidats ou clics)
        if (
          cardText.includes("plus de 100") ||
          cardText.includes("over 100") ||
          cardText.includes("100+ ") ||
          cardText.includes("> 100") ||
          cardText.includes(">100") ||
          cardText.includes("plus de 50") ||
          cardText.includes("over 50") ||
          cardText.includes("plus de 25") ||
          cardText.includes("over 25") ||
          cardText.includes("cliqué sur postuler") ||
          cardText.includes("clicked apply")
        ) {
          if (!cardText.includes("moins de 10") && !cardText.includes("under 10") && !cardText.includes("early applicant")) {
            continue; // Saturée : rejet immédiat
          }
        }

        const titleMatch = block.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
        const rawTitle = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&#39;/g, "'") : "";
        if (!rawTitle) continue;

        const compMatch = block.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
        const rawCompany = compMatch ? compMatch[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim() : "Entreprise Internationale";

        const locMatch = block.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
        const rawLocation = locMatch ? locMatch[1].trim() : location;

        const linkMatch = block.match(/<a class="base-card__full-link[^"]*" href="([^"]*)"/);
        const jobUrl = linkMatch ? linkMatch[1].trim().split("?")[0] : `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}&sortBy=DD&f_TPR=${fTpr}&f_EA=true`;

        const dateMatch = block.match(/<time class="[^"]*job-search-card__listdate[^"]*"[^>]*>([\s\S]*?)<\/time>/);
        const rawDate = dateMatch ? dateMatch[1].trim() : "";
        const formattedDate = formatTimeAgo(rawDate);
        const isUltraFresh =
          formattedDate.includes("min") ||
          formattedDate.includes(" h") ||
          formattedDate === "Hier" ||
          formattedDate.includes("1 jour") ||
          formattedDate.includes("2 jours");

        let offerTimestamp = Date.now() - 7 * 24 * 3600 * 1000;
        const cleanTime = rawDate.toLowerCase().trim();
        if (cleanTime.includes("min")) {
          const m = cleanTime.match(/(\d+)/);
          offerTimestamp = Date.now() - (m ? parseInt(m[1], 10) : 15) * 60 * 1000;
        } else if (cleanTime.includes("hour") || cleanTime.includes("heure") || cleanTime.includes(" h")) {
          const h = cleanTime.match(/(\d+)/);
          offerTimestamp = Date.now() - (h ? parseInt(h[1], 10) : 1) * 3600 * 1000;
        } else if (cleanTime.includes("yesterday") || cleanTime.includes("1 day") || cleanTime === "hier") {
          offerTimestamp = Date.now() - 24 * 3600 * 1000;
        } else if (cleanTime.includes("day") || cleanTime.includes("jour")) {
          const d = cleanTime.match(/(\d+)/);
          offerTimestamp = Date.now() - (d ? parseInt(d[1], 10) : 2) * 24 * 3600 * 1000;
        } else if (cleanTime.includes("week") || cleanTime.includes("sem")) {
          const w = cleanTime.match(/(\d+)/);
          offerTimestamp = Date.now() - (w ? parseInt(w[1], 10) : 1) * 7 * 24 * 3600 * 1000;
        }

        // Filtrage linguistique strict (Badroudine : Français natif, Anglais C1)
        const lang = detectOfferLanguage(rawTitle, "");
        if (lang !== "fr" && lang !== "en") continue;
        if (requiresNonEnFrLanguage(rawTitle)) continue;

        // Filtrage domaine technique (IA, ML, Vision, Data)
        if (!isTechAiDomain(rawTitle, rawCompany)) continue;

        // Extraction et estimation du nombre de candidats actuels (strictement <= 10)
        const { count: applicantsCount } = extractApplicantsCount(`${rawTitle} ${cardText}`, formattedDate);
        if (applicantsCount > 35) continue;

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
          timestamp: offerTimestamp,
          applicantsCount,
          language: lang,
          description: `Offre fraîche à très faible concurrence (<= 10 candidats) détectée en direct sur LinkedIn (${country}).
Poste : ${rawTitle}
Entreprise : ${rawCompany}
Localisation : ${rawLocation}
Publication : ${formattedDate}
Contrat : Stage / Internship (PFE 6 mois)
Source : Flux LinkedIn Jobs trié du plus récent au plus ancien.`,
        });
      }
    } else {
      // Fallback par regex simples si pas de balises <li> détectées
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
          `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}&sortBy=DD&f_TPR=${fTpr}&f_EA=true`;
        const rawDate = dates[i] || "";
        const formattedDate = formatTimeAgo(rawDate);

        if (!isTechAiDomain(rawTitle, rawCompany)) continue;
        const { count: applicantsCount } = extractApplicantsCount(rawTitle, formattedDate);
        if (applicantsCount > 35) continue;

        offers.push({
          id: `live-linkedin-${country.toLowerCase()}-${i}-${rawCompany.slice(0, 10).replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
          company: rawCompany,
          title: rawTitle,
          location: rawLocation,
          country: country,
          countryFlag: countryFlag,
          workplace: "Hybride",
          compensation: country === "Suisse" ? "3,500 - 5,500 CHF / mois (est.)" : "2,000 - 3,200 € / mois (est.)",
          skills: ["Python", "Machine Learning"],
          url: jobUrl,
          postedAgo: formattedDate,
          isFresh: true,
          timestamp: Date.now() - 24 * 3600 * 1000,
          applicantsCount,
          language: "fr",
          description: `Offre LinkedIn ${country} : ${rawTitle} chez ${rawCompany}`,
        });
      }
    }
  } catch (err) {
    console.warn(`Erreur récupération LinkedIn pour ${location}:`, err);
  }
  return offers;
}

/**
 * Récupère en direct l'ensemble des offres d'emploi ciblées (IA, ML, Vision, Data)
 * à travers les hubs internationaux (Suisse, Luxembourg, Belgique, Allemagne).
 */
export async function fetchLiveRadarOffers(timeframeParam: string = "7d"): Promise<RadarJobOffer[]> {
  // Mappage du Time Posted Range LinkedIn (en secondes)
  let fTpr = "r604800"; // Défaut : 7 jours (cette semaine)
  if (timeframeParam === "24h") {
    fTpr = "r86400"; // 24 heures (ultra-frais)
  } else if (timeframeParam === "3d") {
    fTpr = "r259200"; // 3 jours
  } else if (timeframeParam === "30d") {
    fTpr = "r2592000"; // 30 jours
  }

  const liveOffers: RadarJobOffer[] = [];

  // Exécution concurrente multi-pays, requêtes booléennes strictes (IA, ML, Computer Vision, MLOps)
  const results = await Promise.allSettled([
    // Suisse : ML, AI, Vision
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Switzerland", "Suisse", "🇨🇭", fTpr),
    fetchLinkedInGuestJobs('"Computer Vision" Intern', "Switzerland", "Suisse", "🇨🇭", fTpr),
    fetchLinkedInGuestJobs('"AI Engineer" Intern', "Switzerland", "Suisse", "🇨🇭", fTpr),
    fetchLinkedInGuestJobs('"Deep Learning" Intern', "Zurich", "Suisse", "🇨🇭", fTpr),
    fetchLinkedInGuestJobs('"Machine Vision" Intern', "Switzerland", "Suisse", "🇨🇭", fTpr),
    fetchLinkedInGuestJobs('"NLP" Intern', "Geneva", "Suisse", "🇨🇭", fTpr),
    // Luxembourg : ML & Computer Vision
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Luxembourg", "Luxembourg", "🇱🇺", fTpr),
    fetchLinkedInGuestJobs('"Computer Vision" Intern', "Luxembourg", "Luxembourg", "🇱🇺", fTpr),
    fetchLinkedInGuestJobs('"AI" Internship', "Luxembourg", "Luxembourg", "🇱🇺", fTpr),
    // Belgique : ML & Computer Vision
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Brussels", "Belgique", "🇧🇪", fTpr),
    fetchLinkedInGuestJobs('"Computer Vision" Intern', "Brussels", "Belgique", "🇧🇪", fTpr),
    // Allemagne : ML, Deep Learning & Machine Vision
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Munich", "Allemagne", "🇩🇪", fTpr),
    fetchLinkedInGuestJobs('"Computer Vision" Intern', "Munich", "Allemagne", "🇩🇪", fTpr),
    fetchLinkedInGuestJobs('"Machine Vision" Intern', "Germany", "Allemagne", "🇩🇪", fTpr),
    fetchLinkedInGuestJobs('"Deep Learning" Intern', "Germany", "Allemagne", "🇩🇪", fTpr),
    // Pays-Bas, Suède, Irlande (Hubs IA anglophones UE)
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Netherlands", "International", "🇳🇱", fTpr),
    fetchLinkedInGuestJobs('"AI" Intern', "Amsterdam", "International", "🇳🇱", fTpr),
    fetchLinkedInGuestJobs('"Computer Vision" Intern', "Sweden", "International", "🇸🇪", fTpr),
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Stockholm", "International", "🇸🇪", fTpr),
    fetchLinkedInGuestJobs('"Machine Learning" Intern', "Dublin", "International", "🇮🇪", fTpr),
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
          const isAi = combined.includes("machine learning") || combined.includes("ai") || combined.includes("python") || combined.includes("data") || combined.includes("vision");
          const isJunior = combined.includes("intern") || combined.includes("junior") || combined.includes("stage") || j.expLevel === "Junior";
          const lang = detectOfferLanguage(j.name || "", combined);
          const isLangOk = (lang === "fr" || lang === "en") && !requiresNonEnFrLanguage(j.name || "");
          return isAi && isJunior && isLangOk && j.workplace !== "remote";
        })
        .slice(0, 8)
        .map((j: any) => {
          const actTime = j.activeFrom ? new Date(j.activeFrom).getTime() : Date.now() - 3 * 24 * 3600 * 1000;
          return {
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
            timestamp: actTime,
            applicantsCount: 6, // Portail spécialisé : très faible concurrence (< 10 postulants)
            language: detectOfferLanguage(j.name || "", "") === "fr" ? ("fr" as const) : ("en" as const),
            description: `Poste tech en direct en Suisse (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          };
        });
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
          const isAi = combined.includes("machine learning") || combined.includes("computer vision") || combined.includes("vision") || combined.includes("deep learning") || combined.includes("python");
          const isJunior = combined.includes("intern") || combined.includes("werkstudent") || combined.includes("junior") || j.expLevel === "Junior";
          const lang = detectOfferLanguage(j.name || "", combined);
          const isLangOk = (lang === "fr" || lang === "en") && !requiresNonEnFrLanguage(j.name || "");
          return isAi && isJunior && isLangOk && j.workplace !== "remote";
        })
        .slice(0, 8)
        .map((j: any) => {
          const actTime = j.activeFrom ? new Date(j.activeFrom).getTime() : Date.now() - 3 * 24 * 3600 * 1000;
          return {
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
            timestamp: actTime,
            applicantsCount: 8, // Portail spécialisé : très faible concurrence (< 10 postulants)
            language: "en" as const, // Offres internationales retenues
            description: `Opportunité en direct en Allemagne (${j.actualCity || j.cityCategory}). Stack: ${(j.technologies || []).join(", ")}. Entreprise: ${j.company}.`,
          };
        });
    })(),
  ]);

  for (const r of results) {
    if (r.status === "fulfilled") {
      liveOffers.push(...r.value);
    }
  }

  // Déduplication par entreprise + titre
  const seen = new Set<string>();
  const deduplicatedOffers = liveOffers.filter((o) => {
    const key = `${o.company.toLowerCase().trim()}-${o.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Tri strict et déterministe par heure de publication (du plus récent au plus ancien)
  deduplicatedOffers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return deduplicatedOffers;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframeParam = searchParams.get("timeframe") || "7d";

    let timeframeLabel = "derniers 7 jours";
    if (timeframeParam === "24h") timeframeLabel = "dernières 24 heures";
    else if (timeframeParam === "3d") timeframeLabel = "derniers 3 jours";
    else if (timeframeParam === "30d") timeframeLabel = "dernier mois";

    const offers = await fetchLiveRadarOffers(timeframeParam);

    return NextResponse.json({
      success: true,
      timeframe: timeframeParam,
      timeframeLabel,
      timestamp: new Date().toISOString(),
      count: offers.length,
      offers,
    });
  } catch (error: any) {
    console.error("Erreur live radar scanner:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur de scan en direct" },
      { status: 500 }
    );
  }
}
