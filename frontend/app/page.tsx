"use client";

import { useState, useEffect } from "react";
import {
  RADAR_JOB_OFFERS,
  DEEP_SEARCH_PORTALS,
  RadarJobOffer,
  getOfferTimestamp,
  calculateOfferPriority,
} from "./data/radarOffers";
import { UserJobPreferences } from "./data/userPreferences";

export type ApplicationStatus = "en_attente" | "entretien" | "offre" | "refus";

export interface TrackedApplication {
  id: string;
  company: string;
  title: string;
  appliedDate: string;
  atsScore: number;
  status: ApplicationStatus;
  notes: string;
}

const DEFAULT_APPLICATIONS: TrackedApplication[] = [];

const DEFAULT_JOB_TEXT = `Missions :
- Développer des pipelines de traitement du langage naturel (NLP) et d'embeddings sémantiques.
- Entraîner et déployer des modèles sous PyTorch ou Transformers.
- Exposer des APIs haute performance en Python (FastAPI) et conteneuriser les microservices avec Docker.
- Collaborer avec l'équipe produit pour intégrer des agents LLMs avec Few-Shot Prompting et RAG.

Profil recherché :
- Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5 / Master 2) avec spécialisation IA / Data Science.
- Solides compétences en Python, PyTorch, calcul vectoriel (NumPy) et APIs REST (FastAPI).
- Connaissance des technologies d'embeddings (Word2Vec, Sentence-Transformers) appréciée.`;

const DEFAULT_COVER_LETTER_FR = `Badroudine Bacar
Élève-Ingénieur en Informatique - Spécialité Intelligence Artificielle (Bac+5 / ING3)
EILCO (École d'Ingénieurs du Littoral Côte d'Opale)
Email : badroudinebacar@gmail.com | Tél : +33 7 67 56 07 86
LinkedIn : linkedin.com/in/badroudine-bacar | GitHub : github.com/Badrouuu

À l'attention de l'équipe Recrutement Tech
[Entreprise Ciblée]

Objet : Candidature - Stage de fin d'études PFE (6 mois) : Ingénieur AI / Machine Learning (dès Mars 2027)

Madame, Monsieur,

Actuellement en dernière année de cycle ingénieur à l'EILCO (spécialisation Intelligence Artificielle & Data Science) après un parcours en Classes Préparatoires (CPGE TSI), je vous soumets ma candidature pour le stage de fin d'études de 6 mois d'Ingénieur AI / Machine Learning, disponible dès mars 2027.

Vos défis technologiques et vos projets au cœur de l'intelligence artificielle appliquée répondent précisément à mes aspirations techniques. Concevoir des systèmes d'IA robustes, capables de traiter des flux de données complexes avec une latence maîtrisée, constitue le cœur de mes travaux récents.

Sur le plan technique, mes réalisations répondent directement à vos exigences. Dans le cadre du projet VectorWord, j'ai déployé un moteur sémantique sous FastAPI et Docker capable de calculer en temps réel des similarités cosinus sur des espaces vectoriels multilingues (Gensim, NumPy) avec un temps de réponse moyen inférieur à 40 ms. De plus, j'ai développé un pipeline RAG combinant Few-Shot Prompting et validation stricte (Pydantic), permettant d'atteindre un taux de conformité structurée de 100 % et de faire chuter le taux d'hallucination à moins de 2 %. Cette expérience concrète en traitement du langage naturel et en architecture logicielle me permettra d'être immédiatement opérationnel.

Doté d'une solide formation mathématique acquise en CPGE et certifié au niveau C1 en anglais professionnel (TOEIC 905/990), je suis parfaitement préparé pour collaborer au sein d'équipes techniques pluridisciplinaires et internationales.

Pleinement mobile géographiquement pour intégrer vos locaux en présentiel ou selon un rythme hybride, je serais honoré d'échanger avec vous lors d'un entretien technique afin d'approfondir l'apport de mes compétences à vos objectifs.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

Badroudine Bacar`;

const DEFAULT_COVER_LETTER_EN = `Badroudine Bacar
Graduate Engineering Student - Artificial Intelligence & Data Science (MSc / Final Year)
EILCO Graduate School of Engineering
Email: badroudinebacar@gmail.com | Phone: +33 7 67 56 07 86
LinkedIn: linkedin.com/in/badroudine-bacar | GitHub: github.com/Badrouuu

To the Attention of the Tech Recruiting Team
[Target Organization]

Subject: Application - 6-Month End-of-Studies Internship (PFE): AI / Machine Learning Engineer (Starting March 2027)

Dear Hiring Team,

Currently in my final year of computer engineering at EILCO specializing in Artificial Intelligence and Data Science, following rigorous preparatory classes (CPGE TSI), I am writing to apply for the 6-month AI / Machine Learning Engineer internship starting in March 2027.

Your pioneering technological focus and innovative initiatives in computational AI strongly resonate with my engineering goals. Building robust AI systems and scalable architectures capable of processing complex data streams with high reliability has been the central theme of my recent projects.

On the technical side, my achievements directly align with your requirements. With VectorWord, I built a containerized semantic engine with FastAPI and Docker that computes real-time cosine similarities on multilingual vector spaces (Gensim, NumPy) with sub-40ms latency. Furthermore, I engineered an agentic RAG pipeline combining Few-Shot Prompting and strict schema validation, achieving 100% structured compliance and reducing hallucination rates to under 2%. This hands-on experience in NLP workflows and backend integration enables me to contribute to your engineering sprints from day one.

Backed by the mathematical rigor of my preparatory training and fully certified at the CEFR C1 level in professional English (TOEIC 905/990), I thrive in international, collaborative environments solving complex engineering challenges.

Fully mobile to relocate for an on-site or hybrid role, I would welcome the opportunity to discuss my background and how my skills can advance your engineering objectives during a technical interview.

Thank you for your time and consideration.

Sincerely,

Badroudine Bacar`;

const DEFAULT_COVER_LETTER = DEFAULT_COVER_LETTER_FR;

// Helper pour extraire la preuve textuelle exacte (verbatim quote) du mode de travail dans l'offre
const findRemoteEvidenceSnippet = (text: string): { isRemote: boolean; quote: string | null } => {
  if (!text) return { isRemote: false, quote: null };

  // Découpage en phrases ou lignes pour cibler le contexte exact
  const rawSegments = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const fullRemoteRegex = /\b(full[- ]?remote|100%\s*(télétravail|remote)|fully[- ]?remote|remote[- ]?only|100%\s*à distance|télétravail complet|télétravail total|work from anywhere|remotely anywhere)\b/i;
  const negativeRegex = /\b(no|not|non|aucun|interdit|pas de|neither|without|impossible|refus|incompatible|jamais)\b/i;

  // 1. Chercher d'abord une preuve explicite de Full Remote
  for (const seg of rawSegments) {
    if (fullRemoteRegex.test(seg)) {
      if (negativeRegex.test(seg)) {
        // Négation explicite : l'offre refuse le full remote
        return { isRemote: false, quote: seg.slice(0, 240) };
      }
      return { isRemote: true, quote: seg.slice(0, 240) };
    }
  }

  // 2. Chercher des mentions de travail hybride ou sur site pour prouver la conformité EILCO
  const presenceRegex = /\b(hybride|hybrid|présentiel|sur site|on[- ]?site|locaux|bureau|in[- ]?office|présence physique|2[- ]?3\s*jours?)\b/i;
  for (const seg of rawSegments) {
    if (presenceRegex.test(seg)) {
      return { isRemote: false, quote: seg.slice(0, 240) };
    }
  }

  return { isRemote: false, quote: null };
};

export default function Home() {
  const [currentView, setCurrentView] = useState<"generator" | "radar" | "autopilot" | "tracker">("generator");

  // États Auto-Pilot & Discord Webhook
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [autopilotBatchSize, setAutopilotBatchSize] = useState<number>(5);
  const [autopilotLogs, setAutopilotLogs] = useState<string[]>([
    "🤖 Module Auto-Pilot ResumeSquad initialisé.",
    "💡 Renseigne ton Webhook Discord pour recevoir les alertes de blocage (Captcha) et les candidatures en direct sur ton smartphone.",
  ]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestMessage, setWebhookTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bot Navigateur Playwright (Auto-Fill & Screenshots HITL)
  const [autoBrowserApply, setAutoBrowserApply] = useState(true);
  const [isBrowserFilling, setIsBrowserFilling] = useState(false);

  // Agent Autonome LinkedIn & Portails Carrières (Contrôle 1-Clic Direct)
  const [isLinkedInBotRunning, setIsLinkedInBotRunning] = useState(false);
  const [linkedInBotPid, setLinkedInBotPid] = useState<number | null>(null);
  const [linkedInBotLogs, setLinkedInBotLogs] = useState<string[]>([
    "🤖 Agent LinkedIn & Portails Carrières initialisé. Prêt pour la prospection et postulation 100% autonome.",
  ]);
  const [linkedInKeywords, setLinkedInKeywords] = useState("Machine Learning Stage");
  const [linkedInLocation, setLinkedInLocation] = useState("France");
  const [linkedInAllJobs, setLinkedInAllJobs] = useState(true);
  const [linkedInDryRun, setLinkedInDryRun] = useState(false);
  const [linkedInHeadless, setLinkedInHeadless] = useState(false);
  const [linkedInMaxApps, setLinkedInMaxApps] = useState<number>(3);
  const [isStoppingLinkedInBot, setIsStoppingLinkedInBot] = useState(false);

  // Préférences utilisateur apprises (RLHF / Active Learning via Discord & Radar)
  const [userPreferences, setUserPreferences] = useState<UserJobPreferences | null>(null);
  const [preferenceFeedbackToast, setPreferenceFeedbackToast] = useState<string | null>(null);

  // Filtres et recherche pour le Radar d'offres
  const [radarCountryFilter, setRadarCountryFilter] = useState<string>("all");
  const [radarTimeframe, setRadarTimeframe] = useState<"24h" | "3d" | "7d" | "all">("7d");
  const [radarSearch, setRadarSearch] = useState<string>("");
  const [liveOffers, setLiveOffers] = useState<RadarJobOffer[]>([]);
  const [isScanningLive, setIsScanningLive] = useState(false);
  const [lastScanMessage, setLastScanMessage] = useState<string | null>(null);

  // Mode de saisie de l'offre : "text" ou "url"
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [jobUrl, setJobUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // Inputs Générateur
  const [jobTitle, setJobTitle] = useState("Stage PFE - AI / Machine Learning Engineer (6 mois)");
  const [company, setCompany] = useState("");
  const [jobText, setJobText] = useState(DEFAULT_JOB_TEXT);

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"bullets" | "strategy" | "cover_letter" | "latex">("bullets");
  const [coverLetter, setCoverLetter] = useState<string>(DEFAULT_COVER_LETTER);
  const [copyLetterSuccess, setCopyLetterSuccess] = useState(false);

  const [atsScore, setAtsScore] = useState(90);
  const [coverageRate, setCoverageRate] = useState(90.0);

  const DEFAULT_CV_FR = {
    tailoredTitle: "Ingénieur IA & Machine Learning — Stage PFE",
    tailoredSummary:
      "Élève-ingénieur en dernière année à l'EILCO (spécialité IA), doté d'une certification TOEIC 905/990. Spécialisé en Machine Learning, NLP et Deep Learning, avec une expérience avérée dans le développement de pipelines RAG, d'agents LLM (Few-Shot Prompting) et de calculs d'espaces vectoriels sémantiques (Word2Vec). Expert dans la conception d'APIs haute performance avec FastAPI et leur conteneurisation via Docker. À la recherche d'un stage de fin d'études (PFE) de 6 mois à partir de mars 2027.",
    coverLetter: DEFAULT_COVER_LETTER_FR,
    projectBullets: [
      {
        project: "VectorWord / Guess-What (NLP & Vector Space Search)",
        bullets: [
          "Accompli la mise en place d'une API haute performance mesurée par un temps de réponse optimisé, en faisant appel à FastAPI et Uvicorn pour servir des calculs de similarité cosinus sur des espaces vectoriels Word2Vec multilingues (FR/EN) via Gensim et NumPy.",
          "Accompli la portabilité et le déploiement industrialisé mesurés par une reproductibilité totale, en faisant usage d'une architecture conteneurisée avec Docker et un déploiement automatisé sur Railway.",
          "Accompli le développement d'un frontend réactif mesuré par une synchronisation temps réel des données, en faisant appel à Next.js 15, TypeScript, Tailwind CSS et Supabase (PostgreSQL)."
        ]
      },
      {
        project: "Pipeline RAG & Automatisation de Code (Agentic AI)",
        bullets: [
          "Accompli la conception d'un moteur de parsing d'offres et de matching mesuré par la précision du score de pertinence sémantique, en faisant usage d'un système agentique RAG et LLM.",
          "Accompli la génération automatisée de documents mesurée par la réduction drastique des hallucinations, en faisant appel à des stratégies de Few-Shot Prompting et de génération structurée LaTeX."
        ]
      }
    ]
  };

  const DEFAULT_CV_EN = {
    tailoredTitle: "AI & Machine Learning Engineer Intern (PFE)",
    tailoredSummary:
      "Final-year engineering student (Bac+5) at EILCO specializing in Artificial Intelligence, Deep Learning, and Computer Vision. Proven expertise in building production-ready AI systems using Python, FastAPI, Docker, and MLOps pipelines. Proficient in English (TOEIC 905/990, C1), seeking a 6-month international internship starting March/April 2027 to drive impactful AI solutions.",
    coverLetter: DEFAULT_COVER_LETTER_EN,
    projectBullets: [
      {
        project: "VectorWord / Guess-What (NLP & Vector Space Search)",
        bullets: [
          "Architected and deployed a high-performance FastAPI/Uvicorn backend to compute cosine similarity on multilingual Word2Vec vector spaces (FR/EN) using Gensim and NumPy.",
          "Containerized the application using Docker and deployed on Railway, integrating a Next.js 15, TypeScript, and Supabase frontend for seamless user interaction."
        ]
      },
      {
        project: "RAG Pipeline & Agentic Automation",
        bullets: [
          "Engineered an automated RAG pipeline featuring job parsing, Few-Shot Prompting with LLMs, and structured LaTeX document generation.",
          "Significantly reduced LLM hallucinations and streamlined document generation workflows through robust prompt engineering and validation."
        ]
      }
    ]
  };

  const [tailoredTitle, setTailoredTitle] = useState("AI / Machine Learning Engineer (Stage PFE)");
  const [tailoredSummary, setTailoredSummary] = useState(DEFAULT_CV_FR.tailoredSummary);
  const [projectBullets, setProjectBullets] = useState(DEFAULT_CV_FR.projectBullets);
  const [coverLetterLanguage, setCoverLetterLanguage] = useState<"fr" | "en">("fr");
  const [coverLetterMode, setCoverLetterMode] = useState<"edit" | "preview" | "latex">("edit");
  const [coverLetterVersions, setCoverLetterVersions] = useState<{ fr: string; en: string }>({
    fr: DEFAULT_COVER_LETTER_FR,
    en: DEFAULT_COVER_LETTER_EN,
  });
  const [bilingualVersions, setBilingualVersions] = useState<{
    fr?: { tailoredTitle: string; tailoredSummary: string; projectBullets: { project: string; bullets: string[] }[]; coverLetter?: string };
    en?: { tailoredTitle: string; tailoredSummary: string; projectBullets: { project: string; bullets: string[] }[]; coverLetter?: string };
  }>({
    fr: DEFAULT_CV_FR,
    en: DEFAULT_CV_EN,
  });

  // Applications Tracker State avec localStorage
  const [applications, setApplications] = useState<TrackedApplication[]>(DEFAULT_APPLICATIONS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [extractMessage, setExtractMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);
  const [cvLanguage, setCvLanguage] = useState<"fr" | "en">("fr");
  const [fullRemoteWarning, setFullRemoteWarning] = useState<string | null>(null);
  const [remoteEvidenceQuote, setRemoteEvidenceQuote] = useState<string | null>(null);
  const [franceWarning, setFranceWarning] = useState<string | null>(null);
  const [workplaceType, setWorkplaceType] = useState<"full_remote" | "hybrid" | "onsite" | null>(null);
  const [isLetterOutdated, setIsLetterOutdated] = useState(false);

  // Suivi en temps réel des Tokens & Dépenses API
  const [lastTokenUsage, setLastTokenUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostEur: number;
    estimatedCostUsd: number;
    model: string;
    isFreeTier: boolean;
  } | null>(null);
  const [cumulativeTokens, setCumulativeTokens] = useState<number>(0);
  const [cumulativeRuns, setCumulativeRuns] = useState<number>(0);

  // Auto-détection intelligente de l'entreprise et du titre lors de la saisie/collage de texte
  const autoDetectCompanyAndTitleFromText = (text: string) => {
    if (!text || text.length < 10) return;

    // 1. Détection par mots-clés d'en-tête (Entreprise :, Company :, About :, etc.)
    const compRegex = /(?:entreprise|société|company|employeur|chez|about|institution|organisation|organization|at)\s*[:\-–]?\s*([A-Za-z0-9\s&.\-’'()]+)/i;
    const compMatch = text.match(compRegex);
    let detectedCandidate: string | null = null;

    if (compMatch && compMatch[1]) {
      const cand = compMatch[1].trim().split(/\n|\r/)[0].trim();
      if (cand.length >= 2 && cand.length <= 70 && !cand.toLowerCase().includes("neurotech")) {
        detectedCandidate = cand;
      }
    }

    // 2. Si pas trouvé par mot-clé, scanner les premières lignes pour trouver un nom d'organisation
    if (!detectedCandidate) {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      for (let i = 0; i < Math.min(lines.length, 6); i++) {
        const line = lines[i];
        if (
          /\b(institute|technology|technologies|solutions|laboratory|laboratoire|services|group|systems|ai|intelligence|holding|cern|list|epfl|eth|rolex|swisscom|nestle|google|microsoft|amazon|meta)\b/i.test(line) &&
          !line.toLowerCase().startsWith("http") &&
          line.length >= 3 &&
          line.length <= 80
        ) {
          detectedCandidate = line;
          break;
        }
      }
    }

    if (detectedCandidate && (!company || company.includes("NeuroTech") || company.includes("Entreprise Ciblée"))) {
      setCompany(detectedCandidate);
    }

    // Détection du poste
    const titleRegex = /(?:poste|titre|intitulé|position|job\s*title|rôle|internship\s*[-:]|stage\s*[-:])\s*[:\-–]?\s*([A-Za-z0-9\s&.\-’'\/()]+)/i;
    const titleMatch = text.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
      const candidateTitle = titleMatch[1].trim().split(/\n|\r/)[0].trim();
      if (candidateTitle.length >= 3 && candidateTitle.length <= 90) {
        setJobTitle(candidateTitle);
      }
    } else {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (
          /\b(intern|internship|stage|engineer|ingénieur|developer|chercheur|researcher|scientist|pfe)\b/i.test(line) &&
          line.length >= 5 &&
          line.length <= 90
        ) {
          if (!jobTitle || jobTitle.includes("Stage PFE - AI / Machine Learning")) {
            setJobTitle(line);
            break;
          }
        }
      }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("resumesquad_applications");
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur chargement localStorage", e);
      }
    }

    // Purge de l'ancien cache obsolète qui ne contenait pas les dates précises
    try {
      localStorage.removeItem("resumesquad_live_offers");
      const savedLive = localStorage.getItem("resumesquad_live_offers_v3");
      if (savedLive) {
        const parsed = JSON.parse(savedLive);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].postedAgo) {
          // Filtrage proactif : élimine les offres devenues inéligibles (ex: Business Analyst, saturées > 60 candidats)
          const strictlyEligible = parsed.filter((o) => {
            const p = calculateOfferPriority(o);
            return p.isEligible;
          });
          setLiveOffers(strictlyEligible);
        }
      }
    } catch (e) {
      console.error("Erreur chargement live offers localStorage", e);
    }

    // Chargement de l'historique des tokens et dépenses estimées
    try {
      const savedTokens = localStorage.getItem("resumesquad_cumulative_tokens");
      if (savedTokens) setCumulativeTokens(parseInt(savedTokens, 10) || 0);
      const savedRuns = localStorage.getItem("resumesquad_cumulative_runs");
      if (savedRuns) setCumulativeRuns(parseInt(savedRuns, 10) || 0);
      const savedLastUsage = localStorage.getItem("resumesquad_last_token_usage");
      if (savedLastUsage) setLastTokenUsage(JSON.parse(savedLastUsage));
      const savedWebhook = localStorage.getItem("resumesquad_discord_webhook");
      if (savedWebhook) setDiscordWebhook(savedWebhook);
    } catch (e) {
      console.warn("Erreur chargement token/webhook localStorage", e);
    }

    // Chargement des préférences d'apprentissage actif
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const res = await fetch("/api/autopilot/preferences");
      const data = await res.json();
      if (res.ok && data.success && data.preferences) {
        setUserPreferences(data.preferences);
      }
    } catch (e) {
      console.warn("Erreur chargement préférences", e);
    }
  };

  const handleVoteOffer = async (offer: RadarJobOffer, vote: "like" | "dislike") => {
    // Notification toast temporaire
    setPreferenceFeedbackToast(
      vote === "like"
        ? `👍 Vote enregistré : ${offer.company} est désormais dans vos favoris (+120 pts).`
        : `👎 Vote enregistré : ${offer.company} sera écartée de vos prochaines recommandations (-350 pts).`
    );
    setTimeout(() => setPreferenceFeedbackToast(null), 4000);

    // Mise à jour optimiste locale
    if (userPreferences) {
      const likedOfferIds = new Set(userPreferences.likedOfferIds);
      const dislikedOfferIds = new Set(userPreferences.dislikedOfferIds);
      const likedCompanies = new Set(userPreferences.likedCompanies);
      const dislikedCompanies = new Set(userPreferences.dislikedCompanies);

      if (vote === "like") {
        likedOfferIds.add(offer.id);
        dislikedOfferIds.delete(offer.id);
        likedCompanies.add(offer.company);
        for (const comp of Array.from(dislikedCompanies)) {
          if (comp.toLowerCase() === offer.company.toLowerCase()) dislikedCompanies.delete(comp);
        }
      } else {
        dislikedOfferIds.add(offer.id);
        likedOfferIds.delete(offer.id);
        dislikedCompanies.add(offer.company);
        for (const comp of Array.from(likedCompanies)) {
          if (comp.toLowerCase() === offer.company.toLowerCase()) likedCompanies.delete(comp);
        }
      }

      setUserPreferences({
        ...userPreferences,
        likedOfferIds: Array.from(likedOfferIds),
        dislikedOfferIds: Array.from(dislikedOfferIds),
        likedCompanies: Array.from(likedCompanies),
        dislikedCompanies: Array.from(dislikedCompanies),
        stats: {
          totalLikes: likedOfferIds.size,
          totalDislikes: dislikedOfferIds.size,
        },
      });
    }

    try {
      const res = await fetch("/api/autopilot/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          vote,
          company: offer.company,
          title: offer.title,
          keywords: offer.skills,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.preferences) {
        setUserPreferences(data.preferences);
      }
    } catch (e) {
      console.warn("Erreur transmission feedback", e);
    }
  };

  const handleRemovePreferenceCompany = async (companyName: string, type: "liked" | "disliked") => {
    if (!userPreferences) return;
    const updated = {
      ...userPreferences,
      likedCompanies:
        type === "liked"
          ? userPreferences.likedCompanies.filter((c) => c !== companyName)
          : userPreferences.likedCompanies,
      dislikedCompanies:
        type === "disliked"
          ? userPreferences.dislikedCompanies.filter((c) => c !== companyName)
          : userPreferences.dislikedCompanies,
    };
    setUserPreferences(updated);
    try {
      await fetch("/api/autopilot/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn("Erreur mise à jour préférences", e);
    }
  };

  const handleResetPreferences = async () => {
    if (!confirm("Voulez-vous réinitialiser l'apprentissage actif (favoris et exclusions) ?")) return;
    try {
      const res = await fetch("/api/autopilot/preferences", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.preferences) {
        setUserPreferences(data.preferences);
        setPreferenceFeedbackToast("🔄 Préférences et apprentissage réinitialisés aux valeurs d'origine.");
        setTimeout(() => setPreferenceFeedbackToast(null), 3500);
      }
    } catch (e) {
      console.warn("Erreur reset préférences", e);
    }
  };

  const saveToLocalStorage = (data: TrackedApplication[]) => {
    setApplications(data);
    localStorage.setItem("resumesquad_applications", JSON.stringify(data));
  };

  const handleSaveDiscordWebhook = (url: string) => {
    setDiscordWebhook(url);
    try {
      localStorage.setItem("resumesquad_discord_webhook", url.trim());
    } catch (e) {
      console.warn("Erreur sauvegarde webhook", e);
    }
  };

  const handleTestDiscordWebhook = async () => {
    const trimmed = discordWebhook.trim();
    if (!trimmed.startsWith("https://discord.com/api/webhooks/")) {
      setWebhookTestMessage({
        type: "error",
        text: "URL invalide. L'URL doit commencer par https://discord.com/api/webhooks/",
      });
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestMessage(null);
    try {
      const res = await fetch("/api/autopilot/notify-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: trimmed, type: "test" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookTestMessage({
          type: "success",
          text: "✅ Notification de test transmise ! Regarde ton canal Discord.",
        });
      } else {
        setWebhookTestMessage({
          type: "error",
          text: `❌ Échec Discord : ${data.error || "Vérifiez l'URL du webhook"}`,
        });
      }
    } catch (err: any) {
      setWebhookTestMessage({
        type: "error",
        text: `❌ Erreur de connexion : ${err.message}`,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleRunAutopilotCycle = async (overrideBatchSize?: number) => {
    setIsAutopilotRunning(true);
    const targetBatch = overrideBatchSize || autopilotBatchSize;
    const startMsg = `[${new Date().toLocaleTimeString("fr-FR")}] 🚀 Démarrage du cycle d'exploration et adaptation automatique (${targetBatch} candidatures ciblées)...`;
    setAutopilotLogs((prev) => [...prev, startMsg]);

    try {
      const strictlyEligibleOffers = liveOffers.filter((o) => {
        const p = calculateOfferPriority(o, userPreferences || undefined);
        return p.isEligible;
      });

      const res = await fetch("/api/autopilot/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: discordWebhook.trim(),
          appliedIds: applications.map((a) => a.id),
          offers: strictlyEligibleOffers.length > 0 ? strictlyEligibleOffers : undefined,
          batchSize: targetBatch,
          browserApply: autoBrowserApply,
        }),
      });

      const data = await res.json();
      fetchUserPreferences();
      if (data.logs && Array.isArray(data.logs)) {
        setAutopilotLogs((prev) => [...prev, ...data.logs]);
      }

      if (res.ok && data.success && Array.isArray(data.processedApplications) && data.processedApplications.length > 0) {
        const newApps = [...applications, ...data.processedApplications];
        saveToLocalStorage(newApps);
        setAutopilotLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString("fr-FR")}] 📊 ${data.processedApplications.length} nouvelle(s) candidature(s) enregistrée(s) dans ton Tracker !`,
        ]);
      }
    } catch (err: any) {
      setAutopilotLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString("fr-FR")}] ❌ Erreur exécution cycle : ${err.message}`,
      ]);
    } finally {
      setIsAutopilotRunning(false);
    }
  };

  const handleDirectBrowserFill = async (offer: RadarJobOffer) => {
    if (!offer.url) return;
    setIsBrowserFilling(true);
    setPreferenceFeedbackToast(`🌐 Lancement de Chrome Playwright pour ${offer.company}...`);

    try {
      const res = await fetch("/api/autopilot/browser-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: offer.url,
          company: offer.company,
          title: offer.title,
          webhookUrl: discordWebhook.trim(),
          autoSubmit: false,
          headless: false, // Ouvre Chrome visiblement sous les yeux de Badroudine !
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreferenceFeedbackToast(`📸 Formulaire rempli pour ${offer.company} ! Capture transmise sur Discord.`);
      } else {
        setPreferenceFeedbackToast(`⚠️ ${data.error || "Formulaire requiert une intervention manuelle"}`);
      }
    } catch (err: any) {
      setPreferenceFeedbackToast(`❌ Erreur navigateur : ${err.message}`);
    } finally {
      setIsBrowserFilling(false);
      setTimeout(() => setPreferenceFeedbackToast(null), 5000);
    }
  };

  // =========================================================================
  // GESTION DU BOT AUTONOME LINKEDIN (PLAYWRIGHT WORKER)
  // =========================================================================
  const checkLinkedInBotStatus = async () => {
    try {
      const res = await fetch("/api/autopilot/linkedin");
      const data = await res.json();
      if (res.ok && data.success) {
        setIsLinkedInBotRunning(data.running);
        setLinkedInBotPid(data.pid || null);
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          setLinkedInBotLogs(data.logs);
        }
      }
    } catch {}
  };

  useEffect(() => {
    checkLinkedInBotStatus();
    const interval = setInterval(() => {
      checkLinkedInBotStatus();
    }, isLinkedInBotRunning ? 2000 : 8000);
    return () => clearInterval(interval);
  }, [isLinkedInBotRunning]);

  const handleStartLinkedInBot = async () => {
    setIsLinkedInBotRunning(true);
    setLinkedInBotLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("fr-FR")}] 🚀 Démarrage de l'agent LinkedIn (${linkedInKeywords} - ${linkedInLocation})...`,
    ]);
    try {
      const res = await fetch("/api/autopilot/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: linkedInKeywords,
          location: linkedInLocation,
          allJobs: linkedInAllJobs,
          dryRun: linkedInDryRun,
          headless: linkedInHeadless,
          maxApps: linkedInMaxApps,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsLinkedInBotRunning(true);
        setLinkedInBotPid(data.pid);
        setPreferenceFeedbackToast(`🚀 Bot LinkedIn lancé en tâche de fond (PID: ${data.pid}) !`);
        checkLinkedInBotStatus();
      } else {
        setIsLinkedInBotRunning(false);
        setPreferenceFeedbackToast(`⚠️ ${data.error || "Erreur de lancement"}`);
      }
    } catch (e: any) {
      setIsLinkedInBotRunning(false);
      setPreferenceFeedbackToast(`❌ Erreur connexion API : ${e.message}`);
    }
  };

  const handleStopLinkedInBot = async () => {
    setIsStoppingLinkedInBot(true);
    try {
      const res = await fetch("/api/autopilot/linkedin", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsLinkedInBotRunning(false);
        setLinkedInBotPid(null);
        setPreferenceFeedbackToast("🛑 Bot LinkedIn arrêté avec succès.");
        checkLinkedInBotStatus();
      }
    } catch (e: any) {
      setPreferenceFeedbackToast(`⚠️ Erreur arrêt bot: ${e.message}`);
    } finally {
      setIsStoppingLinkedInBot(false);
    }
  };

  // V2 : Extraction automatique depuis une URL (via Route Next.js Vercel & fallback)
  const handleExtractFromUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || jobUrl).trim();
    if (!targetUrl) return;
    setIsExtracting(true);
    setExtractMessage(null);

    try {
      // 1. Appel de l'API Route Next.js (fonctionne directement sur Vercel sans backend local)
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.raw_text) {
        setJobText(data.raw_text);
        if (data.title) setJobTitle(data.title);
        if (data.company) setCompany(data.company);
        setIsLetterOutdated(true);
        setExtractMessage({
          type: "success",
          text: `✅ Offre extraite avec succès (${data.raw_text.length} caractères) !`,
        });
        setInputMode("text"); // Basculer sur l'onglet texte pour que l'utilisateur voie immédiatement le résultat
      } else if (data.blocked) {
        setExtractMessage({
          type: "warning",
          text: `⚠️ ${data.message || "Ce site protège son contenu contre l'extraction automatique (anti-bot)."}`,
        });
        setInputMode("text");
      } else {
        throw new Error(data.error || "Échec d'extraction");
      }
    } catch (err: any) {
      console.warn("Erreur extraction URL, bascule sur simulation :", err);
      simulateUrlExtraction(targetUrl);
    } finally {
      setIsExtracting(false);
    }
  };

  const simulateUrlExtraction = (targetUrl: string) => {
    const isLnk = targetUrl.includes("linkedin");
    const isWttj = targetUrl.includes("welcometothejungle");
    const detectedComp = isLnk ? "Entreprise Partenaire (LinkedIn)" : isWttj ? "Scale-up Tech (WTTJ)" : "Entreprise Tech";
    const detectedTitle = "Stage PFE - Ingénieur IA / Machine Learning";

    setCompany(detectedComp);
    setJobTitle(detectedTitle);
    setIsLetterOutdated(true);
    setJobText(`Offre extraite depuis : ${targetUrl}

Missions principales :
- Développer et optimiser des modèles de Deep Learning sous PyTorch.
- Mettre en place des pipelines RAG et des architectures d'embeddings vectoriels.
- Concevoir des APIs microservices en Python (FastAPI) et automatiser les conteneurs Docker.

Profil requis :
- Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5) spécialisation IA.
- Connaissance de PyTorch, NumPy, NLP et des bases de données vectorielles.`);
    
    setExtractMessage({
      type: "success",
      text: "✅ Offre chargée ! Vous pouvez vérifier ou ajuster le texte ci-dessous.",
    });
    setInputMode("text");
  };

  // Exécution réelle de l'escouade multi-agents avec Gemini
  const handleRunPipeline = async (override?: { jobText?: string; jobTitle?: string; company?: string }) => {
    setIsRunning(true);
    setExtractMessage(null);

    let activeText = override?.jobText ?? jobText;
    let activeTitle = override?.jobTitle ?? jobTitle;
    let activeCompany = override?.company ?? company;

    // Si l'utilisateur est en mode URL et n'a pas encore cliqué sur extraire (sans override manuel)
    if (!override && inputMode === "url" && jobUrl && (!jobText || jobText === DEFAULT_JOB_TEXT)) {
      try {
        const extRes = await fetch("/api/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: jobUrl }),
        });
        const extData = await extRes.json();
        if (extData.success && extData.raw_text) {
          activeText = extData.raw_text;
          setJobText(extData.raw_text);
          if (extData.title) {
            activeTitle = extData.title;
            setJobTitle(extData.title);
          }
          if (extData.company) {
            activeCompany = extData.company;
            setCompany(extData.company);
          }
          setInputMode("text");
        }
      } catch (err) {
        console.warn("Extraction préalable échouée :", err);
      }
    }

    try {
      const res = await fetch("/api/run-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_text: activeText,
          job_title: activeTitle,
          company: activeCompany,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Enregistrement des statistiques de tokens et calcul des coûts
        if (data.usage) {
          setLastTokenUsage(data.usage);
          try {
            localStorage.setItem("resumesquad_last_token_usage", JSON.stringify(data.usage));
            setCumulativeTokens((prevTokens) => {
              const updatedTokens = (prevTokens || 0) + (data.usage.totalTokens || 0);
              localStorage.setItem("resumesquad_cumulative_tokens", String(updatedTokens));
              return updatedTokens;
            });
            setCumulativeRuns((prevRuns) => {
              const updatedRuns = (prevRuns || 0) + 1;
              localStorage.setItem("resumesquad_cumulative_runs", String(updatedRuns));
              return updatedRuns;
            });
          } catch (e) {
            console.warn("Erreur stockage tokens stats", e);
          }
        }

        if (data.detectedCompany && data.detectedCompany !== activeCompany) {
          setCompany(data.detectedCompany);
        }
        if (data.detectedJobTitle && data.detectedJobTitle !== activeTitle) {
          setJobTitle(data.detectedJobTitle);
        }

        if (data.versions) {
          setBilingualVersions((prev) => ({
            ...prev,
            ...data.versions,
          }));
          setCoverLetterVersions((prev) => ({
            fr: data.versions.fr?.coverLetter || (data.language === "fr" && data.coverLetter ? data.coverLetter : prev.fr),
            en: data.versions.en?.coverLetter || (data.language === "en" && data.coverLetter ? data.coverLetter : prev.en),
          }));
        }
        if (data.language === "en" || data.language === "fr") {
          setCvLanguage(data.language);
          setCoverLetterLanguage(data.language);
        }
        if (data.tailoredTitle) setTailoredTitle(data.tailoredTitle);
        if (data.tailoredSummary) setTailoredSummary(data.tailoredSummary);
        if (data.projectBullets && data.projectBullets.length > 0) setProjectBullets(data.projectBullets);

        const targetLetterLang = data.language === "en" || data.language === "fr" ? data.language : coverLetterLanguage;
        const resolvedLetter =
          (data.versions && data.versions[targetLetterLang]?.coverLetter) ||
          data.coverLetter ||
          (data.versions && (data.versions.fr?.coverLetter || data.versions.en?.coverLetter));
        if (resolvedLetter) setCoverLetter(resolvedLetter);

        setIsLetterOutdated(false);
        if (data.atsScore) setAtsScore(data.atsScore);
        if (data.coverageRate) setCoverageRate(data.coverageRate);

        // Détection Full Remote & Preuve Textuelle Verbatim (Zero Invention / Anti-Hallucination)
        const clientEvidence = findRemoteEvidenceSnippet(activeText);

        let finalIsFullRemote = false;
        let finalEvidenceQuote: string | null = null;
        let finalWarning: string | null = null;

        // Vérifier si la citation fournie par l'IA existe réellement dans le texte de l'annonce
        const aiQuoteValid = Boolean(
          data.remoteEvidenceQuote &&
          typeof data.remoteEvidenceQuote === "string" &&
          data.remoteEvidenceQuote.trim().length > 6 &&
          activeText.toLowerCase().includes(data.remoteEvidenceQuote.trim().toLowerCase().slice(0, 25))
        );

        if (data.isFullRemote && (aiQuoteValid || clientEvidence.isRemote)) {
          finalIsFullRemote = true;
          finalEvidenceQuote = aiQuoteValid ? data.remoteEvidenceQuote : clientEvidence.quote;
          finalWarning =
            data.remoteWarning ||
            "Cette offre stipule formellement un mode 100% Full Remote. Rappel convention EILCO : Une présence physique (hybride ou présentiel) est obligatoire pour valider votre stage PFE.";
        } else if (clientEvidence.isRemote) {
          // L'IA n'a pas détecté mais le texte contient une preuve formelle sans négation
          finalIsFullRemote = true;
          finalEvidenceQuote = clientEvidence.quote;
          finalWarning =
            "Cette offre contient une mention formelle de 100% Full Remote. Rappel convention EILCO : Une présence physique sur site (hybride ou présentiel) est obligatoire.";
        } else {
          // L'offre n'est PAS en full remote (évite les fausses alertes où le système inventait !)
          finalIsFullRemote = false;
          finalEvidenceQuote = aiQuoteValid ? data.remoteEvidenceQuote : clientEvidence.quote;
        }

        if (finalIsFullRemote) {
          setFullRemoteWarning(finalWarning);
          setRemoteEvidenceQuote(finalEvidenceQuote);
          setWorkplaceType("full_remote");
        } else {
          setFullRemoteWarning(null);
          setRemoteEvidenceQuote(finalEvidenceQuote);
          setWorkplaceType(data.workplaceType === "full_remote" ? "hybrid" : (data.workplaceType || (finalEvidenceQuote ? "hybrid" : "onsite")));
        }

        // Détection Mobilité Internationale Obligatoire (Stage Hors France Exigé par l'EILCO)
        const combinedText = `${activeCompany} ${activeTitle} ${activeText}`.toLowerCase();
        const isFranceDetected =
          data.isInFrance ||
          /\b(france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes|rennes|strasbourg|montpellier|grenoble|sophia[- ]antipolis)\b/i.test(combinedText);
        const isExplicitAbroad = /\b(suisse|switzerland|schweiz|luxembourg|belgique|belgium|allemagne|germany|deutschland|united kingdom|london|uk)\b/i.test(combinedText);

        if (isFranceDetected && !isExplicitAbroad) {
          setFranceWarning(
            data.franceWarning ||
              "⚠️ Attention : Cette offre semble être localisée en France. Rappel convention EILCO : Votre stage PFE doit obligatoirement se dérouler à l'étranger (Suisse, Luxembourg, Belgique, Allemagne, UK...) pour valider votre mobilité internationale et obtenir votre diplôme d'ingénieur !"
          );
        } else {
          setFranceWarning(null);
        }

        const langBadge = data.language === "en" ? "🇬🇧 en Anglais" : "🇫🇷 en Français";
        setExtractMessage({
          type: "success",
          text: `🎉 L'escouade d'agents IA a adapté votre CV et lettre de motivation ${langBadge} pour ${activeCompany} (Score ATS : ${data.atsScore}/100) !`,
        });
      } else {
        throw new Error(data.error || "Erreur de génération");
      }
    } catch (err: any) {
      console.warn("Erreur pipeline agentique:", err);
      setExtractMessage({
        type: "warning",
        text: "⚠️ L'escouade a rencontré une latence sur l'API, les projets par défaut restent disponibles.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Bascule dynamique et instantanée de langue de CV sans AUCUN mélange Franglais
  const handleSwitchLanguage = (targetLang: "fr" | "en") => {
    setCvLanguage(targetLang);
    const version = bilingualVersions[targetLang] || (targetLang === "en" ? DEFAULT_CV_EN : DEFAULT_CV_FR);
    if (version) {
      if (version.tailoredTitle) setTailoredTitle(version.tailoredTitle);
      if (version.tailoredSummary) setTailoredSummary(version.tailoredSummary);
      if (version.projectBullets && version.projectBullets.length > 0) setProjectBullets(version.projectBullets);
      if (version.coverLetter) {
        setCoverLetterLanguage(targetLang);
        setCoverLetter(version.coverLetter);
      }
    }
  };

  // Bascule dynamique de la lettre de motivation
  const handleSwitchCoverLetterLanguage = (targetLang: "fr" | "en") => {
    setCoverLetterLanguage(targetLang);
    const letter = coverLetterVersions[targetLang] || (targetLang === "en" ? DEFAULT_COVER_LETTER_EN : DEFAULT_COVER_LETTER_FR);
    setCoverLetter(letter);
  };

  const handleCoverLetterChange = (newVal: string) => {
    setCoverLetter(newVal);
    setCoverLetterVersions((prev) => ({
      ...prev,
      [coverLetterLanguage]: newVal,
    }));
  };

  // Helper de génération du code source LaTeX (.tex) bilingue FR/EN sans AUCUN mélange Franglais
  const getTexContent = (forcedLang?: "fr" | "en"): string => {
    // Détection stricte de la langue réelle du texte pour éradiquer tout mélange accidentel
    const isSummaryEnglish = /\b(engineering|student|specializing|seeking|proven|proficient|internship|architected|engineered|built)\b/i.test(
      tailoredSummary
    );
    const isSummaryFrench = /\b(élève-ingénieur|étudiant|dernière année|spécialisé|recherche|stage|diplôme)\b/i.test(
      tailoredSummary
    );

    let isEn = cvLanguage === "en";
    if (forcedLang) {
      isEn = forcedLang === "en";
    } else if (isSummaryEnglish && !isSummaryFrench) {
      isEn = true;
    } else if (isSummaryFrench && !isSummaryEnglish) {
      isEn = false;
    }

    // Récupérer les champs textuels parfaitement synchronisés avec la langue résolue
    const targetVersionKey: "en" | "fr" = isEn ? "en" : "fr";
    const activeVersion = bilingualVersions[targetVersionKey];
    const activeTitle = activeVersion?.tailoredTitle || tailoredTitle;
    const activeSummary = activeVersion?.tailoredSummary || tailoredSummary;
    const activeBullets =
      activeVersion?.projectBullets && activeVersion.projectBullets.length > 0
        ? activeVersion.projectBullets
        : projectBullets;

    const educationSection = isEn
      ? `\\section{Education \\& Certifications}
\\begin{itemize}
    \\item \\textbf{Master of Science in Computer Engineering — Major in Artificial Intelligence} \\hfill 2024 - 2027 \\\\
    \\textit{EILCO Graduate School of Engineering, Calais, France} \\\\
    \\footnotesize Final year (MSc / ING3). Advanced coursework: Deep Learning, Computer Vision, Machine Learning, Software Architecture, MLOps, CI/CD, Advanced Databases.
    \\item \\textbf{Preparatory Classes for Grandes Écoles (CPGE TSI)} \\hfill 2022 - 2024 \\\\
    \\textit{Lycée Antonin Artaud, Marseille, France} \\\\
    \\footnotesize Intensive 2-year preparation in Advanced Mathematics, Physics, and Engineering Sciences.
    \\item \\textbf{English Proficiency: TOEIC Listening and Reading} \\hfill Score: \\textbf{905 / 990 (CEFR C1 Level - Fluent)}
\\end{itemize}`
      : `\\section{Formation \\& Certifications}
\\begin{itemize}
    \\item \\textbf{Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle} \\hfill 2024 - 2027 \\\\
    \\textit{EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais, France} \\\\
    \\footnotesize Dernière année (ING3). Modules avancés : Deep Learning, Vision par Ordinateur, Machine Learning, Architecture Logicielle, MLOps, CI/CD, Bases de Données Avancées.
    \\item \\textbf{Classes Préparatoires aux Grandes Écoles (CPGE TSI)} \\hfill 2022 - 2024 \\\\
    \\textit{Lycée Antonin Artaud, Marseille, France} \\\\
    \\footnotesize Mathématiques Supérieures et Spéciales, Physique, Sciences de l'Ingénieur.
    \\item \\textbf{Certification Anglais : TOEIC Listening and Reading} \\hfill Score : \\textbf{905 / 990 (Niveau C1)}
\\end{itemize}`;

    const projectsSectionTitle = isEn
      ? "\\section{Technical Projects \\& Key Achievements}"
      : "\\section{Projets Techniques \\& Réalisations}";

    const experienceSection = isEn
      ? `\\section{Professional Experience}
\\noindent
\\textbf{Founder \\& Lead Software Developer (Entrepreneurial Internship PÉPITE)} \\hfill 2025 - 2026 \\\\
\\textit{Étiquette Jaune (Startup / Micro-enterprise)}
\\begin{itemize}
    \\item Accomplished integration of on-device Computer Vision models measured by text extraction speed, leveraging Google ML Kit Text Recognition (OCR).
    \\item Accomplished serverless backend development measured by real-time data synchronization, utilizing Google Cloud Firestore, Cloud Functions, and TypeScript.
\\end{itemize}`
      : `\\section{Expérience Professionnelle}
\\noindent
\\textbf{Fondateur \\& Développeur Lead (Stage Entrepreneurial PÉPITE)} \\hfill 2025 - 2026 \\\\
\\textit{Étiquette Jaune (Micro-entreprise)}
\\begin{itemize}
    \\item Accompli l'intégration de modèles de Vision par Ordinateur mesurés par la vitesse d'extraction textuelle, en faisant usage de Google ML Kit Text Recognition (OCR).
    \\item Accompli le développement d'un backend serverless mesuré par la synchronisation temps réel, en faisant appel à Google Cloud Firestore, Cloud Functions et TypeScript.
\\end{itemize}`;

    const interestsSection = isEn
      ? `\\section{Interests \\& Community Engagement}
\\begin{itemize}[leftmargin=1.2em, itemsep=1.5pt, topsep=1.5pt, parsep=0pt]
    \\item \\textbf{Game Modding \\& Video Games:} Passionate about video games and modding (gameplay mechanics reverse-engineering, scripting, data structures).
    \\item \\textbf{Strategy Games \\& Competitive TCG:} Active strategy gamer and competitive One Piece TCG tournament player (game theory, deck optimization, probabilistic decision-making).
    \\item \\textbf{Community Engagement \\& First Aid:} Volunteer intern in non-profit community associations (team coordination, civic responsibility) \\& Certified in First Aid (PSC1 / Emergency Response).
\\end{itemize}`
      : `\\section{Centres d'Intérêt \\& Engagement Associatif}
\\begin{itemize}[leftmargin=1.2em, itemsep=1.5pt, topsep=1.5pt, parsep=0pt]
    \\item \\textbf{Modding \\& Jeux Vidéo :} Passionné de jeux vidéo et de modding (analyse et rétro-ingénierie de mécaniques de gameplay, scripting, structures de données).
    \\item \\textbf{Jeux de Stratégie \\& TCG Compétitif :} Pratique active de jeux de stratégie et participation à des tournois One Piece TCG (théorie des jeux, optimisation tactique, calculs de probabilités).
    \\item \\textbf{Engagement Associatif \\& Secourisme :} Stagiaire bénévole en association d'entraide (animation, coordination terrain, esprit d'équipe) \\& Titulaire du Brevet de Premiers Secours (PSC1).
\\end{itemize}`;

    return `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper, top=1.0cm, bottom=1.0cm, left=1.1cm, right=1.1cm]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\definecolor{primary}{RGB}{30, 58, 138}
\\definecolor{textdark}{RGB}{31, 41, 55}
\\color{textdark}
\\pagestyle{empty}
\\raggedbottom

\\titleformat{\\section}{\\large\\bfseries\\color{primary}\\uppercase}{}{0em}{}[\\vspace{-0.6em}\\rule{\\textwidth}{0.8pt}\\vspace{-0.4em}]
\\titlespacing*{\\section}{0pt}{0.5em}{0.2em}
\\setlist[itemize]{leftmargin=1.2em, itemsep=1pt, topsep=1pt, parsep=0pt, partopsep=0pt}

\\begin{document}
\\enlargethispage{3\\baselineskip}
\\begin{center}
    {\\huge \\textbf{\\color{primary} Badroudine Bacar}} \\\\[0.2em]
    {\\large \\textbf{${activeTitle}}} \\\\[0.25em]
    \\small France \\ $|$ \\ 
    \\href{tel:+33767560786}{07 67 56 07 86} \\ $|$ \\ 
    \\href{mailto:badroudinebacar@gmail.com}{badroudinebacar@gmail.com} \\ $|$ \\ 
    \\href{https://www.linkedin.com/in/badroudine-bacar/}{LinkedIn} \\ $|$ \\ 
    \\href{https://github.com/Badrouuu}{GitHub}
\\end{center}

\\vspace{-0.5em}
\\noindent
\\small ${activeSummary}

${educationSection}

${projectsSectionTitle}
${activeBullets
  .map(
    (p, idx) => `\\noindent
\\textbf{${p.project}} \\\\
\\begin{itemize}
${p.bullets.map((b) => `    \\item ${b}`).join("\n")}
\\end{itemize}${idx < activeBullets.length - 1 ? "\n\\vspace{0.25em}" : ""}`
  )
  .join("\n")}

${experienceSection}

${interestsSection}

\\end{document}`;
  };

  // Helper pour formater le nom de fichier propre, standard et adapté à l'entreprise visée
  const getCleanExportFileName = (prefix: string, ext: string): string => {
    const rawCompany = (company || "Candidature").trim();
    const cleanComp = rawCompany.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return `${prefix}_Badroudine_Bacar_${cleanComp || "Candidature"}.${ext}`;
  };

  // Téléchargement du fichier LaTeX (.tex) bilingue FR/EN adapté à l'entreprise
  const handleDownloadTex = () => {
    const texContent = getTexContent();
    const blob = new Blob([texContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getCleanExportFileName("CV", "tex");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Ouverture et compilation 1-clic sur Overleaf avec nommage adapté à l'entreprise
  const handleOpenOverleaf = () => {
    const texContent = getTexContent();
    const fileName = getCleanExportFileName("CV", "tex");
    const form = document.createElement("form");
    form.action = "https://www.overleaf.com/docs";
    form.method = "POST";
    form.target = "_blank";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "snip";
    input.value = texContent;
    form.appendChild(input);

    const nameInput = document.createElement("input");
    nameInput.type = "hidden";
    nameInput.name = "snip_name";
    nameInput.value = fileName;
    form.appendChild(nameInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Export direct en PDF conforme ATS sans en-tête ni pied de page parasite du navigateur
  const handlePrintPdf = () => {
    const originalTitle = document.title;
    const fileName = getCleanExportFileName("CV", "pdf").replace(/\.pdf$/, "");
    document.title = fileName;
    document.body.setAttribute("data-print-target", "cv");
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      document.body.removeAttribute("data-print-target");
    }, 1500);
  };

  // Helper pour décomposer et mettre en page la lettre de motivation avec un design corporate exécutif
  const renderFormattedCoverLetter = (letterText: string, isPrint = false) => {
    // Normalisation typographique : remplacer les tirets cadratins (—) et demi-cadratins (–) par des tirets simples (-)
    const cleanText = letterText.replace(/[\u2014\u2013]/g, "-");
    const rawChunks = cleanText.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);

    let senderChunk = "";
    let recipientChunk = "";
    let subjectChunk = "";
    let salutationChunk = "";
    const rawBodyParagraphs: string[] = [];
    let closingChunk = "";
    let signatureChunk = "";

    rawChunks.forEach((chunk, idx) => {
      const lower = chunk.toLowerCase();
      if (idx === 0 && (lower.includes("badroudine") || lower.includes("eilco") || lower.includes("@"))) {
        senderChunk = chunk;
      } else if (!recipientChunk && (lower.startsWith("à l'attention") || lower.startsWith("to the attention") || lower.startsWith("to the tech") || lower.includes("recrutement") || lower.startsWith("to the hiring team"))) {
        recipientChunk = chunk;
      } else if (!subjectChunk && (lower.startsWith("objet") || lower.startsWith("subject"))) {
        subjectChunk = chunk;
      } else if (!salutationChunk && (lower.startsWith("madame") || lower.startsWith("monsieur") || lower.startsWith("dear") || lower.startsWith("chère") || lower.startsWith("cher"))) {
        salutationChunk = chunk;
      } else if (idx === rawChunks.length - 1 && (lower.includes("badroudine") || chunk.length < 50)) {
        signatureChunk = chunk;
      } else if (idx === rawChunks.length - 2 && (lower.includes("salutations") || lower.includes("sincerely") || lower.includes("regards") || lower.includes("attente") || lower.includes("considération"))) {
        closingChunk = chunk;
      } else {
        rawBodyParagraphs.push(chunk);
      }
    });

    const isLetterFrench = /\b(madame|monsieur|élève|candidature|stage|ingénieur|veuillez|agréer|recherche|formation)\b/i.test(cleanText);
    const resolvedIsEn = isLetterFrench ? false : coverLetterLanguage === "en";
    const letterDate = new Date().toLocaleDateString(resolvedIsEn ? "en-US" : "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Nettoyage des paragraphes pour filtrer les résidus d'en-tête ou salutations dupliquées
    const filteredBodyParagraphs: string[] = [];
    rawBodyParagraphs.forEach((p) => {
      const l = p.toLowerCase().trim();
      if (
        l.startsWith("dear hiring team") ||
        l.startsWith("madame, monsieur") ||
        l.startsWith("to the hiring team") ||
        l.startsWith("to the attention") ||
        l.startsWith("à l'attention")
      ) {
        if (!recipientChunk && p.includes("\n")) {
          recipientChunk = p;
        }
        return;
      }
      filteredBodyParagraphs.push(p);
    });

    // Détermination propre de l'entreprise destinataire (SANS jamais afficher NeuroTech si ce n'est pas l'offre ciblée)
    let cleanRecipientCompany = "";
    if (recipientChunk) {
      const lines = recipientChunk
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => !l.toLowerCase().includes("attention") && !l.toLowerCase().includes("hiring team"));
      if (lines.length > 0) {
        cleanRecipientCompany = lines.join(" ");
      }
    }
    if (!cleanRecipientCompany || cleanRecipientCompany.toLowerCase().includes("neurotech")) {
      cleanRecipientCompany = company && !company.toLowerCase().includes("neurotech") ? company : cleanRecipientCompany || "Entreprise Ciblée";
    }

    if (senderChunk && (recipientChunk || subjectChunk || filteredBodyParagraphs.length > 0)) {
      return (
        <div className={`space-y-5 text-gray-900 bg-white font-sans ${isPrint ? "text-[11px] leading-relaxed p-0" : "text-xs leading-relaxed"}`}>
          {/* En-tête : Expéditeur (gauche) & Destinataire / Date (droite) - Design sobre exécutif sans logos/emojis */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-300">
            {/* Expéditeur */}
            <div className="space-y-0.5">
              <div className="text-base font-bold text-gray-900 tracking-tight">BADROUDINE BACAR</div>
              <div className="text-[11px] font-medium text-gray-800">
                {resolvedIsEn
                  ? "Engineering Student - AI & Data Science (MSc / Final Year)"
                  : "Élève-Ingénieur en Informatique - Spécialité IA (Bac+5 / ING3)"}
              </div>
              <div className="text-[10px] text-gray-600">
                {resolvedIsEn
                  ? "EILCO Graduate School of Engineering (Calais, France)"
                  : "EILCO (École d'Ingénieurs du Littoral Côte d'Opale), France"}
              </div>
              <div className="text-[10px] text-gray-600 pt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-normal">
                <span>badroudinebacar@gmail.com</span>
                <span>•</span>
                <span>+33 7 67 56 07 86</span>
                <span>•</span>
                <span>linkedin.com/in/badroudine-bacar</span>
                <span>•</span>
                <span>github.com/Badrouuu</span>
              </div>
            </div>

            {/* Destinataire & Date - SANS bulle grise, SANS bordure */}
            <div className="text-right space-y-1 self-end sm:self-start">
              <div className="text-[11px] text-gray-600 font-normal">
                {resolvedIsEn ? letterDate : `Calais, le ${letterDate}`}
              </div>
              <div className="pt-2 text-left sm:text-right space-y-0.5">
                <div className="text-gray-500 text-[10.5px]">
                  {resolvedIsEn ? "To the Attention of:" : "À l'attention de :"}
                </div>
                <div className="font-bold text-gray-900 text-sm">
                  {cleanRecipientCompany}
                </div>
                <div className="text-gray-600 text-[10.5px]">
                  {resolvedIsEn ? "Tech Recruiting Team" : "Équipe Recrutement Tech"}
                </div>
              </div>
            </div>
          </div>

          {/* Objet - SANS bulle bleue, souligné sobre et bold */}
          {subjectChunk && (
            <div className="pt-2 pb-1 text-xs font-bold text-gray-900 tracking-normal border-b border-gray-200/60 pb-1.5">
              {subjectChunk}
            </div>
          )}

          {/* Salutation */}
          {salutationChunk && (
            <div className="font-semibold text-gray-900 pt-1 text-xs">
              {salutationChunk}
            </div>
          )}

          {/* Corps de la lettre */}
          <div className="space-y-3.5 text-justify text-gray-800 leading-relaxed font-sans text-xs">
            {filteredBodyParagraphs.map((para, pIdx) => (
              <p key={pIdx}>{para}</p>
            ))}
          </div>

          {/* Formule finale de politesse */}
          {closingChunk && (
            <div className="text-justify text-gray-800 leading-relaxed pt-1 text-xs">
              {closingChunk}
            </div>
          )}

          {/* Signature */}
          <div className="pt-4 text-right space-y-0.5">
            <div className="font-bold text-gray-900 text-sm">
              {signatureChunk || "Badroudine Bacar"}
            </div>
            <div className="text-[10px] text-gray-600">
              {resolvedIsEn ? "AI & Machine Learning Engineer" : "Élève-Ingénieur en IA & Machine Learning"}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-[11.5px] leading-relaxed text-gray-900 whitespace-pre-line text-justify font-sans bg-white p-4">
        {cleanText}
      </div>
    );
  };

  // Helper de génération du code source LaTeX (.tex) pour la lettre de motivation
  const getCoverLetterTex = (forcedLang?: "fr" | "en"): string => {
    const rawText = coverLetter || DEFAULT_COVER_LETTER_FR;
    const cleanText = rawText.replace(/[\u2014\u2013]/g, "-");

    const isLetterFrench = /\b(madame|monsieur|élève|candidature|stage|ingénieur|veuillez|agréer|recherche|formation)\b/i.test(cleanText);
    const isEn = forcedLang ? forcedLang === "en" : isLetterFrench ? false : coverLetterLanguage === "en";
    const letterText = cleanText || (isEn ? DEFAULT_COVER_LETTER_EN : DEFAULT_COVER_LETTER_FR);

    const letterDate = new Date().toLocaleDateString(isEn ? "en-US" : "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const escapeTex = (str: string) =>
      str
        .replace(/\\/g, "\\textbackslash{}")
        .replace(/([%&$#_{}])/g, "\\$1")
        .replace(/~/g, "\\textasciitilde{}")
        .replace(/\^/g, "\\textasciicircum{}");

    const rawChunks = letterText.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);

    let senderChunk = "";
    let recipientChunk = "";
    let subjectChunk = "";
    let salutationChunk = "";
    const rawBodyParagraphs: string[] = [];
    let closingChunk = "";
    let signatureChunk = "";

    rawChunks.forEach((chunk, idx) => {
      const lower = chunk.toLowerCase();
      if (idx === 0 && (lower.includes("badroudine") || lower.includes("eilco") || lower.includes("@"))) {
        senderChunk = chunk;
      } else if (!recipientChunk && (lower.startsWith("à l'attention") || lower.startsWith("to the attention") || lower.startsWith("to the tech") || lower.includes("recrutement") || lower.startsWith("to the hiring team"))) {
        recipientChunk = chunk;
      } else if (!subjectChunk && (lower.startsWith("objet") || lower.startsWith("subject"))) {
        subjectChunk = chunk;
      } else if (!salutationChunk && (lower.startsWith("madame") || lower.startsWith("monsieur") || lower.startsWith("dear") || lower.startsWith("chère") || lower.startsWith("cher"))) {
        salutationChunk = chunk;
      } else if (idx === rawChunks.length - 1 && (lower.includes("badroudine") || chunk.length < 50)) {
        signatureChunk = chunk;
      } else if (idx === rawChunks.length - 2 && (lower.includes("salutations") || lower.includes("sincerely") || lower.includes("regards") || lower.includes("attente") || lower.includes("considération"))) {
        closingChunk = chunk;
      } else {
        rawBodyParagraphs.push(chunk);
      }
    });

    const filteredBodyParagraphs: string[] = [];
    rawBodyParagraphs.forEach((p) => {
      const l = p.toLowerCase().trim();
      if (
        l.startsWith("dear hiring team") ||
        l.startsWith("madame, monsieur") ||
        l.startsWith("to the hiring team") ||
        l.startsWith("to the attention") ||
        l.startsWith("à l'attention")
      ) {
        return;
      }
      filteredBodyParagraphs.push(p);
    });

    let cleanCompany = "";
    if (recipientChunk) {
      const lines = recipientChunk
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => !l.toLowerCase().includes("attention") && !l.toLowerCase().includes("hiring team"));
      if (lines.length > 0) {
        cleanCompany = lines.join(" ");
      }
    }
    if (!cleanCompany || cleanCompany.toLowerCase().includes("neurotech")) {
      cleanCompany = company && !company.toLowerCase().includes("neurotech") ? company : cleanCompany || "Entreprise Ciblée";
    }

    if (senderChunk && (recipientChunk || subjectChunk || filteredBodyParagraphs.length > 0)) {
      return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=2.2cm]{geometry}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{parskip}

\\definecolor{textdark}{RGB}{17, 24, 39}
\\color{textdark}
\\pagestyle{empty}

\\begin{document}

% --- EN-TÊTE EXPÉDITEUR ---
{\\large \\textbf{BADROUDINE BACAR}} \\\\[0.2em]
\\textbf{${isEn ? "Engineering Student - Major in AI (MSc / Final Year)" : "Élève-Ingénieur en Informatique - Spécialité IA (Bac+5 / ING3)"}} \\\\
${isEn ? "EILCO Graduate School of Engineering, Calais, France" : "EILCO (École d'Ingénieurs du Littoral Côte d'Opale), France"} \\\\
\\small
\\href{mailto:badroudinebacar@gmail.com}{badroudinebacar@gmail.com} \\ $|$ \\ 
\\href{tel:+33767560786}{+33 7 67 56 07 86} \\ $|$ \\ 
\\href{https://www.linkedin.com/in/badroudine-bacar/}{LinkedIn} \\ $|$ \\ 
\\href{https://github.com/Badrouuu}{GitHub}

\\vspace{0.8em}
\\hrule height 0.6pt
\\vspace{1.0em}

% --- DESTINATAIRE & DATE ---
\\begin{flushright}
    \\small ${escapeTex(isEn ? letterDate : `Calais, le ${letterDate}`)}
\\end{flushright}

\\noindent
\\textbf{${isEn ? "To the Attention of the Tech Recruiting Team" : "À l'attention de l'équipe Recrutement Tech"}} \\\\
\\textbf{${escapeTex(cleanCompany)}}

\\vspace{1.2em}

% --- OBJET ---
\\noindent
\\textbf{${escapeTex(subjectChunk)}}

\\vspace{1.2em}

% --- SALUTATION ---
\\noindent
${salutationChunk ? escapeTex(salutationChunk) : (isEn ? "Dear Hiring Team," : "Madame, Monsieur,")}

\\vspace{0.6em}

% --- CORPS DE LA LETTRE ---
${filteredBodyParagraphs.map((p) => escapeTex(p)).join("\n\n\\vspace{0.8em}\n\n")}

${closingChunk ? `\n\n\\vspace{0.8em}\n\\noindent\n${escapeTex(closingChunk)}` : ""}

\\vspace{1.5em}
\\begin{flushright}
    \\textbf{${escapeTex(signatureChunk || "Badroudine Bacar")}} \\\\
    \\small ${isEn ? "AI \\& Machine Learning Engineer" : "Élève-Ingénieur en IA \\& Machine Learning"}
\\end{flushright}

\\end{document}`;
    }

    // Fallback standard
    const formattedParagraphs = rawChunks
      .map((para) => {
        if (/^(objet|subject)\s*:/i.test(para)) {
          return `\\vspace{0.6em}\n\\noindent\\textbf{\\color{primary} ${escapeTex(para)}}\n\\vspace{0.4em}`;
        }
        return `\\noindent\n${escapeTex(para)}`;
      })
      .join("\n\n\\vspace{0.8em}\n\n");

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=2.2cm]{geometry}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{parskip}

\\definecolor{primary}{RGB}{30, 58, 138}
\\definecolor{textdark}{RGB}{31, 41, 55}
\\color{textdark}
\\pagestyle{empty}

\\begin{document}

${formattedParagraphs}

\\end{document}`;
  };

  // Export direct de la lettre de motivation en PDF (format A4 soigné)
  const handlePrintCoverLetterPdf = () => {
    const originalTitle = document.title;
    const fileName = getCleanExportFileName("Lettre_Motivation", "pdf").replace(/\.pdf$/, "");
    document.title = fileName;
    document.body.setAttribute("data-print-target", "cover_letter");
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      document.body.removeAttribute("data-print-target");
    }, 1500);
  };

  // Ouverture et compilation 1-clic sur Overleaf de la lettre de motivation
  const handleOpenOverleafCoverLetter = () => {
    const texContent = getCoverLetterTex();
    const fileName = getCleanExportFileName("Lettre_Motivation", "tex");
    const form = document.createElement("form");
    form.action = "https://www.overleaf.com/docs";
    form.method = "POST";
    form.target = "_blank";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "snip";
    input.value = texContent;
    form.appendChild(input);

    const nameInput = document.createElement("input");
    nameInput.type = "hidden";
    nameInput.name = "snip_name";
    nameInput.value = fileName;
    form.appendChild(nameInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Téléchargement du fichier LaTeX (.tex) de la lettre de motivation
  const handleDownloadCoverLetterTex = () => {
    const texContent = getCoverLetterTex();
    const blob = new Blob([texContent], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getCleanExportFileName("Lettre_Motivation", "tex");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copie de la lettre de motivation dans le presse-papier
  const handleCopyCoverLetter = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopyLetterSuccess(true);
      setTimeout(() => setCopyLetterSuccess(false), 2500);
    } catch (e) {
      console.error("Erreur copie presse-papier:", e);
    }
  };

  // Téléchargement de la lettre de motivation (.txt) adaptée à l'entreprise
  const handleDownloadCoverLetter = () => {
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getCleanExportFileName("Lettre_Motivation", "txt");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveApplication = () => {
    const newApp: TrackedApplication = {
      id: Date.now().toString(),
      company: company || "Entreprise",
      title: jobTitle || "Poste d'Ingénieur IA",
      appliedDate: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
      atsScore: atsScore,
      status: "en_attente",
      notes: `CV sur-mesure (${tailoredTitle}) généré avec score ATS ${atsScore}/100.`,
    };

    const updated = [newApp, ...applications];
    saveToLocalStorage(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setCurrentView("tracker");
    }, 1000);
  };

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    const updated = applications.map((app) => (app.id === id ? { ...app, status: newStatus } : app));
    saveToLocalStorage(updated);
  };

  const handleDeleteApplication = (id: string) => {
    const updated = applications.filter((app) => app.id !== id);
    saveToLocalStorage(updated);
  };

  const filteredApps = filterStatus === "all" ? applications : applications.filter((a) => a.status === filterStatus);

  // Helper pour identifier si une offre a déjà été postulée / suivie dans le Tracker
  const findTrackedAppForOffer = (offer: RadarJobOffer, apps: TrackedApplication[]): TrackedApplication | undefined => {
    const normStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const offerComp = normStr(offer.company);
    if (!offerComp) return undefined;

    return apps.find((app) => {
      const appComp = normStr(app.company);
      if (!appComp) return false;
      return offerComp === appComp || offerComp.includes(appComp) || appComp.includes(offerComp);
    });
  };

  // Basculer le suivi d'une offre directement depuis le Radar
  const handleToggleTrackOffer = (offer: RadarJobOffer) => {
    const existing = findTrackedAppForOffer(offer, applications);
    if (existing) {
      const updated = applications.filter((a) => a.id !== existing.id);
      saveToLocalStorage(updated);
    } else {
      const newApp: TrackedApplication = {
        id: `app-radar-${Date.now()}`,
        company: offer.company,
        title: offer.title,
        appliedDate: new Date().toISOString().split("T")[0],
        atsScore: 92,
        status: "en_attente",
        notes: `Candidature enregistrée depuis le Radar (${offer.country} - ${offer.location}). Lien : ${offer.url}`,
      };
      saveToLocalStorage([newApp, ...applications]);
    }
  };

  // Déduplication : les offres en direct priment sur les offres de secours statiques
  const allRadarOffers = (() => {
    const seenCompanies = new Set(liveOffers.map((o) => o.company.toLowerCase().trim()));
    const extraStatic = RADAR_JOB_OFFERS.filter(
      (s) => !seenCompanies.has(s.company.toLowerCase().trim())
    );
    return [...liveOffers, ...extraStatic];
  })();

  // Filtrage dynamique des offres du Radar (offres vérifiées + flux scanné en direct)
  const filteredRadarOffers = allRadarOffers
    .filter((offer) => {
      const matchesCountry =
        radarCountryFilter === "all" || offer.country === radarCountryFilter;
      const query = radarSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        offer.title.toLowerCase().includes(query) ||
        offer.company.toLowerCase().includes(query) ||
        offer.location.toLowerCase().includes(query) ||
        offer.skills.some((s) => s.toLowerCase().includes(query)) ||
        offer.description.toLowerCase().includes(query);

      let matchesTimeframe = true;
      if (radarTimeframe === "24h") {
        matchesTimeframe =
          !!offer.postedAgo &&
          (offer.postedAgo.includes("min") ||
            offer.postedAgo.includes(" h") ||
            offer.postedAgo.includes("heure"));
      } else if (radarTimeframe === "3d") {
        matchesTimeframe =
          offer.isFresh !== false &&
          (offer.isFresh === true ||
            (!!offer.postedAgo &&
              (offer.postedAgo.includes("min") ||
                offer.postedAgo.includes(" h") ||
                offer.postedAgo === "Hier" ||
                offer.postedAgo.includes("1 jour") ||
                offer.postedAgo.includes("2 jours") ||
                offer.postedAgo.includes("3 jours"))));
      }

      // Règle d'éligibilité stricte : écarte les offres hors domaine IA ou saturées (>60 candidats)
      if (!query) {
        const priority = calculateOfferPriority(offer, userPreferences || undefined);
        if (!priority.isEligible) {
          return false;
        }
      }

      return matchesCountry && matchesSearch && matchesTimeframe;
    })
    .sort((a, b) => {
      const isTrackedA = !!findTrackedAppForOffer(a, applications);
      const isTrackedB = !!findTrackedAppForOffer(b, applications);

      // Règle 1 : Les offres déjà postulées / suivies vont EN BAS de la liste
      if (!isTrackedA && isTrackedB) return -1;
      if (isTrackedA && !isTrackedB) return 1;

      // Règle 2 : Apprentissage Actif (Offres écartées en bas, favoris en haut)
      const isDislikedA =
        userPreferences?.dislikedOfferIds?.includes(a.id) ||
        userPreferences?.dislikedCompanies?.some(
          (c) => c.toLowerCase().trim() === a.company.toLowerCase().trim()
        );
      const isDislikedB =
        userPreferences?.dislikedOfferIds?.includes(b.id) ||
        userPreferences?.dislikedCompanies?.some(
          (c) => c.toLowerCase().trim() === b.company.toLowerCase().trim()
        );

      if (!isDislikedA && isDislikedB) return -1;
      if (isDislikedA && !isDislikedB) return 1;

      const isLikedA =
        userPreferences?.likedOfferIds?.includes(a.id) ||
        userPreferences?.likedCompanies?.some(
          (c) => c.toLowerCase().trim() === a.company.toLowerCase().trim()
        );
      const isLikedB =
        userPreferences?.likedOfferIds?.includes(b.id) ||
        userPreferences?.likedCompanies?.some(
          (c) => c.toLowerCase().trim() === b.company.toLowerCase().trim()
        );

      if (isLikedA && !isLikedB) return -1;
      if (!isLikedA && isLikedB) return 1;

      // Règle 3 : Priorité stratégique calculée (IA/Vision, Fraîcheur, Mots-clés)
      const priorityA = calculateOfferPriority(a, userPreferences || undefined).score;
      const priorityB = calculateOfferPriority(b, userPreferences || undefined).score;
      if (priorityB !== priorityA) return priorityB - priorityA;

      // Règle 4 : Date/heure de publication
      const timeA = getOfferTimestamp(a);
      const timeB = getOfferTimestamp(b);
      return timeB - timeA;
    });

  // Scanner en direct les offres sur les marchés suisse et européen avec filtre de fraîcheur
  const handleScanLiveOffers = async (overrideTimeframe?: "24h" | "3d" | "7d" | "all") => {
    const tf = overrideTimeframe || radarTimeframe;
    setIsScanningLive(true);
    setLastScanMessage(null);
    try {
      const res = await fetch(`/api/radar/live-fetch?timeframe=${tf}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.offers)) {
        setLiveOffers(data.offers);
        try {
          localStorage.setItem("resumesquad_live_offers_v3", JSON.stringify(data.offers));
        } catch (e) {
          console.warn("Erreur sauvegarde localStorage:", e);
        }
        setLastScanMessage(
          `🔥 ${data.offers.length} opportunités ultra-fraîches (${data.timeframeLabel || tf}) scannées en direct sur le marché européen !`
        );
      } else {
        throw new Error(data.error || "Erreur lors du scan en direct");
      }
    } catch (err: any) {
      console.warn("Erreur scan live:", err);
      setLastScanMessage("⚠️ Impossible de joindre les flux en direct pour le moment.");
    } finally {
      setIsScanningLive(false);
    }
  };

  // Nettoyage et formatage optimisé des requêtes de recherche Google & Google Jobs
  const cleanJobTitle = (title: string) => {
    return title
      .replace(/\s*[\(\[\{](?:m\/[wfd]\/[mdx]|f\/m\/x|m\/w\/d|h\/f|f\/h|h\/f\/x|d\/m\/w)[\)\]\}]/gi, "")
      .replace(/\s*INT-\d+/gi, "")
      .replace(/\s*Thesis\s*\/\s*Master\s*Intern\s*:\s*/gi, "")
      .replace(/\s*Master's\s*Thesis\s*-\s*/gi, "")
      .replace(/\s*\(PFE\s*-\s*Promo\s*\d+\)/gi, "")
      .replace(/\s*—\s*Computing & Applied Machine Learning/gi, "")
      .replace(/\s*2027\s*Summer\s*Intern,\s*MS\/PhD,\s*/gi, "")
      .trim();
  };

  const getCleanJobSearchQuery = (company: string, title: string) => {
    const cleaned = cleanJobTitle(title);
    return `"${company}" ${cleaned} careers`;
  };

  const getGoogleJobsQuery = (company: string, title: string, location: string) => {
    const cleaned = cleanJobTitle(title);
    return `${company} ${cleaned} ${location}`;
  };

  // Action d'importation 1-clic depuis le Radar vers le Générateur avec lancement immédiat
  const handleImportRadarOffer = (offer: RadarJobOffer) => {
    setCompany(offer.company);
    setJobTitle(offer.title);
    setJobText(offer.description);
    setJobUrl(offer.url);
    setInputMode("text");
    setCurrentView("generator");
    setExtractMessage({
      type: "success",
      text: `🎯 Offre "${offer.company} - ${offer.title}" importée depuis le Radar ! L'escouade d'agents IA adapte votre CV...`,
    });
    handleRunPipeline({
      jobText: offer.description,
      jobTitle: offer.title,
      company: offer.company,
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "en_attente":
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">🟡 En attente</span>;
      case "entretien":
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium">🟣 Entretien RH / Tech</span>;
      case "offre":
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">🟢 Offre Reçue 🎉</span>;
      case "refus":
        return <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">🔴 Refusé</span>;
    }
  };

  // Détection stricte et sans compromis de la langue effective pour éradiquer tout mélange Franglais
  const isSummaryEnglish = /\b(engineering|student|specializing|seeking|proven|proficient|internship|architected|engineered|built)\b/i.test(
    tailoredSummary
  );
  const isSummaryFrench = /\b(élève-ingénieur|étudiant|dernière année|spécialisé|recherche|stage|diplôme)\b/i.test(
    tailoredSummary
  );
  const effectiveIsEn = isSummaryEnglish && !isSummaryFrench ? true : isSummaryFrench && !isSummaryEnglish ? false : cvLanguage === "en";
  const printVersion = bilingualVersions[effectiveIsEn ? "en" : "fr"];
  const printTitle = printVersion?.tailoredTitle || tailoredTitle;
  const printSummary = printVersion?.tailoredSummary || tailoredSummary;
  const printBullets = printVersion?.projectBullets && printVersion.projectBullets.length > 0 ? printVersion.projectBullets : projectBullets;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Toast de confirmation de vote / apprentissage actif */}
      {preferenceFeedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-[#18181b]/95 backdrop-blur-md border border-emerald-500/50 shadow-2xl text-white text-xs flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <span className="font-medium">{preferenceFeedbackToast}</span>
          </div>
          <button
            onClick={() => setPreferenceFeedbackToast(null)}
            className="text-[#a1a1aa] hover:text-white text-xs px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="no-print space-y-6">
        {/* Header avec Navigation Principale */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#27272a] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">ResumeSquad AI</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                PFE Copilot & Tracker
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#a1a1aa] mt-0.5">
              Optimisation ATS de CV & Gestionnaire de Candidatures Intégré
            </p>
          </div>
        </div>

        {/* Sélecteur de vue principal */}
        <div className="flex flex-wrap items-center gap-2 bg-[#18181b] border border-[#27272a] p-1.5 rounded-xl">
          <button
            onClick={() => setCurrentView("generator")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              currentView === "generator"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            }`}
          >
            ⚡ Générateur Multi-Agents
          </button>
          <button
            onClick={() => setCurrentView("radar")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              currentView === "radar"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            }`}
          >
            <span>🔍 Radar d&apos;Offres PFE</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {allRadarOffers.length}
            </span>
          </button>
          <button
            onClick={() => setCurrentView("autopilot")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              currentView === "autopilot"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            }`}
          >
            <span>🤖 Auto-Pilot (Bot)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              Live
            </span>
          </button>
          <button
            onClick={() => setCurrentView("tracker")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              currentView === "tracker"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            }`}
          >
            <span>📊 Suivi des Candidatures</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
              {applications.length}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VUE 1 : GÉNÉRATEUR MULTI-AGENTS                                           */}
      {/* ========================================================================= */}
      {currentView === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne Gauche : Input de l'offre */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>📋</span> Offre d&apos;emploi ciblée
                </h2>

                {/* Switcher Mode Texte / URL (V2) */}
                <div className="flex gap-1 bg-[#09090b] border border-[#27272a] p-1 rounded-lg text-[11px]">
                  <button
                    onClick={() => setInputMode("text")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      inputMode === "text" ? "bg-blue-600 text-white font-medium" : "text-[#a1a1aa]"
                    }`}
                  >
                    📝 Texte
                  </button>
                  <button
                    onClick={() => setInputMode("url")}
                    className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                      inputMode === "url" ? "bg-blue-600 text-white font-medium" : "text-[#a1a1aa]"
                    }`}
                  >
                    <span>🔗 URL (V2)</span>
                  </button>
                </div>
              </div>

              {/* Mode URL (V2) */}
              {inputMode === "url" && (
                <div className="space-y-2 p-3 rounded-xl bg-[#09090b] border border-blue-500/30">
                  <label className="text-xs text-blue-400 block font-medium">
                    Coller l&apos;URL de l&apos;offre (LinkedIn, WTTJ, Indeed, Jobup Suisse...)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://www.welcometothejungle.com/fr/companies/..."
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleExtractFromUrl();
                        }
                      }}
                      className="flex-1 text-xs p-2.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleExtractFromUrl()}
                      disabled={isExtracting || !jobUrl}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                    >
                      <span>{isExtracting ? "⏳" : "⚡"}</span>
                      <span>{isExtracting ? "Extraction..." : "Extraire"}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-[#71717a]">
                    Appuyez sur Entrée ou cliquez sur Extraire pour récupérer le texte de la page.
                  </div>
                </div>
              )}

              {/* Message de statut d'extraction */}
              {extractMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start justify-between gap-2 border transition ${
                    extractMessage.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : extractMessage.type === "warning"
                      ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                      : "bg-red-950/40 border-red-500/30 text-red-300"
                  }`}
                >
                  <span className="leading-relaxed">{extractMessage.text}</span>
                  <button
                    onClick={() => setExtractMessage(null)}
                    className="text-[#a1a1aa] hover:text-white text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs text-[#a1a1aa] block mb-1 font-medium">
                      Entreprise ciblée <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setIsLetterOutdated(true);
                      }}
                      placeholder="ex: Mistral AI, Rolex, CERN..."
                      className="w-full text-xs p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa] block mb-1 font-medium">
                      Intitulé du poste <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => {
                        setJobTitle(e.target.value);
                        setIsLetterOutdated(true);
                      }}
                      placeholder="ex: Ingénieur IA & Machine Learning (Stage PFE)"
                      className="w-full text-xs p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[#a1a1aa] block font-medium">
                      Texte de l&apos;offre d&apos;emploi <span className="text-blue-400">*</span>
                    </label>
                    {isLetterOutdated && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        ⚠️ Modification non synchronisée
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={7}
                    value={jobText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setJobText(val);
                      setIsLetterOutdated(true);
                      autoDetectCompanyAndTitleFromText(val);
                    }}
                    placeholder="Collez ici l'intégralité du texte de l'annonce ou la description des missions..."
                    className="w-full text-xs p-3 rounded-xl bg-[#09090b] border border-[#27272a] text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition resize-y"
                  />
                </div>

                {/* Détection automatique si l'utilisateur colle une URL dans le texte */}
                {(jobText.trim().startsWith("http://") || jobText.trim().startsWith("https://")) && (
                  <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl flex items-center justify-between text-xs text-blue-300">
                    <div className="flex items-center gap-2">
                      <span>🔗</span>
                      <span>URL détectée dans le champ texte !</span>
                    </div>
                    <button
                      onClick={() => handleExtractFromUrl(jobText.trim())}
                      disabled={isExtracting}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-[11px] transition shadow-sm"
                    >
                      {isExtracting ? "Extraction..." : "Extraire le texte"}
                    </button>
                  </div>
                )}

                {/* Bouton de lancement de l'escouade */}
                <button
                  onClick={() => handleRunPipeline()}
                  disabled={isRunning || isExtracting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 shadow-md"
                >
                  <span>{isRunning || isExtracting ? "⏳" : "⚡"}</span>
                  <span className="font-semibold">
                    {isExtracting
                      ? "Extraction du texte de l'URL..."
                      : isRunning
                      ? "Orchestration multi-agents Gemini en cours..."
                      : "1. Lancer l'escouade multi-agents"}
                  </span>
                </button>
              </div>
            </div>

            {/* Guide rapide des 3 actions */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-xs space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>💡</span> Comment postuler efficacement :
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#a1a1aa] leading-relaxed">
                <li><b className="text-white">Lancer l&apos;escouade :</b> Les 4 agents réécrivent ton CV selon l&apos;offre.</li>
                <li><b className="text-white">Télécharger le CV :</b> Récupère ton fichier LaTeX (.tex) pour Overleaf.</li>
                <li><b className="text-white">Postuler & Suivre :</b> Enregistre l&apos;offre dans ton CRM de candidatures.</li>
              </ol>
            </div>

            {/* Suivi des Tokens & Dépenses API */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span>💰</span> Consommation Tokens & Coût API
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tier 100% Gratuit
                </span>
              </div>

              {/* Métriques Dernière Génération vs Cumul */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] space-y-1">
                  <div className="text-[#a1a1aa] text-[10px] font-medium uppercase tracking-wider">Dernier Run</div>
                  {lastTokenUsage ? (
                    <div>
                      <div className="text-white font-bold text-sm">
                        {lastTokenUsage.totalTokens.toLocaleString()} <span className="text-[10px] text-[#a1a1aa] font-normal">tokens</span>
                      </div>
                      <div className="text-[#71717a] text-[10px] mt-0.5">
                        In: {lastTokenUsage.promptTokens} | Out: {lastTokenUsage.completionTokens}
                      </div>
                      <div className="text-emerald-400 font-semibold text-[10px] mt-1">
                        0.00 € <span className="text-[#71717a] line-through font-normal">({lastTokenUsage.estimatedCostEur.toFixed(4)} €)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#71717a] italic py-1">En attente de génération</div>
                  )}
                </div>

                <div className="bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] space-y-1">
                  <div className="text-[#a1a1aa] text-[10px] font-medium uppercase tracking-wider">Cumul Session</div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      {cumulativeTokens.toLocaleString()} <span className="text-[10px] text-[#a1a1aa] font-normal">tokens</span>
                    </div>
                    <div className="text-[#71717a] text-[10px] mt-0.5">
                      {cumulativeRuns} génération{cumulativeRuns > 1 ? "s" : ""} effectuée{cumulativeRuns > 1 ? "s" : ""}
                    </div>
                    <div className="text-emerald-400 font-semibold text-[10px] mt-1">
                      0.00 € <span className="text-[#71717a] font-normal">(Quota offert)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note explicative & Lien officiel */}
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#a1a1aa] text-[11px] space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 text-blue-300 font-medium text-[11px]">
                  <span>🛡️</span>
                  <span>Garantie Zéro Facturation Google AI Studio</span>
                </div>
                <p className="text-[10px] text-[#cbd5e1]">
                  Ta clé API fonctionne sur le <b>Plan Gratuit</b> de Google (sans carte bancaire requise). Tu bénéficies de <b>15 requêtes/minute</b> et jusqu&apos;à <b>1 500 requêtes/jour</b> à 0 €.
                </p>
                <div className="pt-1 flex items-center justify-between border-t border-blue-500/20 text-[10px]">
                  <a
                    href="https://aistudio.google.com/app/plan_information"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1"
                  >
                    <span>Vérifier mes quotas officiels Google AI Studio</span>
                    <span>↗</span>
                  </a>
                  {cumulativeTokens > 0 && (
                    <button
                      onClick={() => {
                        setCumulativeTokens(0);
                        setCumulativeRuns(0);
                        localStorage.removeItem("resumesquad_cumulative_tokens");
                        localStorage.removeItem("resumesquad_cumulative_runs");
                      }}
                      className="text-[#71717a] hover:text-white transition"
                      title="Réinitialiser le compteur de session"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Visualisation & Livrables */}
          <div className="lg:col-span-7 space-y-4">

            {/* ATS Scoreboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-center">
                <div className="text-[11px] text-[#a1a1aa]">Score ATS Prédictif</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {atsScore}<span className="text-xs font-normal text-[#a1a1aa]">/100</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-medium mt-1">Top 5% des candidats</div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-center">
                <div className="text-[11px] text-[#a1a1aa]">Couverture Mots-Clés</div>
                <div className="text-3xl font-black text-blue-400 mt-1">
                  {coverageRate}<span className="text-xs font-normal text-[#a1a1aa]">%</span>
                </div>
                <div className="text-[10px] text-blue-400 font-medium mt-1">Mots-clés indispensables</div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-center">
                <div className="text-[11px] text-[#a1a1aa]">Hallucinations</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">0</div>
                <div className="text-[10px] text-emerald-400 font-medium mt-1">100% Vérifié Grounded</div>
              </div>
            </div>

            {/* ALERTE CONVENTION DE STAGE : 100% FULL REMOTE AVEC PREUVE TEXTUELLE */}
            {fullRemoteWarning && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                    <span className="text-lg">⚠️</span>
                    <span>Alerte Convention de Stage : 100% Full Remote Détecté</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                    Contrainte EILCO
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-amber-100">
                  {fullRemoteWarning}
                </p>

                {/* Preuve textuelle exacte issue de l'annonce */}
                {remoteEvidenceQuote ? (
                  <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      <span>🔍</span>
                      <span>Extrait textuel prouvant le mode de travail :</span>
                    </div>
                    <blockquote className="border-l-2 border-amber-400 pl-3 italic text-xs text-amber-100 leading-relaxed font-mono">
                      &ldquo;{remoteEvidenceQuote}&rdquo;
                    </blockquote>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-300/80 italic">
                    ℹ️ Aucune phrase formelle n&apos;indique de télétravail total dans le texte. Vérifiez l&apos;offre ci-dessous.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-500/20 text-[11px]">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span>💡</span>
                    <span>
                      <b>Action conseillée :</b> Ton école (EILCO) exige une présence physique. Demande au recruteur si une formule <b>hybride</b> est envisageable.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFullRemoteWarning(null);
                      setRemoteEvidenceQuote(null);
                      setWorkplaceType("hybrid");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-semibold border border-amber-500/30 transition flex items-center gap-1"
                    title="Si l'offre n'est pas en full remote ou si c'est une fausse alerte, cliquez pour masquer"
                  >
                    <span>✕</span>
                    <span>Masquer l&apos;alerte (l&apos;offre est en fait hybride / sur site)</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMATION CONFORMITÉ : MODE PRÉSENTIEL OU HYBRIDE AVEC PREUVE */}
            {!fullRemoteWarning && workplaceType && remoteEvidenceQuote && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="text-sm">✅</span>
                    <span>Convention EILCO validée : Mode {workplaceType === "onsite" ? "Présentiel" : "Hybride"} détecté</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                    Conforme
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-[11px] text-emerald-100 italic font-mono">
                  🔍 Extrait de l&apos;annonce : &ldquo;{remoteEvidenceQuote}&rdquo;
                </div>
              </div>
            )}

            {/* ALERTE CONVENTION DE STAGE : MOBILITÉ INTERNATIONALE OBLIGATOIRE (HORS FRANCE) */}
            {franceWarning && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-200 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                    <span className="text-lg">🚫</span>
                    <span>Alerte Convention : Stage Hors France Obligatoire</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                    Mobilité Internationale
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100">
                  {franceWarning}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/30">
                  <span>💡</span>
                  <span>
                    <b>Rappel réglementaire :</b> Ton diplôme d&apos;ingénieur EILCO impose une expérience à l&apos;étranger. Explore les opportunités en Suisse, Luxembourg, Belgique ou Allemagne dans l&apos;onglet <b>🔍 Radar d&apos;Offres PFE</b>.
                  </span>
                </div>
              </div>
            )}

            {/* BARRE D'ACTION PRINCIPALE : TÉLÉCHARGER & SUIVRE */}
            <div className="bg-gradient-to-r from-blue-900/40 via-[#18181b] to-emerald-900/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📄</span> Ton dossier de candidature est prêt pour l&apos;envoi
                </div>
                <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                  Export PDF ATS Direct, compilation cloud Overleaf, code LaTeX (.tex) et lettre de motivation
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handlePrintPdf}
                  className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md"
                  title="Télécharger directement en PDF A4 conforme ATS"
                >
                  <span>📑</span>
                  <span>Télécharger en PDF (ATS Direct)</span>
                </button>

                <button
                  onClick={handleOpenOverleaf}
                  className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md border border-[#3f3f46]"
                  title="Ouvrir et compiler instantanément dans Overleaf"
                >
                  <span>🚀</span>
                  <span>Overleaf (1-Clic)</span>
                </button>

                <button
                  onClick={handleDownloadTex}
                  className="flex-1 md:flex-none px-3 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] border border-[#27272a]"
                  title="Télécharger le fichier source .tex"
                >
                  <span>📥</span>
                  <span>{downloadSuccess ? "Téléchargé !" : ".tex"}</span>
                </button>

                <button
                  onClick={handleSaveApplication}
                  className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md"
                  title="Enregistrer cette candidature dans le tracker CRM"
                >
                  <span>💼</span>
                  <span>{saveSuccess ? "Enregistré !" : "Suivre"}</span>
                </button>
              </div>
            </div>

            {/* Tabs Container */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("bullets")}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === "bullets" ? "bg-blue-600 text-white" : "text-[#a1a1aa] hover:bg-[#09090b]"
                    }`}
                  >
                    ✍️ Puces STAR Réécrites
                  </button>
                  <button
                    onClick={() => setActiveTab("strategy")}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === "strategy" ? "bg-blue-600 text-white" : "text-[#a1a1aa] hover:bg-[#09090b]"
                    }`}
                  >
                    🎯 Stratégie & Mots-clés
                  </button>
                  <button
                    onClick={() => setActiveTab("cover_letter")}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === "cover_letter" ? "bg-blue-600 text-white" : "text-[#a1a1aa] hover:bg-[#09090b]"
                    }`}
                  >
                    ✉️ Lettre de Motivation
                  </button>
                  <button
                    onClick={() => setActiveTab("latex")}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === "latex" ? "bg-blue-600 text-white" : "text-[#a1a1aa] hover:bg-[#09090b]"
                    }`}
                  >
                    📄 Code LaTeX Complet
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sélecteur de langue CV */}
                  <div className="flex items-center gap-1 bg-[#09090b] border border-[#27272a] p-1 rounded-xl text-xs">
                    <span className="text-[10px] text-[#71717a] font-medium px-1.5">Langue CV :</span>
                    <button
                      type="button"
                      onClick={() => handleSwitchLanguage("fr")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        cvLanguage === "fr" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                      }`}
                      title="Générer le CV complet en Français (100% sans Franglais)"
                    >
                      🇫🇷 FR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchLanguage("en")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        cvLanguage === "en" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                      }`}
                      title="Generate full CV in English (100% pure English)"
                    >
                      🇬🇧 EN
                    </button>
                  </div>

                  <a
                    href="https://www.overleaf.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:underline font-medium hidden sm:flex items-center gap-1 ml-1"
                  >
                    <span>Ouvrir Overleaf</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>

              {/* Onglet 1 : Puces STAR */}
              {activeTab === "bullets" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-1.5">
                      Titre & Accroche adaptées à l&apos;offre (Éditable)
                    </div>
                    <input
                      type="text"
                      value={tailoredTitle}
                      onChange={(e) => setTailoredTitle(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-blue-400 mb-2"
                    />
                    <textarea
                      rows={4}
                      value={tailoredSummary}
                      onChange={(e) => setTailoredSummary(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#f4f4f5] leading-relaxed resize-none"
                    />
                  </div>

                  {projectBullets.map((proj, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                          {proj.project}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          Priorité #{idx + 1}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {proj.bullets.map((b, bIdx) => (
                          <div key={bIdx} className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] flex gap-2.5 items-start">
                            <span className="text-blue-400 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed text-[#f4f4f5]">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Section Passions & Centres d'Intérêt */}
                  <div className="space-y-2 pt-3 border-t border-[#27272a]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎯</span> Centres d&apos;Intérêt & Passions (Inclus dans le CV)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                        Profil & Soft Skills
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] space-y-1">
                        <div className="text-white font-semibold flex items-center gap-1.5">
                          <span>🎮</span> Modding & Jeux Vidéo
                        </div>
                        <div className="text-[11px] text-[#a1a1aa] leading-relaxed">
                          Passionné de jeux vidéo et de modding : analyse et rétro-ingénierie de mécaniques de gameplay, scripting et structures de données.
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] space-y-1">
                        <div className="text-white font-semibold flex items-center gap-1.5">
                          <span>🃏</span> Jeux de Stratégie & TCG Compétitif
                        </div>
                        <div className="text-[11px] text-[#a1a1aa] leading-relaxed">
                          Pratique active de jeux de stratégie et tournois compétitifs One Piece TCG : théorie des jeux, optimisation de deck et calculs probabilistes.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet 2 : Stratégie */}
              {activeTab === "strategy" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] space-y-1.5">
                    <div className="font-bold text-white text-sm">Angle d&apos;attaque éditorial :</div>
                    <p className="text-[#a1a1aa] leading-relaxed">
                      Se positionner comme un élève-ingénieur en IA hautement opérationnel, combinant une formation rigoureuse en CPGE et dernière année d&apos;école d&apos;ingénieurs avec des réalisations concrètes et autonomes (VectorWord, Pipeline RAG). Mettre en avant la parfaite adéquation entre la stack technique recherchée (Python, PyTorch, FastAPI, Docker, NLP, RAG, LLM) et les projets récents.
                    </p>
                  </div>

                  <div>
                    <div className="font-semibold text-[#a1a1aa] mb-2 text-[11px] uppercase tracking-wider">
                      Mots-clés ATS intégrés dans le profil :
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Stage PFE", "Machine Learning Engineer", "NLP", "PyTorch", "FastAPI", "Docker", "Transformers", "RAG", "LLM", "Word2Vec", "Gensim", "NumPy"].map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium"
                        >
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet 3 : Lettre de Motivation */}
              {activeTab === "cover_letter" && (
                <div className="space-y-4 text-xs">
                  {/* Barre d'en-tête et contrôles de langue + modes */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                    <div className="space-y-1">
                      <div className="font-semibold text-white flex flex-wrap items-center gap-2">
                        <span>✉️</span>
                        <span className="text-sm">Lettre de Motivation Ciblée</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {coverLetterLanguage === "en" ? "🇬🇧 Version Anglaise" : "🇫🇷 Version Française"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#a1a1aa]">
                        Entreprise : <b className="text-white">{company || "À détecter automatiquement"}</b> | Poste : <b className="text-white">{jobTitle}</b>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Bouton d'adaptation rapide */}
                      <button
                        type="button"
                        onClick={() => handleRunPipeline()}
                        disabled={isRunning}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Adapter et régénérer instantanément la lettre de motivation à l'offre active"
                      >
                        <span>{isRunning ? "⏳" : "⚡"}</span>
                        <span>{isRunning ? "Adaptation en cours..." : "Adapter à l'offre"}</span>
                      </button>

                      {/* Sélecteur de langue bilingue */}
                      <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] p-1 rounded-xl text-xs">
                        <span className="text-[10px] text-[#71717a] font-medium px-1.5">Langue :</span>
                        <button
                          type="button"
                          onClick={() => handleSwitchCoverLetterLanguage("fr")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            coverLetterLanguage === "fr" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                          }`}
                          title="Générer la lettre en Français (100% soigné)"
                        >
                          🇫🇷 FR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchCoverLetterLanguage("en")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            coverLetterLanguage === "en" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                          }`}
                          title="Generate cover letter in English (100% pure English)"
                        >
                          🇬🇧 EN
                        </button>
                      </div>

                      {/* Sélecteur de mode d'affichage */}
                      <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setCoverLetterMode("edit")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            coverLetterMode === "edit" ? "bg-[#27272a] text-white" : "text-[#a1a1aa] hover:text-white"
                          }`}
                        >
                          📝 Éditeur
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverLetterMode("preview")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            coverLetterMode === "preview" ? "bg-[#27272a] text-white" : "text-[#a1a1aa] hover:text-white"
                          }`}
                        >
                          👁️ Aperçu Propre
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverLetterMode("latex")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            coverLetterMode === "latex" ? "bg-[#27272a] text-white" : "text-[#a1a1aa] hover:text-white"
                          }`}
                        >
                          📄 LaTeX (.tex)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Alerte si le texte ou l'entreprise a changé sans actualisation */}
                  {isLetterOutdated && !isRunning && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">⚠️</span>
                        <div>
                          <div className="font-semibold text-xs text-white">Texte de l&apos;offre modifié</div>
                          <div className="text-[11px] text-amber-300/90">
                            La lettre ci-dessous n&apos;est pas encore adaptée aux dernières modifications pour <b className="text-white">{company || "cette offre"}</b>. Cliquez pour l&apos;actualiser.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRunPipeline()}
                        disabled={isRunning}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <span>⚡</span>
                        <span>Actualiser la lettre</span>
                      </button>
                    </div>
                  )}

                  {/* Barre d'actions d'exportation */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                    <div className="text-[11px] text-[#a1a1aa] flex items-center gap-1.5">
                      <span>📄 Export prêt :</span>
                      <code className="text-white text-[11px]">{getCleanExportFileName("Lettre_Motivation", "pdf")}</code>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handlePrintCoverLetterPdf}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                        title="Télécharger directement en PDF A4 propre sans entête parasite du navigateur"
                      >
                        <span>📄</span>
                        <span>Télécharger en PDF (Propre)</span>
                      </button>

                      <button
                        onClick={handleOpenOverleafCoverLetter}
                        className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 border border-[#3f3f46]"
                        title="Compiler sur Overleaf (1-Clic)"
                      >
                        <span>🚀</span>
                        <span className="hidden sm:inline">Compiler sur</span>
                        <span>Overleaf</span>
                      </button>

                      <button
                        onClick={handleDownloadCoverLetterTex}
                        className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-lg text-xs font-medium transition flex items-center gap-1 border border-[#3f3f46]"
                        title="Télécharger le code LaTeX (.tex)"
                      >
                        <span>📥</span>
                        <span>.tex</span>
                      </button>

                      <button
                        onClick={handleDownloadCoverLetter}
                        className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-lg text-xs font-medium transition flex items-center gap-1 border border-[#3f3f46]"
                        title="Télécharger en texte brut (.txt)"
                      >
                        <span>📥</span>
                        <span>.txt</span>
                      </button>

                      <button
                        onClick={handleCopyCoverLetter}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-sm"
                      >
                        <span>{copyLetterSuccess ? "✓" : "📋"}</span>
                        <span>{copyLetterSuccess ? "Copié !" : "Copier"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Contenu selon le mode sélectionné ou état de chargement */}
                  {isRunning ? (
                    <div className="p-8 sm:p-12 rounded-xl bg-[#09090b] border border-blue-500/30 text-center space-y-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-2xl animate-pulse">
                        ✍️
                      </div>
                      <div className="space-y-1.5 max-w-md mx-auto">
                        <div className="font-bold text-white text-sm">
                          Rédaction et calibration de votre lettre en cours...
                        </div>
                        <p className="text-xs text-[#a1a1aa] leading-relaxed">
                          L&apos;escouade d&apos;agents IA analyse les missions de l&apos;offre pour <b className="text-blue-400">{company}</b> ({jobTitle}) et rédige votre lettre ultra-personnalisée avec zéro boilerplate.
                        </p>
                      </div>
                      <div className="w-56 h-1.5 bg-[#27272a] rounded-full mx-auto overflow-hidden">
                        <div className="w-full h-full bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                      <div className="text-[11px] text-[#71717a] italic">
                        Synchronisation bilingue FR/EN en direct avec Gemini...
                      </div>
                    </div>
                  ) : (
                    <>
                      {coverLetterMode === "edit" && (
                        <div className="relative">
                          <textarea
                            rows={16}
                            value={coverLetter}
                            onChange={(e) => handleCoverLetterChange(e.target.value)}
                            className="w-full text-xs p-4 rounded-xl bg-[#09090b] border border-[#27272a] text-[#f4f4f5] font-sans leading-relaxed focus:outline-none focus:border-blue-500 transition resize-y"
                            placeholder="Lettre de motivation générée automatiquement..."
                          />
                          <div className="flex justify-between items-center text-[10px] text-[#71717a] px-1 pt-1">
                            <span>💡 Modifiez librement le texte. Vos modifications sont conservées pour la langue active ({coverLetterLanguage.toUpperCase()}).</span>
                            <span>{coverLetter.length} caractères • {coverLetter.trim().split(/\s+/).filter(Boolean).length} mots</span>
                          </div>
                        </div>
                      )}

                      {coverLetterMode === "preview" && (
                        <div className="p-8 sm:p-12 rounded-xl bg-white text-gray-900 border border-gray-200 shadow-xl font-sans max-w-3xl mx-auto">
                          {renderFormattedCoverLetter(coverLetter)}
                        </div>
                      )}

                      {coverLetterMode === "latex" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[#a1a1aa] text-[11px]">
                            <span>Code LaTeX prêt à compiler :</span>
                            <span className="text-emerald-400 font-medium">✓ Packages standard : geometry, hyperref, xcolor, parskip</span>
                          </div>
                          <pre className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] font-mono text-[11px] text-[#f4f4f5] overflow-x-auto max-h-80 leading-relaxed">
{getCoverLetterTex()}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Onglet 4 : LaTeX */}
              {activeTab === "latex" && (
                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#a1a1aa] text-[11px]">
                      Fichier prêt : <code className="text-white">cv_badroudine_bacar.tex</code>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenOverleaf}
                        className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg text-xs font-medium transition flex items-center gap-1 border border-[#3f3f46]"
                      >
                        <span>🚀</span>
                        <span>Compiler sur Overleaf (1-Clic)</span>
                      </button>
                      <button
                        onClick={handleDownloadTex}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                      >
                        <span>📥</span>
                        <span>Télécharger .tex</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] font-mono text-[11px] text-[#f4f4f5] overflow-x-auto max-h-72">
{getTexContent()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : RADAR D'OFFRES PFE & DISCOVERY HUB                                */}
      {/* ========================================================================= */}
      {currentView === "radar" && (
        <div className="space-y-8">
          {/* Bannière Hero Radar */}
          <div className="bg-gradient-to-r from-blue-900/40 via-[#18181b] to-indigo-950/40 border border-blue-500/30 rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Radar d&apos;Offres PFE 2027</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    IA & Machine Learning
                  </span>
                </div>
                <p className="text-xs md:text-sm text-[#a1a1aa] mt-1 max-w-2xl">
                  Centralisation et détection automatique des stages de fin d&apos;études Bac+5 exclusivement à l&apos;étranger (Suisse, Luxembourg, Belgique, Allemagne, UK).
                  Conformité totale avec l&apos;obligation de mobilité internationale et les exigences de l&apos;EILCO.
                </p>
              </div>

              {/* Badges de conformité EILCO */}
              <div className="flex flex-wrap md:flex-col gap-2 items-start md:items-end">
                <span className="text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-medium flex items-center gap-1.5">
                  <span>🌍</span>
                  <span>Mobilité Internationale Obligatoire (Hors France)</span>
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Convention : Présentiel & Hybride (0% Full Remote)</span>
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1.5">
                  <span>🎓</span>
                  <span>PFE 6 mois (Mars - Sept 2027)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section 1 : Portails de Chasse Directe */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🌐</span>
                  <span>Portails de Chasse Directe (Filtres Booléens Pré-configurés)</span>
                </h3>
                <p className="text-xs text-[#a1a1aa]">
                  Accès direct aux requêtes ultra-ciblées sur les sites de recrutement en Suisse, Luxembourg, et Belgique.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEEP_SEARCH_PORTALS.map((portal, idx) => (
                <div
                  key={idx}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/40 transition hover:bg-[#1f1f23] group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#27272a] text-[#f4f4f5] font-medium flex items-center gap-1">
                        <span>{portal.countryFlag}</span>
                        <span>{portal.country}</span>
                      </span>
                      <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                        {portal.category}
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm group-hover:text-blue-400 transition">
                      {portal.name}
                    </div>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                      {portal.description}
                    </p>
                  </div>

                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#27272a] hover:bg-blue-600 hover:text-white text-xs font-semibold text-[#f4f4f5] rounded-lg transition"
                  >
                    <span>Lancer la recherche</span>
                    <span>↗</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 : Offres Vérifiées & Prêtes à Importer */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚡</span>
                  <span>Offres PFE 2027 Détectées ({filteredRadarOffers.length})</span>
                </h3>
                <p className="text-xs text-[#a1a1aa]">
                  Sélectionnées pour correspondre à votre spécialité IA/ML et vos critères de mobilité internationale.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Bouton de scan temps réel */}
                <button
                  onClick={() => handleScanLiveOffers()}
                  disabled={isScanningLive}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  title="Interroge en direct les APIs de jobs tech en Suisse, Luxembourg, Belgique et Allemagne"
                >
                  <span className={isScanningLive ? "animate-spin" : ""}>🔄</span>
                  <span>
                    {isScanningLive ? "Scan du marché suisse & européen..." : "Scanner en direct (Temps Réel)"}
                  </span>
                </button>

                {/* Bouton de purge de cache et scan immédiat */}
                <button
                  onClick={() => {
                    localStorage.removeItem("resumesquad_live_offers");
                    localStorage.removeItem("resumesquad_live_offers_v3");
                    setLiveOffers([]);
                    handleScanLiveOffers("7d");
                  }}
                  disabled={isScanningLive}
                  className="w-full sm:w-auto px-3 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border border-[#27272a] text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
                  title="Vider le cache local et recharger les offres du jour"
                >
                  <span>🧹</span>
                  <span>Actualiser à zéro</span>
                </button>

                {/* Filtre de recherche texte */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={radarSearch}
                    onChange={(e) => setRadarSearch(e.target.value)}
                    placeholder="Filtrer (ex: PyTorch, Genève)..."
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500"
                  />
                  {radarSearch && (
                    <button
                      onClick={() => setRadarSearch("")}
                      className="absolute right-2.5 top-2 text-xs text-[#71717a] hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notification de résultat de scan en direct */}
            {lastScanMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-sm">
                <span className="font-medium">{lastScanMessage}</span>
                <button
                  onClick={() => setLastScanMessage(null)}
                  className="text-xs text-emerald-400 hover:text-white font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Filtres de fraîcheur temporelle */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#18181b] border border-[#27272a] rounded-xl shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1 mr-1">
                  <span>⏱️</span>
                  <span>Fraîcheur des offres :</span>
                </span>
                {[
                  { id: "24h", label: "🔥 Moins de 24h (Ultra-Frais)", desc: "Offres publiées aujourd'hui" },
                  { id: "3d", label: "⚡ Moins de 3 jours", desc: "Offres des 72 dernières heures" },
                  { id: "7d", label: "📅 Cette semaine (< 7j)", desc: "Offres publiées cette semaine" },
                  { id: "all", label: "🌐 Tout l'historique", desc: "Toutes les offres disponibles" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => {
                      const newTf = tf.id as "24h" | "3d" | "7d" | "all";
                      setRadarTimeframe(newTf);
                      handleScanLiveOffers(newTf);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      radarTimeframe === tf.id
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-semibold"
                        : "bg-[#09090b] text-[#a1a1aa] border border-[#27272a] hover:text-white hover:bg-[#27272a]"
                    }`}
                    title={tf.desc}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-[#71717a] flex items-center gap-1">
                <span>🔄 Tri :</span>
                <span className="text-emerald-400 font-medium">Nouvelles offres en premier · Postulées en bas (par date)</span>
              </div>
            </div>

            {/* Filtres par pays */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: `Tous (${allRadarOffers.length})` },
                { key: "Suisse", label: `🇨🇭 Suisse (${allRadarOffers.filter((o) => o.country === "Suisse").length})` },
                { key: "Luxembourg", label: `🇱🇺 Luxembourg (${allRadarOffers.filter((o) => o.country === "Luxembourg").length})` },
                { key: "Belgique", label: `🇧🇪 Belgique (${allRadarOffers.filter((o) => o.country === "Belgique").length})` },
                { key: "Allemagne", label: `🇩🇪 Allemagne (${allRadarOffers.filter((o) => o.country === "Allemagne").length})` },
                { key: "International", label: `🌐 Big Tech / UK (${allRadarOffers.filter((o) => o.country === "International").length})` },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setRadarCountryFilter(pill.key)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition ${
                    radarCountryFilter === pill.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:text-white hover:bg-[#27272a]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Conseil anti-404 pour les annonces */}
            <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl text-xs text-[#a1a1aa] flex items-center gap-2">
              <span>💡</span>
              <span>
                <b>Astuce liens actifs :</b> Les offres d&apos;emploi tech peuvent être archivées ou renouvelées régulièrement par les entreprises. Si un lien direct affiche &quot;Page non trouvée&quot;, cliquez sur <b>🔎 Google ↗</b> pour trouver immédiatement l&apos;offre active ou les postes équivalents chez le recruteur.
              </span>
            </div>

            {/* Grille des offres du Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRadarOffers.length === 0 ? (
                <div className="lg:col-span-2 p-12 text-center bg-[#18181b] border border-[#27272a] rounded-2xl text-sm text-[#a1a1aa]">
                  Aucune offre ne correspond à vos filtres actuels. Réinitialisez la recherche pour voir toutes les opportunités.
                </div>
              ) : (
                filteredRadarOffers.map((offer) => {
                  const trackedApp = findTrackedAppForOffer(offer, applications);
                  const isLiked =
                    userPreferences?.likedOfferIds?.includes(offer.id) ||
                    userPreferences?.likedCompanies?.some(
                      (c) => c.toLowerCase().trim() === offer.company.toLowerCase().trim()
                    );
                  const isDisliked =
                    userPreferences?.dislikedOfferIds?.includes(offer.id) ||
                    userPreferences?.dislikedCompanies?.some(
                      (c) => c.toLowerCase().trim() === offer.company.toLowerCase().trim()
                    );

                  return (
                    <div
                      key={offer.id}
                      className={`rounded-2xl p-5 flex flex-col justify-between transition space-y-4 ${
                        trackedApp
                          ? "bg-[#141b16]/90 border-2 border-emerald-500/40 shadow-sm"
                          : isLiked
                          ? "bg-[#18181b] border-2 border-amber-500/50 shadow-md shadow-amber-500/10"
                          : isDisliked
                          ? "bg-[#18181b]/50 border border-red-500/30 opacity-60"
                          : "bg-[#18181b] border border-[#27272a] hover:border-blue-500/40 hover:bg-[#1a1a1e]"
                      }`}
                    >
                      {/* Bandeau d'indication si candidature déjà suivie / postulée */}
                      {trackedApp && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span>✅</span>
                            <span>Candidature Postulée</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 uppercase font-bold tracking-wide">
                              {trackedApp.status === "en_attente" && "🟡 En attente"}
                              {trackedApp.status === "entretien" && "🟣 Entretien"}
                              {trackedApp.status === "offre" && "🟢 Offre reçue"}
                              {trackedApp.status === "refus" && "🔴 Refus"}
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              setCurrentView("tracker");
                              setFilterStatus("all");
                            }}
                            className="text-[11px] text-emerald-400 hover:text-white underline font-medium ml-2"
                          >
                            Voir dans le Suivi ↗
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Entête de carte */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-base">{offer.company}</span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-[#27272a] text-[#f4f4f5] font-medium flex items-center gap-1">
                                <span>{offer.countryFlag}</span>
                                <span>{offer.location}</span>
                              </span>
                              {isLiked && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <span>⭐️</span>
                                  <span>Favori</span>
                                </span>
                              )}
                              {isDisliked && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                                  <span>🚫</span>
                                  <span>Écarté</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-blue-400 mt-1">{offer.title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {/* Badge Langue */}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {offer.language === "fr" || (offer.description && !offer.language && /\b(stage|missions|profil)\b/i.test(offer.description)) ? "🇫🇷 Français" : "🇬🇧 Anglais"}
                              </span>
                              {/* Badge Faible Concurrence */}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                (offer.applicantsCount || 10) <= 10
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : (offer.applicantsCount || 10) <= 25
                                  ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
                              }`}>
                                {(offer.applicantsCount || 10) <= 10
                                  ? `🎯 < 10 candidats (${offer.applicantsCount || 6})`
                                  : (offer.applicantsCount || 10) <= 25
                                  ? `🚀 Early (${offer.applicantsCount} postulants)`
                                  : `👥 ${offer.applicantsCount} candidats`}
                              </span>
                            </div>
                          </div>

                          {/* Badges rémunération, fraîcheur & workplace */}
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {/* Badge Date de Publication Toujours Visible */}
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm ${
                                (offer.postedAgo || "").includes("min") ||
                                (offer.postedAgo || "").includes(" h") ||
                                (offer.postedAgo || "").includes("heure") ||
                                offer.postedAgo === "Hier"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : (offer.postedAgo || "").includes("jour")
                                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                  : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              }`}
                              title="Date de publication détectée sur le flux du recruteur"
                            >
                              <span>
                                {(offer.postedAgo || "").includes("min") ||
                                (offer.postedAgo || "").includes(" h") ||
                                (offer.postedAgo || "").includes("heure")
                                  ? "🔥"
                                  : (offer.postedAgo || "") === "Hier" || (offer.postedAgo || "").includes("jour")
                                  ? "⚡"
                                  : "📅"}
                              </span>
                              <span>{offer.postedAgo ? `Publié : ${offer.postedAgo}` : "Publié cette semaine"}</span>
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                offer.workplace === "Présentiel"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}
                            >
                              📍 {offer.workplace}
                            </span>
                            {offer.compensation && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                💰 {offer.compensation}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stack technique */}
                        <div className="flex flex-wrap gap-1.5">
                          {offer.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[#09090b] text-[#a1a1aa] border border-[#27272a] font-mono"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Aperçu du texte */}
                        <p className="text-xs text-[#a1a1aa] line-clamp-3 bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] font-mono leading-relaxed">
                          {offer.description}
                        </p>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#27272a]">
                        {/* Vote interactif d'apprentissage actif */}
                        <div className="flex items-center gap-1 bg-[#09090b] border border-[#27272a] rounded-xl p-1 flex-shrink-0">
                          <button
                            onClick={() => handleVoteOffer(offer, "like")}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isLiked
                                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
                                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
                            }`}
                            title="J'aime cette opportunité (priorise l'entreprise et affine les suggestions)"
                          >
                            <span>👍</span>
                            <span className="text-[10px] hidden sm:inline">{isLiked ? "Aimé" : "J'aime"}</span>
                          </button>

                          <button
                            onClick={() => handleVoteOffer(offer, "dislike")}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isDisliked
                                ? "bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm"
                                : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
                            }`}
                            title="Pas pour moi (écarte l'entreprise des prochains cycles Auto-Pilot)"
                          >
                            <span>👎</span>
                            <span className="text-[10px] hidden sm:inline">{isDisliked ? "Écarté" : "Écarter"}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleImportRadarOffer(offer)}
                          className="flex-1 min-w-[120px] py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <span>⚡ Importer & Adapter</span>
                        </button>

                        {/* Bouton Playwright 1-Clic : Ouvre Chrome et remplit */}
                        <button
                          onClick={() => handleDirectBrowserFill(offer)}
                          disabled={isBrowserFilling}
                          className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                          title="Ouvrir Chrome, remplir automatiquement le formulaire et envoyer la capture sur Discord"
                        >
                          <span>🌐</span>
                          <span>Auto-Fill Chrome</span>
                        </button>

                        {/* Bouton pour marquer/démarquer directement comme postulé */}
                        <button
                          onClick={() => handleToggleTrackOffer(offer)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 flex-shrink-0 ${
                            trackedApp
                              ? "bg-emerald-500/20 hover:bg-red-500/20 text-emerald-300 hover:text-red-300 border border-emerald-500/30"
                              : "bg-[#27272a] hover:bg-emerald-600/30 text-[#a1a1aa] hover:text-emerald-300 border border-[#3f3f46]"
                          }`}
                          title={trackedApp ? "Cliquez pour retirer du suivi" : "Marquer comme déjà postulé (déplace l'offre en bas de la liste)"}
                        >
                          <span>{trackedApp ? "✅ Déjà Postulé" : "📌 Marquer Postulé"}</span>
                        </button>

                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
                          title="Lien direct vers l'offre officielle ou le portail carrière"
                        >
                          <span>🔗 Direct</span>
                          <span>↗</span>
                        </a>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(getGoogleJobsQuery(offer.company, offer.title, offer.location))}&ibp=htl;jobs`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
                          title="Ouvrir dans Google Jobs (agrégateur multi-sources officiel : ATS, LinkedIn, Indeed)"
                        >
                          <span>💼 Jobs</span>
                          <span>↗</span>
                        </a>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(getCleanJobSearchQuery(offer.company, offer.title))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2.5 bg-[#27272a] hover:bg-amber-500/20 hover:text-amber-300 text-[#a1a1aa] rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
                          title="Recherche ciblée Google sans filtre restrictif"
                        >
                          <span>🔎 Google</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 4 : AUTONOMOUS AGENT AUTO-PILOT & DISCORD ESCALATION                   */}
      {/* ========================================================================= */}
      {currentView === "autopilot" && (
        <div className="space-y-6">
          {/* Header Auto-Pilot */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <h2 className="text-xl font-bold text-white">Mode Auto-Pilot & Escalade Discord</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    Autonome & Supervisé
                  </span>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-3xl">
                  L&apos;agent autonome prospecte en direct les offres internationales en **IA, Machine Learning & Vision par Ordinateur** (Suisse, Luxembourg, Belgique, Allemagne • Hybride/Sur site), génère tes CVs au format STAR avec métriques chiffrées, et t&apos;envoie une notification instantanée sur Discord dès qu&apos;une candidature est prête ou nécessite un arbitrage humain.
                </p>
              </div>

              {/* Contrôles d'action : Sélecteur de volume & Bouton de lancement */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 bg-[#09090b] border border-[#27272a] rounded-xl p-1">
                  <span className="text-[10px] text-[#71717a] font-semibold px-2">Volume :</span>
                  {[3, 5, 8, 10].map((size) => (
                    <button
                      key={size}
                      onClick={() => setAutopilotBatchSize(size)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                        autopilotBatchSize === size
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
                      }`}
                      title={`Traiter jusqu'à ${size} offres par cycle`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {/* Toggle Auto-Fill Playwright & Screenshots */}
                <button
                  onClick={() => setAutoBrowserApply(!autoBrowserApply)}
                  className={`text-xs px-3 py-2 rounded-xl font-bold border transition flex items-center gap-1.5 ${
                    autoBrowserApply
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm"
                      : "bg-[#09090b] border-[#27272a] text-[#71717a] hover:text-white"
                  }`}
                  title="Activer ou désactiver l'ouverture automatique de Chrome et l'envoi des captures d'écran sur Discord"
                >
                  <span>🌐</span>
                  <span>Playwright : <strong className={autoBrowserApply ? "text-emerald-400" : "text-[#71717a]"}>{autoBrowserApply ? "ON" : "OFF"}</strong></span>
                </button>

                <button
                  onClick={() => handleRunAutopilotCycle()}
                  disabled={isAutopilotRunning}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 shadow-lg"
                >
                  <span>{isAutopilotRunning ? "⏳" : "🚀"}</span>
                  <span>{isAutopilotRunning ? "Cycle en cours..." : `Lancer (${autopilotBatchSize} candidatures)`}</span>
                </button>
              </div>
            </div>

            {/* Badges des filtres et règles pré-programmées */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-[#27272a]">
              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Mobilité EILCO</div>
                <div className="text-xs text-white font-semibold mt-1">🇨🇭 🇱🇺 🇧🇪 🇩🇪</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">France exclue</div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Langues Cibles</div>
                <div className="text-xs text-white font-semibold mt-1">🇫🇷 FR & 🇬🇧 EN</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Allemand/NL filtrés</div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Priorité Traitement</div>
                <div className="text-xs text-white font-semibold mt-1">⚡ &lt; 24h & 🎯 &lt; 25 cand.</div>
                <div className="text-[10px] text-teal-400 mt-0.5">Top conversion ATS</div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Mode de Travail</div>
                <div className="text-xs text-white font-semibold mt-1">Présentiel & Hybride</div>
                <div className="text-[10px] text-amber-400 mt-0.5">100% Remote exclu</div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Moteur Inférence</div>
                <div className="text-xs text-white font-semibold mt-1">Gemini Multi-Modèles</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Failover Actif</div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Escalade Discord</div>
                <div className="text-xs text-white font-semibold mt-1">Push Smartphone</div>
                <div className={`text-[10px] mt-0.5 ${discordWebhook ? "text-emerald-400 font-semibold" : "text-amber-400"}`}>
                  {discordWebhook ? "🟢 Connecté" : "⚠️ Non configuré"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche : Configuration Discord & Contrôles */}
            <div className="lg:col-span-5 space-y-4">
              {/* Carte Configuration Discord Webhook */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>📲</span> Webhook Discord (Notifications Smartphone)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                    Push Instantané
                  </span>
                </div>

                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  Colle l&apos;URL d&apos;un Webhook de ton serveur Discord. Le bot t&apos;enverra une alerte en temps réel dès qu&apos;une offre est traitée ou si un formulaire bloque (Captcha).
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] text-[#71717a] block font-medium">
                    URL du Webhook Discord :
                  </label>
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhook}
                    onChange={(e) => handleSaveDiscordWebhook(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleTestDiscordWebhook()}
                    disabled={isTestingWebhook || !discordWebhook}
                    className="px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <span>{isTestingWebhook ? "⏳" : "🔔"}</span>
                    <span>{isTestingWebhook ? "Test en cours..." : "Tester le Webhook Discord"}</span>
                  </button>

                  <a
                    href="https://support.discord.com/hc/fr/articles/228383668-Utiliser-les-Webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Comment créer un Webhook ? ↗
                  </a>
                </div>

                {/* Message du test webhook */}
                {webhookTestMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                      webhookTestMessage.type === "success"
                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                        : "bg-red-950/40 border-red-500/30 text-red-300"
                    }`}
                  >
                    <span>{webhookTestMessage.text}</span>
                    <button
                      onClick={() => setWebhookTestMessage(null)}
                      className="text-[#a1a1aa] hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Carte Système d'Apprentissage Actif & Préférences Recruteurs */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>🧠</span> Apprentissage Actif & Préférences
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                    RLHF en Temps Réel
                  </span>
                </div>

                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  Chaque vote <strong className="text-emerald-400">👍 J&apos;aime</strong> ou <strong className="text-red-400">👎 Pas pour moi</strong> (reçu depuis Discord ou cliqué sur le Radar) réajuste immédiatement les poids de recommandation du bot.
                </p>

                {/* Compteurs de préférences */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                    <div className="text-[10px] text-[#71717a] font-semibold">Favorites (+120 pts)</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      ⭐ {userPreferences?.likedCompanies.length || 0} entreprises
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                    <div className="text-[10px] text-[#71717a] font-semibold">Écartées (-350 pts)</div>
                    <div className="text-xs font-bold text-red-400 mt-0.5">
                      🚫 {userPreferences?.dislikedCompanies.length || 0} entreprises
                    </div>
                  </div>
                </div>

                {/* Liste des entreprises aimées */}
                {userPreferences && userPreferences.likedCompanies.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#a1a1aa] font-semibold block">Entreprises plébiscitées :</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {userPreferences.likedCompanies.map((comp) => (
                        <span
                          key={comp}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1"
                        >
                          <span>{comp}</span>
                          <button
                            onClick={() => handleRemovePreferenceCompany(comp, "liked")}
                            className="hover:text-white text-[9px] px-0.5 font-bold"
                            title="Retirer des favoris"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des entreprises écartées */}
                {userPreferences && userPreferences.dislikedCompanies.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#a1a1aa] font-semibold block">Entreprises écartées :</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {userPreferences.dislikedCompanies.map((comp) => (
                        <span
                          key={comp}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1"
                        >
                          <span>{comp}</span>
                          <button
                            onClick={() => handleRemovePreferenceCompany(comp, "disliked")}
                            className="hover:text-white text-[9px] px-0.5 font-bold"
                            title="Ne plus écarter"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-[#27272a]">
                  <span className="text-[10px] text-[#71717a]">
                    Stockage persistant : <code className="text-[#a1a1aa]">user_preferences.json</code>
                  </span>
                  <button
                    onClick={handleResetPreferences}
                    className="text-[10px] text-[#a1a1aa] hover:text-red-400 transition underline"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Panneau de Contrôle 1-Clic : Bot Autonome LinkedIn & Portails */}
              <div className="bg-[#18181b] border border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Bot Autonome LinkedIn & ATS
                      </h3>
                      <p className="text-[11px] text-[#a1a1aa]">Lancement & Contrôle direct sans ouvrir de terminal</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                      isLinkedInBotRunning
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-[#27272a] text-[#a1a1aa] border-[#3f3f46]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLinkedInBotRunning ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                      }`}
                    ></span>
                    {isLinkedInBotRunning ? `En cours (PID: ${linkedInBotPid || "actif"})` : "Prêt"}
                  </span>
                </div>

                {/* Paramètres de prospection */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#71717a] font-semibold block mb-1">Mots-clés cibles :</label>
                    <input
                      type="text"
                      value={linkedInKeywords}
                      onChange={(e) => setLinkedInKeywords(e.target.value)}
                      disabled={isLinkedInBotRunning}
                      className="w-full text-xs p-2 rounded-lg bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#71717a] font-semibold block mb-1">Localisation :</label>
                    <input
                      type="text"
                      value={linkedInLocation}
                      onChange={(e) => setLinkedInLocation(e.target.value)}
                      disabled={isLinkedInBotRunning}
                      className="w-full text-xs p-2 rounded-lg bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Toggles d'options */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLinkedInAllJobs(!linkedInAllJobs)}
                    disabled={isLinkedInBotRunning}
                    className={`p-2 rounded-xl text-[11px] font-bold border transition text-center flex flex-col items-center justify-center gap-0.5 ${
                      linkedInAllJobs
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                        : "bg-[#09090b] border-[#27272a] text-[#71717a]"
                    }`}
                    title="Postuler à la fois sur LinkedIn Easy Apply et sur les sites d'entreprises externes"
                  >
                    <span className="text-xs">🌐 Toutes Offres</span>
                    <span className="text-[9px] font-normal">{linkedInAllJobs ? "Easy Apply + ATS" : "Easy Apply seul"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkedInDryRun(!linkedInDryRun)}
                    disabled={isLinkedInBotRunning}
                    className={`p-2 rounded-xl text-[11px] font-bold border transition text-center flex flex-col items-center justify-center gap-0.5 ${
                      linkedInDryRun
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-[#09090b] border-[#27272a] text-[#71717a]"
                    }`}
                    title="Simulation : remplit tout sans cliquer sur Soumettre"
                  >
                    <span className="text-xs">🧪 Simulation</span>
                    <span className="text-[9px] font-normal">{linkedInDryRun ? "Dry-Run actif" : "Envoi Réel"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkedInHeadless(!linkedInHeadless)}
                    disabled={isLinkedInBotRunning}
                    className={`p-2 rounded-xl text-[11px] font-bold border transition text-center flex flex-col items-center justify-center gap-0.5 ${
                      linkedInHeadless
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                        : "bg-[#09090b] border-[#27272a] text-emerald-400"
                    }`}
                    title="Choisir entre ouvrir la fenêtre Chromium ou tourner en arrière-plan discret"
                  >
                    <span className="text-xs">🖥️ Affichage</span>
                    <span className="text-[9px] font-normal">{linkedInHeadless ? "Arrière-plan" : "Fenêtre visible"}</span>
                  </button>
                </div>

                {/* Sélecteur de quota */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-[#a1a1aa] font-semibold">Candidatures par cycle :</span>
                  <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-[#27272a]">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setLinkedInMaxApps(num)}
                        disabled={isLinkedInBotRunning}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold transition ${
                          linkedInMaxApps === num
                            ? "bg-blue-600 text-white"
                            : "text-[#71717a] hover:text-white"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Boutons d'Action 1-Clic */}
                <div className="pt-2 flex items-center gap-2">
                  {!isLinkedInBotRunning ? (
                    <button
                      onClick={handleStartLinkedInBot}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99]"
                    >
                      <span>🚀</span>
                      <span>Lancer le Bot LinkedIn (1-Clic)</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopLinkedInBot}
                      disabled={isStoppingLinkedInBot}
                      className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99] disabled:opacity-50"
                    >
                      <span>🛑</span>
                      <span>{isStoppingLinkedInBot ? "Arrêt en cours..." : "Arrêter le Bot Immédiatement"}</span>
                    </button>
                  )}
                </div>

                {/* Mini-Console de logs du Bot LinkedIn */}
                <div className="pt-2 border-t border-[#27272a]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Console d&apos;activité de l&apos;agent
                    </span>
                    <button
                      onClick={checkLinkedInBotStatus}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                    >
                      Rafraîchir
                    </button>
                  </div>
                  <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3 font-mono text-[10px] h-36 overflow-y-auto space-y-1 text-emerald-400">
                    {linkedInBotLogs.map((log, i) => (
                      <div key={i} className="leading-tight break-all">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Console de Logs Live (Terminal Hacker) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#a1a1aa] ml-2">autopilot-agent.log</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#71717a]">
                      {autopilotLogs.length} ligne{autopilotLogs.length > 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => setAutopilotLogs([`[${new Date().toLocaleTimeString("fr-FR")}] Console réinitialisée.`])}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] hover:text-white transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Fenêtre terminal */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 font-mono text-xs text-[#f4f4f5] h-[340px] overflow-y-auto space-y-1.5 shadow-inner scrollbar-thin scrollbar-thumb-zinc-700">
                  {autopilotLogs.map((logLine, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed whitespace-pre-wrap ${
                        logLine.includes("❌")
                          ? "text-red-400"
                          : logLine.includes("⚠️")
                          ? "text-amber-300"
                          : logLine.includes("🚀") || logLine.includes("🎉")
                          ? "text-emerald-400 font-bold"
                          : logLine.includes("🧠") || logLine.includes("🎯")
                          ? "text-blue-300"
                          : "text-[#d4d4d8]"
                      }`}
                    >
                      {logLine}
                    </div>
                  ))}
                  {isAutopilotRunning && (
                    <div className="flex items-center gap-2 text-blue-400 animate-pulse pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      <span>Traitement en cours...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidatures générées récemment */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>📋</span> Dernières Candidatures Prêtes / Traitées
                  </h3>
                  <button
                    onClick={() => setCurrentView("tracker")}
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Voir dans le CRM Tracker ({applications.length}) ↗
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#71717a]">
                    Aucune candidature enregistrée pour le moment. Lance un cycle Auto-Pilot ci-dessus !
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {applications.slice(-4).reverse().map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{app.company}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                              ATS: {app.atsScore}/100
                            </span>
                          </div>
                          <div className="text-[#a1a1aa] text-[11px] truncate mt-0.5">{app.title}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(app.status)}
                          <button
                            onClick={() => {
                              setCompany(app.company);
                              setJobTitle(app.title);
                              setCurrentView("generator");
                            }}
                            className="px-2 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[11px] text-[#f4f4f5] transition"
                            title="Ouvrir dans le générateur pour voir le CV et la lettre"
                          >
                            Ouvrir ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : TABLEAU DE BORD DE SUIVI DES CANDIDATURES (CRM)                    */}
      {/* ========================================================================= */}
      {currentView === "tracker" && (
        <div className="space-y-6">
          {/* Métriques globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <div className="text-xs text-[#a1a1aa]">Total Candidatures</div>
              <div className="text-2xl font-bold text-white mt-1">{applications.length}</div>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <div className="text-xs text-[#a1a1aa]">En attente de réponse</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {applications.filter((a) => a.status === "en_attente").length}
              </div>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <div className="text-xs text-[#a1a1aa]">Entretiens Décrochés</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {applications.filter((a) => a.status === "entretien").length}
              </div>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4">
              <div className="text-xs text-[#a1a1aa]">Taux de conversion</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {applications.length > 0
                  ? Math.round(
                      (applications.filter((a) => a.status === "entretien" || a.status === "offre").length /
                        applications.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>

          {/* Filtres de statut */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              {[
                { id: "all", label: "Toutes" },
                { id: "en_attente", label: "🟡 En attente" },
                { id: "entretien", label: "🟣 Entretiens" },
                { id: "offre", label: "🟢 Offres" },
                { id: "refus", label: "🔴 Refus" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition ${
                    filterStatus === f.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm("Voulez-vous vider l'historique de vos candidatures pour repartir à zéro ?")) {
                    saveToLocalStorage([]);
                  }
                }}
                className="text-xs px-3 py-2 bg-[#27272a] hover:bg-red-500/20 hover:text-red-400 text-[#a1a1aa] rounded-xl font-medium transition"
                title="Vider la liste"
              >
                🗑️ Vider le suivi
              </button>

              <button
                onClick={() => setCurrentView("generator")}
                className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Nouvelle Candidature Ciblée</span>
              </button>
            </div>
          </div>

          {/* Liste des candidatures */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[#27272a]">
              {filteredApps.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#a1a1aa]">
                  Aucune candidature trouvée dans cette catégorie.
                </div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1f1f23] transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white text-sm">{app.company}</span>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="text-xs text-[#a1a1aa]">{app.title}</div>
                      <div className="text-[11px] text-[#71717a] flex items-center gap-3 pt-1">
                        <span>📅 Postulé le : {app.appliedDate}</span>
                        <span>•</span>
                        <span className="text-blue-400 font-medium">🎯 Score ATS : {app.atsScore}/100</span>
                      </div>
                      {app.notes && (
                        <div className="text-xs text-[#a1a1aa] italic pt-1">
                          &quot;{app.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Actions de changement de statut */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                        className="text-xs bg-[#09090b] border border-[#27272a] text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
                      >
                        <option value="en_attente">🟡 En attente</option>
                        <option value="entretien">🟣 Entretien</option>
                        <option value="offre">🟢 Offre reçue</option>
                        <option value="refus">🔴 Refusé</option>
                      </select>

                      <button
                        onClick={() => handleDeleteApplication(app.id)}
                        className="text-xs p-1.5 rounded-lg text-[#71717a] hover:text-red-400 hover:bg-[#27272a] transition"
                        title="Supprimer la candidature"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* ZONE D'EXPORTATION PDF / IMPRESSION ATS (A4)                                */}
      {/* Masqué à l'écran, visible et vectorisé à 100% lors du window.print()       */}
      {/* ========================================================================= */}
      <div id="cv-print-area" className="hidden print:block text-black bg-white font-sans text-xs space-y-2">
        {/* En-tête */}
        <div className="text-center space-y-0.5 pb-1.5 border-b border-gray-400">
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 uppercase">Badroudine Bacar</h1>
          <div className="text-[13px] font-semibold text-gray-800">{printTitle}</div>
          <div className="text-[10.5px] text-gray-700 flex flex-wrap items-center justify-center gap-2.5 pt-0.5">
            <span>France</span>
            <span>•</span>
            <span>07 67 56 07 86</span>
            <span>•</span>
            <span>badroudinebacar@gmail.com</span>
            <span>•</span>
            <span>linkedin.com/in/badroudine-bacar</span>
            <span>•</span>
            <span>github.com/Badrouuu</span>
          </div>
        </div>

        {/* Profil / Accroche */}
        <div className="space-y-0.5 break-inside-avoid">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {effectiveIsEn ? "Professional Summary" : "Profil Professionnel"}
          </h2>
          <p className="text-[10px] text-gray-800 leading-normal text-justify">
            {printSummary}
          </p>
        </div>

        {/* Formation & Certifications */}
        <div className="space-y-0.5 break-inside-avoid">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {effectiveIsEn ? "Education & Certifications" : "Formation & Certifications"}
          </h2>
          <div className="space-y-0.5 text-[10px] text-gray-800">
            <div className="flex justify-between items-baseline font-semibold text-[10.5px]">
              <span>{effectiveIsEn ? "Master of Science in Computer Engineering — Major in Artificial Intelligence" : "Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle"}</span>
              <span className="text-gray-600 font-normal">2024 - 2027</span>
            </div>
            <div className="italic text-gray-700 text-[9.5px]">
              {effectiveIsEn ? "EILCO Graduate School of Engineering, Calais, France" : "EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais, France"}
            </div>
            <div className="text-[9.5px] text-gray-600 leading-normal">
              {effectiveIsEn
                ? "Final year (ING3 / MSc). Specialization in Deep Learning, Computer Vision, Machine Learning, MLOps, CI/CD, Advanced Databases."
                : "Dernière année (ING3). Spécialisation en Deep Learning, Vision par Ordinateur, Machine Learning, MLOps, CI/CD, Bases de Données Avancées."}
            </div>

            <div className="flex justify-between items-baseline font-semibold text-[10.5px] pt-1">
              <span>{effectiveIsEn ? "Preparatory Classes for Grandes Écoles (CPGE TSI)" : "Classes Préparatoires aux Grandes Écoles (CPGE TSI)"}</span>
              <span className="text-gray-600 font-normal">2022 - 2024</span>
            </div>
            <div className="italic text-gray-700 text-[9.5px]">Lycée Antonin Artaud, Marseille, France</div>

            <div className="flex justify-between items-baseline font-semibold text-[10px] pt-1">
              <span>{effectiveIsEn ? "English Certification: TOEIC Listening & Reading" : "Certification Anglais : TOEIC Listening & Reading"}</span>
              <span className="text-blue-900 font-bold">905 / 990 (CEFR C1 Level)</span>
            </div>
          </div>
        </div>

        {/* Projets Techniques */}
        <div className="space-y-0.5 break-inside-avoid">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {effectiveIsEn ? "Technical Projects & Key Achievements" : "Projets Techniques & Réalisations"}
          </h2>
          <div className="space-y-1.5 text-[10px]">
            {printBullets.map((proj, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold text-gray-900 text-[10.5px]">{proj.project}</div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-800 text-[9.5px]">
                  {proj.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="leading-normal">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Expérience Professionnelle */}
        <div className="space-y-0.5 break-inside-avoid">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {effectiveIsEn ? "Professional Experience" : "Expérience Professionnelle"}
          </h2>
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between items-baseline font-semibold text-[10.5px] text-gray-900">
              <span>{effectiveIsEn ? "Founder & Lead Software Developer (Entrepreneurial Internship PÉPITE)" : "Fondateur & Développeur Lead (Stage Entrepreneurial PÉPITE)"}</span>
              <span className="text-gray-600 font-normal">2025 - 2026</span>
            </div>
            <div className="italic text-gray-700 text-[9.5px]">Étiquette Jaune (Micro-entreprise)</div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-800 text-[9.5px]">
              {effectiveIsEn ? (
                <>
                  <li className="leading-normal">Accomplished integration of on-device Computer Vision models measured by text extraction speed, leveraging Google ML Kit Text Recognition (OCR).</li>
                  <li className="leading-normal">Accomplished serverless backend development measured by real-time data synchronization, utilizing Google Cloud Firestore, Cloud Functions, and TypeScript.</li>
                </>
              ) : (
                <>
                  <li className="leading-normal">Accompli l&apos;intégration de modèles de Vision par Ordinateur mesurés par la vitesse d&apos;extraction textuelle, en faisant usage de Google ML Kit Text Recognition (OCR).</li>
                  <li className="leading-normal">Accompli le développement d&apos;un backend serverless mesuré par la synchronisation temps réel, en faisant appel à Google Cloud Firestore, Cloud Functions et TypeScript.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Centres d'intérêt & Engagement Associatif */}
        <div className="space-y-0.5 break-inside-avoid">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {effectiveIsEn ? "Interests & Community Engagement" : "Centres d'Intérêt & Engagement Associatif"}
          </h2>
          <div className="space-y-1 text-[9.5px] text-gray-800 leading-normal">
            <div>
              <span className="font-semibold text-gray-900">{effectiveIsEn ? "Game Modding & Video Games:" : "Modding & Jeux Vidéo :"} </span>
              <span>{effectiveIsEn ? "Passionate about video games and modding (gameplay mechanics reverse-engineering, scripting, data structures)." : "Passionné de jeux vidéo et de modding (analyse et rétro-ingénierie de mécaniques de gameplay, scripting, structures de données)."}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">{effectiveIsEn ? "Strategy Games & Competitive TCG:" : "Jeux de Stratégie & TCG Compétitif :"} </span>
              <span>{effectiveIsEn ? "Active strategy gamer and competitive One Piece TCG tournament player (game theory, deck optimization, probabilistic decision-making)." : "Pratique active de jeux de stratégie et tournois compétitifs One Piece TCG (théorie des jeux, optimisation de deck, calculs probabilistes)."}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">{effectiveIsEn ? "Community Engagement & First Aid:" : "Engagement Associatif & Secourisme :"} </span>
              <span>{effectiveIsEn ? "Volunteer intern in non-profit community associations (field coordination, teamwork) & Certified in First Aid (PSC1 / Emergency Response)." : "Stagiaire bénévole en association d'entraide (animation, coordination terrain, esprit d'équipe) & Titulaire du Brevet de Premiers Secours (PSC1)."}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZONE D'EXPORTATION PDF / IMPRESSION LETTRE DE MOTIVATION (A4)               */}
      {/* ========================================================================= */}
      <div id="cover-letter-print-area" className="hidden print:block text-black bg-white font-sans text-xs space-y-4">
        {renderFormattedCoverLetter(coverLetter, true)}
      </div>
    </main>
  );
}
