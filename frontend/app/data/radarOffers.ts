export interface RadarJobOffer {
  id: string;
  company: string;
  title: string;
  location: string;
  country: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne" | "International";
  countryFlag: string;
  workplace: "Présentiel" | "Hybride";
  compensation?: string;
  skills: string[];
  url: string;
  description: string;
  postedAgo?: string;
  isFresh?: boolean;
  timestamp?: number;
  applicantsCount?: number;
  language?: "fr" | "en" | "de" | "nl" | "other";
  priorityScore?: number;
}

export function getOfferTimestamp(offer: RadarJobOffer): number {
  if (offer.timestamp && offer.timestamp > 0) return offer.timestamp;
  const raw = (offer.postedAgo || "").toLowerCase().trim();
  const now = Date.now();
  if (!raw) return now - 7 * 24 * 3600 * 1000;

  if (raw.includes("min")) {
    const m = raw.match(/(\d+)/);
    const mins = m ? parseInt(m[1], 10) : 15;
    return now - mins * 60 * 1000;
  }
  if (raw.includes("heure") || raw.includes("hour") || raw.includes(" h")) {
    const h = raw.match(/(\d+)/);
    const hours = h ? parseInt(h[1], 10) : 1;
    return now - hours * 3600 * 1000;
  }
  if (raw.includes("hier") || raw.includes("yesterday") || raw.includes("1 jour") || raw.includes("1 day")) {
    return now - 24 * 3600 * 1000;
  }
  if (raw.includes("jour") || raw.includes("day")) {
    const d = raw.match(/(\d+)/);
    const days = d ? parseInt(d[1], 10) : 2;
    return now - days * 24 * 3600 * 1000;
  }
  if (raw.includes("sem") || raw.includes("week")) {
    const w = raw.match(/(\d+)/);
    const weeks = w ? parseInt(w[1], 10) : 1;
    return now - weeks * 7 * 24 * 3600 * 1000;
  }
  return now - 7 * 24 * 3600 * 1000;
}

/**
 * Détecte la langue principale d'une offre d'emploi de manière déterministe (0 token).
 * Renvoie "fr" | "en" | "de" | "nl" | "other".
 */
export function detectOfferLanguage(
  title: string = "",
  description: string = ""
): "fr" | "en" | "de" | "nl" | "other" {
  const combined = `${title} ${description}`.toLowerCase();

  // 1. Détection de marqueurs typiques en allemand
  const deMarkers = [
    /\b(und|oder|für|mit|im|vom|beim|über|durch|als|nach|zur|zum)\b/g,
    /\b(ihre aufgaben|deine aufgaben|aufgaben|tätigkeiten|wir suchen|wir bieten|das bringen sie mit|das bringst du mit)\b/g,
    /\b(anforderungen|voraussetzungen|qualifikationen|kenntnisse|erfahrungen|abschlussarbeit|praktikum|praktikant|werkstudent)\b/g,
    /\b(standort|ab sofort|vollzeit|teilzeit|studium|bewerbung|deutschkenntnisse|fließend deutsch|sehr gute deutschkenntnisse)\b/g,
    /\b(m\/w\/d|d\/m\/w|m\/w\/x)\b/g,
  ];

  // 2. Détection de marqueurs typiques en néerlandais (Belgique néerlandophone / Pays-Bas)
  const nlMarkers = [
    /\b(en|van|het|voor|met|op|bij|naar|over|als|om|aan|deze)\b/g,
    /\b(wij zoeken|jouw profiel|ons aanbod|functieomschrijving|wat ga je doen|wat breng je mee|solliciteer)\b/g,
    /\b(ervaring met|kennis van|vaardigheden|opleiding|stagiair|afstudeerstage|nederlands|nederlandstalig)\b/g,
  ];

  // 3. Détection de marqueurs typiques en français
  const frMarkers = [
    /\b(le|la|les|des|dans|pour|avec|sur|par|une|votre|notre|cette|sont)\b/g,
    /\b(missions|profil recherché|vos missions|ce que nous offrons|qui êtes-vous|votre profil)\b/g,
    /\b(stage|stagiaire|pfe|fin d'études|école d'ingénieurs|bac\+5|master 2|alternance)\b/g,
    /\b(compétences|connaissances|recherche|développement|expérience)\b/g,
  ];

  // 4. Détection de marqueurs typiques en anglais
  const enMarkers = [
    /\b(the|and|with|for|about|this|from|your|our|their|will|have|been)\b/g,
    /\b(responsibilities|qualifications|requirements|what you'll do|what we offer|about the role|key responsibilities)\b/g,
    /\b(internship|intern|trainee|master's thesis|student|working student|full-time|part-time)\b/g,
    /\b(skills|experience|degree in|proficiency|fluency in english|fluent in english)\b/g,
  ];

  let deScore = 0;
  for (const regex of deMarkers) {
    const matches = combined.match(regex);
    if (matches) deScore += matches.length;
  }

  let nlScore = 0;
  for (const regex of nlMarkers) {
    const matches = combined.match(regex);
    if (matches) nlScore += matches.length;
  }

  let frScore = 0;
  for (const regex of frMarkers) {
    const matches = combined.match(regex);
    if (matches) frScore += matches.length;
  }

  let enScore = 0;
  for (const regex of enMarkers) {
    const matches = combined.match(regex);
    if (matches) enScore += matches.length;
  }

  // Si fort signal allemand prédominant
  if (deScore >= 3 && deScore > enScore && deScore > frScore) {
    return "de";
  }
  if (/\b(deutsch\s*(c1|c2|fließend|muttersprache)|german\s*(required|fluent|mandatory)|sehr gute deutschkenntnisse)\b/i.test(combined) && deScore >= 2) {
    return "de";
  }

  // Si fort signal néerlandais prédominant
  if (nlScore >= 3 && nlScore > enScore && nlScore > frScore) {
    return "nl";
  }

  // Si signal français
  if (frScore > enScore && frScore >= 2) {
    return "fr";
  }

  // Si signal anglais
  if (enScore >= frScore && enScore >= 2) {
    return "en";
  }

  // En cas de texte succinct (titre seul)
  const titleLower = title.toLowerCase();
  if (/\b(stage|pfe|ingénieur|alternant|alternance)\b/i.test(titleLower)) return "fr";
  if (/\b(praktikum|praktikant|werkstudent|abschlussarbeit)\b/i.test(titleLower)) return "de";
  if (/\b(stagiair|afstudeerstage)\b/i.test(titleLower)) return "nl";
  if (/\b(intern|internship|trainee|thesis|engineer|analyst|developer|scientist)\b/i.test(titleLower)) return "en";

  return enScore >= frScore ? "en" : "fr";
}

/**
 * Vérifie si l'offre exige expressément la maîtrise d'une langue non maîtrisée par le candidat
 * (ex: Allemand ou Néerlandais obligatoire). Badroudine est Français natif et Anglais certifié C1 (905/990).
 */
export function requiresNonEnFrLanguage(combinedText: string): boolean {
  const lower = combinedText.toLowerCase();
  const requiresGerman =
    /\b(fluent in german|german is required|german language skills required|sehr gute deutschkenntnisse|deutschkenntnisse erforderlich|fließend deutsch|deutsch auf c1|c1 deutsch)\b/i.test(
      lower
    );
  const requiresDutch =
    /\b(fluent in dutch|dutch is required|nederlands vereist|vloeiend nederlands|goede kennis van het nederlands)\b/i.test(
      lower
    );
  return requiresGerman || requiresDutch;
}

/**
 * Extrait ou estime le nombre de postulants actuels sur une offre
 */
export function extractApplicantsCount(
  rawText: string = "",
  postedAgo?: string
): { count: number; isEarly: boolean } {
  const lower = rawText.toLowerCase();

  // 1. Mentions explicites
  if (lower.includes("be an early applicant") || lower.includes("premier postulant") || lower.includes("early applicant")) {
    return { count: 5, isEarly: true };
  }

  const underMatch = lower.match(/(?:under|moins de)\s*(\d+)\s*(?:applicants|candidats|postulants)/);
  if (underMatch) {
    const val = parseInt(underMatch[1], 10);
    return { count: Math.max(1, Math.round(val / 2)), isEarly: val <= 25 };
  }

  const numMatch = lower.match(/(\d+)\s*(?:applicants|candidats|postulants|bewerbungen)/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    return { count: val, isEarly: val <= 25 };
  }

  // 2. Estimation selon la fraîcheur temporelle si non précisé
  const ago = (postedAgo || "").toLowerCase();
  if (ago.includes("min") || ago.includes("quelques")) {
    return { count: 4, isEarly: true }; // Moins de 10 candidats
  }
  if (ago.includes("heure") || ago.includes("hour") || ago.includes(" h")) {
    const hMatch = ago.match(/(\d+)/);
    const hours = hMatch ? parseInt(hMatch[1], 10) : 2;
    const est = Math.min(20, Math.max(5, hours * 3));
    return { count: est, isEarly: est <= 25 };
  }
  if (ago.includes("hier") || ago.includes("yesterday") || ago.includes("1 jour") || ago.includes("1 day")) {
    return { count: 18, isEarly: true };
  }
  if (ago.includes("2 jour") || ago.includes("2 day") || ago.includes("3 jour") || ago.includes("3 day")) {
    return { count: 32, isEarly: false };
  }
  if (ago.includes("sem") || ago.includes("week")) {
    return { count: 65, isEarly: false };
  }

  return { count: 40, isEarly: false };
}

export interface OfferPriorityResult {
  score: number;
  isEligible: boolean;
  rejectionReason?: string;
  detectedLang: "fr" | "en" | "de" | "nl" | "other";
  applicantsCount: number;
  isEarly: boolean;
  isUltraFresh: boolean;
  priorityBadges: string[];
}

/**
 * Calcule le score de priorité d'une offre pour l'Auto-Pilot :
 * Favorise massivement les offres ultra-fraîches (< 24h) et avec très peu de candidats (< 10-25).
 * Élimine d'office les offres non rédigées en Français ou en Anglais.
 */
export function calculateOfferPriority(offer: RadarJobOffer): OfferPriorityResult {
  const title = offer.title || "";
  const desc = offer.description || "";
  const combined = `${title} ${desc}`;

  // 1. Détection de langue
  const detectedLang = offer.language || detectOfferLanguage(title, desc);

  // Rejet si non anglais et non français
  if (detectedLang !== "fr" && detectedLang !== "en") {
    return {
      score: -9999,
      isEligible: false,
      rejectionReason: `Offre en ${detectedLang === "de" ? "allemand" : detectedLang === "nl" ? "néerlandais" : "langue étrangère"}. Candidature réservée aux offres en FR ou EN.`,
      detectedLang,
      applicantsCount: 50,
      isEarly: false,
      isUltraFresh: false,
      priorityBadges: [],
    };
  }

  // Rejet si exigence de langue non maîtrisée
  if (requiresNonEnFrLanguage(combined)) {
    return {
      score: -9999,
      isEligible: false,
      rejectionReason: "Exige la maîtrise de l'allemand ou du néerlandais. Profil candidat : Français natif, Anglais C1.",
      detectedLang,
      applicantsCount: 50,
      isEarly: false,
      isUltraFresh: false,
      priorityBadges: [],
    };
  }

  // Rejet si France (Mobilité EILCO)
  const locLower = (offer.location || "").toLowerCase();
  const countryLower = (offer.country || "").toLowerCase();
  if (
    countryLower === "france" ||
    locLower.includes("paris") ||
    locLower.includes("lyon") ||
    locLower.includes("lille") ||
    locLower.includes("france")
  ) {
    return {
      score: -9999,
      isEligible: false,
      rejectionReason: "Localisé en France. Incompatible avec l'obligation de mobilité internationale EILCO.",
      detectedLang,
      applicantsCount: 50,
      isEarly: false,
      isUltraFresh: false,
      priorityBadges: [],
    };
  }

  // Rejet si 100% Full Remote (Convention EILCO)
  const is100Remote =
    /\b(100%\s*(télétravail|remote)|fully[- ]?remote|remote[- ]?only|100%\s*à distance)\b/i.test(desc.toLowerCase()) &&
    !/\b(pas de|no|not)\b/i.test(desc.toLowerCase());
  if (is100Remote) {
    return {
      score: -9999,
      isEligible: false,
      rejectionReason: "100% Full Remote. La convention EILCO impose une présence physique (Hybride ou Sur site).",
      detectedLang,
      applicantsCount: 50,
      isEarly: false,
      isUltraFresh: false,
      priorityBadges: [],
    };
  }

  // 2. Métriques de candidats et fraîcheur
  const { count: applicantsCount, isEarly } =
    typeof offer.applicantsCount === "number"
      ? { count: offer.applicantsCount, isEarly: offer.applicantsCount <= 25 }
      : extractApplicantsCount(desc, offer.postedAgo);

  const rawAgo = (offer.postedAgo || "").toLowerCase();
  const isUltraFresh =
    offer.isFresh ||
    rawAgo.includes("min") ||
    rawAgo.includes(" h") ||
    rawAgo.includes("hour") ||
    rawAgo.includes("hier") ||
    rawAgo.includes("1 jour") ||
    rawAgo.includes("1 day");

  // 3. Calcul du score de priorité
  let score = 100;
  const priorityBadges: string[] = [];

  // A. Bonus Fraîcheur
  if (rawAgo.includes("min")) {
    score += 150;
    priorityBadges.push("🔥 Moins de 30 min");
  } else if (rawAgo.includes(" h") || rawAgo.includes("hour")) {
    score += 120;
    priorityBadges.push("⚡ Moins de 24h");
  } else if (rawAgo.includes("hier") || rawAgo.includes("1 jour") || rawAgo.includes("yesterday")) {
    score += 90;
    priorityBadges.push("✨ Publié hier");
  } else if (rawAgo.includes("2 jour") || rawAgo.includes("3 jour")) {
    score += 50;
    priorityBadges.push("📅 Moins de 3 jours");
  } else {
    score += 10;
  }

  // B. Bonus Faible Concurrence (< 10 ou < 25 candidats)
  if (applicantsCount <= 10) {
    score += 130;
    priorityBadges.push(`🎯 Très peu de candidats (${applicantsCount})`);
  } else if (applicantsCount <= 25) {
    score += 80;
    priorityBadges.push(`🚀 Early Applicant (${applicantsCount} postulants)`);
  } else if (applicantsCount <= 50) {
    score += 30;
  } else if (applicantsCount > 100) {
    score -= 40;
  }

  // C. Pays prioritaires
  if (offer.country === "Suisse") {
    score += 25;
  } else if (offer.country === "Luxembourg") {
    score += 20;
  } else if (offer.country === "Allemagne" || offer.country === "Belgique") {
    score += 15;
  }

  // D. Mode de travail
  if (offer.workplace === "Hybride") {
    score += 10;
  }

  // E. Bonus Orientation : IA, ML & Computer Vision prioritaires (Full-Stack en soutien MLOps)
  const isVision =
    /\b(computer vision|machine vision|vision|image processing|opencv|yolo|segmentation|point cloud|detection|multimodal|ocr)\b/i.test(
      combined
    );
  const isAiMlCore =
    /\b(machine learning|deep learning|intelligence artificielle|artificial intelligence|ai|ml|nlp|llm|transformers|data science|reinforcement learning|neural)\b/i.test(
      combined
    );
  const titleLower = (offer.title || "").toLowerCase();
  const isPureWebFullStack =
    /\b(full[- ]?stack developer|fullstack web|frontend developer|front[- ]?end|react developer|node developer|angular|vuejs|web developer)\b/i.test(
      titleLower
    ) &&
    !isAiMlCore &&
    !isVision;

  if (isVision) {
    score += 85;
    priorityBadges.push("👁️ Machine Vision");
  } else if (isAiMlCore) {
    score += 65;
    priorityBadges.push("🧠 Cœur IA/ML");
  }

  // Si offre purement web sans IA, reléguer derrière les vraies opportunités IA
  if (isPureWebFullStack) {
    score -= 60;
  }

  // Badge langue certifié
  priorityBadges.push(detectedLang === "en" ? "🇬🇧 Anglais" : "🇫🇷 Français");

  return {
    score,
    isEligible: true,
    detectedLang,
    applicantsCount,
    isEarly,
    isUltraFresh,
    priorityBadges,
  };
}

export interface DeepSearchPortal {
  name: string;
  country: string;
  countryFlag: string;
  description: string;
  url: string;
  category: "Suisse" | "Luxembourg" | "Belgique" | "Allemagne" | "International";
}

export const DEEP_SEARCH_PORTALS: DeepSearchPortal[] = [
  {
    name: "LinkedIn Suisse (Stage IA/ML - Frais < 7j)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Recherche booléenne ciblée avec filtre de fraîcheur (< 7 jours) et tri par date : ('intern' OR 'stage' OR 'PFE') AND ('Machine Learning' OR 'AI').",
    url: "https://www.linkedin.com/jobs/search/?keywords=%28%22intern%22%20OR%20%22stage%22%20OR%20%22PFE%22%29%20AND%20%28%22Machine%20Learning%22%20OR%20%22Artificial%20Intelligence%22%20OR%20%22AI%22%29&location=Switzerland&sortBy=DD&f_TPR=r604800",
    category: "Suisse",
  },
  {
    name: "SwissDevJobs (Python / AI Suisse)",
    country: "Suisse",
    countryFlag: "🇨🇭",
    description: "Le portail tech n°1 en Suisse. Filtre direct sur les offres récentes Python, Machine Learning et Data Science.",
    url: "https://swissdevjobs.ch/jobs/all/python",
    category: "Suisse",
  },
  {
    name: "LinkedIn Luxembourg (Stage Data / IA - Frais < 7j)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Flux en direct des opportunités récentes (< 7 jours) en Machine Learning, Data et IA au Luxembourg.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22Data%22+OR+%22AI%22%29&location=Luxembourg&sortBy=DD&f_TPR=r604800",
    category: "Luxembourg",
  },
  {
    name: "LinkedIn Belgique (Stage ML Bruxelles - Frais < 7j)",
    country: "Belgique",
    countryFlag: "🇧🇪",
    description: "Recherche directe sur les stages en Machine Learning, Computer Vision et NLP à Bruxelles postés cette semaine.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22AI%22%29&location=Brussels&sortBy=DD&f_TPR=r604800",
    category: "Belgique",
  },
  {
    name: "LinkedIn Allemagne (Stage ML/IA Munich - Frais < 7j)",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    description: "Flux de stages de recherche et ingénierie IA à Munich (BMW, BCG X, SIXT, Google) publiés dans les 7 derniers jours.",
    url: "https://www.linkedin.com/jobs/search/?keywords=internship+%28%22Machine+Learning%22+OR+%22AI%22%29&location=Munich&sortBy=DD&f_TPR=r604800",
    category: "Allemagne",
  },
  {
    name: "Moovijob Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Portail officiel des stages au Luxembourg. Filtre sur les postes Data, Intelligence Artificielle et Cloud.",
    url: "https://www.moovijob.com/recherche-emploi/luxembourg?keywords=stage+intelligence+artificielle",
    category: "Luxembourg",
  },
  {
    name: "Jobup.ch (Suisse Romande)",
    country: "Suisse (Genève & Vaud)",
    countryFlag: "🇨🇭",
    description: "Le portail n°1 d'emploi en Suisse romande (Genève, Lausanne). Filtre direct sur les offres Machine Learning, Data et IA.",
    url: "https://www.jobup.ch/fr/emplois/?term=Machine%20Learning%20Stage",
    category: "Suisse",
  },
  {
    name: "CERN Technical Students Programme",
    country: "Suisse (Genève)",
    countryFlag: "🔬",
    description: "Programme officiel de stages techniques (4 à 12 mois) au CERN en calcul distribué et IA appliquée.",
    url: "https://careers.cern/students",
    category: "Suisse",
  },
  {
    name: "Ferrero Careers (Bettembourg / Luxembourg)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    description: "Portail officiel de recrutement Ferrero (All Eyes on Me) pour le hub de Bettembourg / Findel (stages Data, IT, Supply Chain & IA).",
    url: "https://alleyesonme.jobs/de/jobs/location/bettembourg?degree=DOCTORATE%2CBACHELOR%2CMASTER%2CVOCATIONAL%2CNONE%2CSECONDARY&exp=content&workplace=ON_SITE%2CREMOTE",
    category: "Luxembourg",
  },
];

export const RADAR_JOB_OFFERS: RadarJobOffer[] = [
  {
    id: "distalmotion-epfl-edge-cv",
    company: "Distalmotion (EPFL)",
    title: "Edge AI & Computer Vision Intern – Real-Time Tracking & Deep Learning",
    location: "Lausanne (Vaud), Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Présentiel",
    compensation: "4,200 CHF / mois",
    skills: ["Python", "Computer Vision", "Machine Vision", "PyTorch", "OpenCV", "YOLO", "Edge AI", "TensorRT"],
    url: "https://www.distalmotion.com/careers",
    description: `Distalmotion (EPFL Innovation Park) - Lausanne, Switzerland.
Role: Edge AI & Computer Vision Intern (6 months PFE dès mars/avril 2027).
Missions :
- Développer et optimiser des modèles de Vision par Ordinateur et Deep Learning temps réel pour le suivi d'instruments et la segmentation vidéo sous PyTorch et OpenCV.
- Quantifier et accélérer les réseaux de neurones (YOLO, CNNs, Transformers visuels) sur cibles embarquées NVIDIA Jetson via TensorRT.
- Concevoir des pipelines de prétraitement et d'augmentation d'images médicales à haute cadence.
Profil : Élève-ingénieur en dernière année (Bac+5) spécialisé en Vision par Ordinateur, IA ou Robotique. Maîtrise de Python, OpenCV, PyTorch. Anglais courant.`,
    postedAgo: "Il y a 2 heures",
    isFresh: true,
    applicantsCount: 4,
    language: "fr",
  },
  {
    id: "leica-geosystems-machine-vision",
    company: "Leica Geosystems",
    title: "Machine Vision & 3D Spatial Perception Intern",
    location: "Heerbrugg (Saint-Gall), Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "3,900 CHF / mois",
    skills: ["Python", "Machine Vision", "Computer Vision", "OpenCV", "PyTorch", "3D Point Clouds", "CNNs"],
    url: "https://leica-geosystems.com/about-us/careers",
    description: `Leica Geosystems (Hexagon Group) - Heerbrugg, Switzerland.
Role: Machine Vision & 3D Spatial Perception Intern (6 months PFE).
Tasks:
- Research, prototype and benchmark machine vision algorithms for automated surface defect inspection, visual odometry, and spatial perception.
- Implement deep learning architectures with PyTorch and OpenCV for feature extraction, semantic segmentation and point cloud processing.
- Containerize inference pipelines and integrate APIs for embedded sensor integration.
Qualifications: Master's student in Computer Vision, Machine Learning, or Robotics. Strong knowledge of Python, NumPy, OpenCV, and PyTorch. Fluent in English.`,
    postedAgo: "Il y a 4 heures",
    isFresh: true,
    applicantsCount: 6,
    language: "en",
  },
  {
    id: "roche-ai-metadata",
    company: "Roche",
    title: "Internship - AI Metadata Augmentation & Machine Learning",
    location: "Bâle, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "3,800 CHF / mois",
    skills: ["Python", "Machine Learning", "NLP", "FastAPI", "Metadata Augmentation", "PyTorch"],
    url: "https://jobs.roche.com/global/en/search-results?keywords=AI%20Intern",
    description: `F. Hoffmann-La Roche AG - Bâle, Suisse.
Poste : Internship - AI Metadata Augmentation (Stage PFE 6 mois).
Missions :
- Développer des modèles de NLP et de Machine Learning pour l'enrichissement sémantique de métadonnées scientifiques et biomédicales.
- Concevoir des pipelines d'extraction automatique et d'alignement d'entités avec PyTorch et HuggingFace Transformers.
- Exposer des APIs Python performantes sous FastAPI et conteneuriser les microservices sous Docker.
Profil : Étudiant en dernière année d'école d'ingénieurs (Bac+5 / Master 2) spécialisé en IA ou Data Science. Anglais courant.`,
    postedAgo: "Il y a 1 heure",
    isFresh: true,
  },
  {
    id: "nvidia-genai-algorithms",
    company: "NVIDIA",
    title: "GenAI Algorithms Intern – Model Optimization for Inference",
    location: "Zurich, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "5,500 CHF / mois",
    skills: ["PyTorch", "TensorRT", "CUDA", "LLMs", "Quantization", "C++", "Python"],
    url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=intern",
    description: `NVIDIA AI Research & Engineering Campus - Zurich, Switzerland.
Role: GenAI Algorithms Intern – Model Optimization for Inference (6 months PFE).
Responsibilities:
- Accelerate large language models (LLMs) and diffusion architectures using TensorRT-LLM and custom CUDA kernels.
- Implement post-training quantization (INT8, FP8, AWQ) and benchmark throughput vs perplexity.
- Collaborate with AI algorithm researchers to prototype next-generation generative AI models.
Qualifications: Master's student in Computer Science, Machine Learning, or Electrical Engineering. Proficient in PyTorch, C++, and Python.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "bmw-munich-causal-ml",
    company: "BMW Group",
    title: "Thesis / Master Intern: Causal ML for Prescriptive Decision Support",
    location: "Munich, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,200 € / mois",
    skills: ["Python", "Causal ML", "PyTorch", "Decision Theory", "NumPy", "Pandas"],
    url: "https://www.bmwgroup.jobs/de/en/jobs.html?location=Munich&jobField=Research%20and%20Development",
    description: `BMW Group Tech Office - Munich, Germany.
Role: Master's Thesis / Internship: Causal ML for Prescriptive Decision Support in Automotive Systems (6 months PFE).
Tasks:
- Research and develop causal inference and machine learning algorithms for prescriptive maintenance and decision modeling.
- Implement statistical and deep learning pipelines in Python (PyTorch, EconML, DoWhy).
- Validate algorithmic decisions on large-scale fleet telemetry datasets.
Profile: Master's student in AI, Computer Science, or Mathematics. Strong mathematical grounding and Python skills.`,
    postedAgo: "Il y a 6 heures",
    isFresh: true,
  },
  {
    id: "deloitte-lux-agentic-ai",
    company: "Deloitte Luxembourg",
    title: "Intelligent Automation & Agentic AI Trainee (PFE - Promo 2027)",
    location: "Luxembourg (Cloche d'Or)",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Hybride",
    compensation: "2,400 € / mois",
    skills: ["Python", "Agentic AI", "LLMs", "RAG", "FastAPI", "Docker", "Cloud"],
    url: "https://careers.deloitte.lu/job-search.html?keyword=AI",
    description: `Deloitte Luxembourg Innovation Hub - Cloche d'Or, Luxembourg.
Poste : Intelligent Automation & Agentic AI Trainee (Stage PFE 6 mois dès début 2027).
Missions :
- Participer à la conception et au déploiement d'architectures agentiques multi-agents basées sur des LLMs et du RAG.
- Développer des connecteurs d'automatisation intelligente en Python avec FastAPI et orchestrateurs de workflow.
- Contribuer à la fiabilisation des réponses et à la suppression des hallucinations via des techniques de Few-Shot Prompting.
Profil : Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5). Solides bases en Python, API REST et architecture logicielle.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "list-lux-multimodal-vision",
    company: "LIST (Luxembourg Institute of Science and Technology)",
    title: "Internship: Multimodal Image Augmentation & Deep Learning",
    location: "Esch-sur-Alzette, Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Présentiel",
    compensation: "1,950 € / mois",
    skills: ["Computer Vision", "PyTorch", "Generative Models", "Diffusion", "OpenCV", "Python"],
    url: "https://jobs.list.lu/en/list/all",
    description: `Luxembourg Institute of Science and Technology (LIST) - Esch-sur-Alzette, Luxembourg.
Reference: INT-27066 INTERNSHIP - MULTIMODAL IMAGE AUGMENTATION.
Tasks:
- Investigate modern multimodal generative architectures (diffusion models, GANs) for synthetic image augmentation.
- Implement and benchmark deep learning vision models on high-resolution imaging benchmarks.
- Document and publish experimental results under Python and PyTorch.
Requirements: MSc / Final year engineering student in Computer Vision, Machine Learning, or Image Processing.`,
    postedAgo: "Hier",
    isFresh: true,
  },
  {
    id: "sixt-munich-applied-ai",
    company: "SIXT Tech Hub",
    title: "Praktikum / Master Thesis as Applied AI Engineer",
    location: "Munich, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,000 € / mois",
    skills: ["Python", "FastAPI", "Docker", "Machine Learning", "MLOps", "AWS"],
    url: "https://www.sixt.jobs/en/jobs/?keywords=AI",
    description: `SIXT Global Tech Hub - Munich, Germany.
Position: Praktikum as Applied AI Engineer (6 months PFE).
Missions:
- Build, optimize, and deploy end-to-end Machine Learning models serving real-time pricing and fleet allocation.
- Develop production-grade microservices in Python (FastAPI) containerized with Docker.
- Collaborate with platform engineers on CI/CD and MLOps monitoring pipelines.
Qualifications: Final year student in Computer Science or Artificial Intelligence. Strong knowledge of Python and modern cloud tooling.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "pictet-geneva-ai-innovation",
    company: "Banque Pictet & Cie",
    title: "Master's Thesis - AI Innovation & Quantitative Engineer Intern",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Hybride",
    compensation: "4,200 CHF / mois",
    skills: ["Python", "LLMs", "RAG", "FastAPI", "Docker", "NLP", "Time-Series"],
    url: "https://www.pictet.com/ch/fr/carrieres/offres-emploi",
    description: `Banque Pictet & Cie - Genève, Suisse.
Poste : Stage de Fin d'Études (6 mois) - Recherche & Ingénierie IA Innovation.
Missions principales :
- Développer des architectures RAG avancées pour l'analyse automatisée de flux sémantiques et de documents financiers.
- Évaluer et intégrer des modèles de langage (LLMs) pour l'extraction de signaux et de connaissances structurées.
- Déployer des microservices sécurisés avec FastAPI et Docker au sein de l'infrastructure de calcul interne.
Profil recherché : Élève-ingénieur en dernière année (Bac+5 spécialisation IA). Maîtrise de Python, NumPy, FastAPI et RAG.`,
    postedAgo: "Il y a 2 jours",
    isFresh: true,
  },
  {
    id: "bcg-x-ai-scientist",
    company: "BCG X",
    title: "Visiting Forward Deployed AI Scientist, Internship (PFE 6 months)",
    location: "Munich / Francfort, Allemagne",
    country: "Allemagne",
    countryFlag: "🇩🇪",
    workplace: "Hybride",
    compensation: "2,800 € / mois",
    skills: ["Python", "Deep Learning", "PyTorch", "Transformers", "RAG", "Docker"],
    url: "https://careers.bcg.com/bcg-x",
    description: `BCG X (Tech and Digital Build arm of Boston Consulting Group) - Germany.
Role: Visiting Forward Deployed AI Scientist, Internship (6 months PFE).
Tasks:
- Prototype, train, and deploy custom Deep Learning and Generative AI solutions for enterprise clients across Europe.
- Translate business problems into formal machine learning formulations (NLP, graph networks, predictive modeling).
- Write clean, modular, production-ready Python code and integrate models with REST APIs and container stacks.
Qualifications: Enrolled in Master's degree in Computer Science, Machine Learning, or Data Science. Fluent in English.`,
    postedAgo: "Il y a 1 heure",
    isFresh: true,
  },
  {
    id: "cern-technical-student",
    company: "CERN",
    title: "Technical Student Programme 2027 — Computing & Applied Machine Learning",
    location: "Genève, Suisse",
    country: "Suisse",
    countryFlag: "🇨🇭",
    workplace: "Présentiel",
    compensation: "3,407 CHF / mois (net) + allocation logement",
    skills: ["Python", "PyTorch", "C++", "HPC", "Data Pipelines", "Linux", "Docker"],
    url: "https://careers.cern/students",
    description: `Organisation européenne pour la recherche nucléaire (CERN) - Genève, Suisse.
Poste : Stage technique (PFE 6 mois) en Informatique & Machine Learning Appliqué.
Missions :
- Participer au développement d'algorithmes de traitement de données massives issues des détecteurs du LHC.
- Optimiser des modèles de Deep Learning (PyTorch) et de filtrage en temps réel sur des grappes de calcul haute performance (HPC).
- Contribuer à l'intégration de conteneurs Docker et à l'automatisation de pipelines MLOps.
Profil requis : Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5) en Informatique / IA.`,
    postedAgo: "Cette semaine",
    isFresh: false,
  },
  {
    id: "waymo-sim-ml",
    company: "Waymo",
    title: "2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure",
    location: "London, England, UK",
    country: "International",
    countryFlag: "🇬🇧",
    workplace: "Hybride",
    compensation: "£65,000 / an (pro-rata)",
    skills: ["Python", "C++", "Distributed Systems", "TensorFlow/Jax", "Autonomous Driving"],
    url: "https://careers.withwaymo.com/jobs?department=Research%20%26%20Machine%20Learning",
    description: `Waymo - London, UK.
Role: 2027 Summer Intern, MS/PhD, Sim-Realism ML Infrastructure.
Contribute to projects maintaining millions of multi-modal examples and PiBs of feature data. Python / C++ Coding skills and distributed systems knowledge.`,
    postedAgo: "Cette semaine",
    isFresh: false,
  },
  {
    id: "ferrero-lux-bettembourg",
    company: "Ferrero",
    title: "Data & AI / Digital Transformation Intern",
    location: "Bettembourg / Findel, Luxembourg",
    country: "Luxembourg",
    countryFlag: "🇱🇺",
    workplace: "Hybride",
    compensation: "2,100 € / mois",
    skills: ["Python", "Machine Learning", "Data Analytics", "PowerBI", "SQL", "LLMs"],
    url: "https://alleyesonme.jobs/de/jobs/location/bettembourg?degree=DOCTORATE%2CBACHELOR%2CMASTER%2CVOCATIONAL%2CNONE%2CSECONDARY&exp=content&workplace=ON_SITE%2CREMOTE",
    description: `Ferrero Headquarters & Tech Center - Bettembourg / Findel, Luxembourg.
Poste : Data & AI / Digital Transformation Intern (Stage PFE 6 mois).
Missions :
- Participer au développement et au déploiement de solutions d'intelligence artificielle et d'analytique avancée pour les opérations globales de Ferrero.
- Automatiser des pipelines de traitement de données sous Python et intégrer des modèles prédictifs et LLMs.
- Collaborer avec les équipes Supply Chain, IT et Digital Transformation sur des indicateurs de performance et des assistants intelligents.
Profil : Étudiant(e) en Master / Fin d'études ingénieur en Informatique, Data Science ou IA. Anglais courant.`,
    postedAgo: "Hier",
    isFresh: true,
  },
];
