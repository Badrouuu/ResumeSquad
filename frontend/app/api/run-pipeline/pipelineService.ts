const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface RunPipelineParams {
  jobText: string;
  jobTitle?: string;
  company?: string;
}

export interface RunPipelineResult {
  success: boolean;
  language: "en" | "fr";
  detectedCompany: string;
  detectedJobTitle: string;
  workplaceType: "full_remote" | "hybrid" | "onsite" | "unspecified";
  isFullRemote: boolean;
  remoteEvidenceQuote: string;
  remoteWarning: string;
  isInFrance: boolean;
  franceWarning: string;
  tailoredTitle: string;
  tailoredSummary: string;
  projectBullets: { project: string; bullets: string[] }[];
  versions: {
    en?: {
      tailoredTitle: string;
      tailoredSummary: string;
      projectBullets: { project: string; bullets: string[] }[];
      coverLetter: string;
    };
    fr?: {
      tailoredTitle: string;
      tailoredSummary: string;
      projectBullets: { project: string; bullets: string[] }[];
      coverLetter: string;
    };
  };
  coverLetter: string;
  atsScore: number;
  coverageRate: number;
  strategyNote?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    estimatedCostEur: number;
    model: string;
    isFreeTier: boolean;
  };
}

export async function runGeminiPipeline({
  jobText,
  jobTitle = "Ingénieur IA",
  company = "",
}: RunPipelineParams): Promise<RunPipelineResult> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Clé API GEMINI_API_KEY non configurée. Veuillez ajouter GEMINI_API_KEY dans vos variables d'environnement."
    );
  }

  const rawCompany = (company || "").trim();
  // Si company est vide, générique ou contient NeuroTech, on force à chaîne vide pour obliger l'IA à extraire le vrai nom depuis le texte
  const cleanCompany =
    rawCompany.toLowerCase().includes("neurotech") || rawCompany === "Entreprise Ciblée" ? "" : rawCompany;

  if (!jobText || jobText.length < 20) {
    throw new Error("Le texte de l'offre d'emploi est trop court (minimum 20 caractères).");
  }

  const systemPrompt = `Tu es l'escouade d'ingénieurs IA de ResumeSquad.
Ton objectif : Adapter le CV de Badroudine Bacar pour maximiser son score ATS et son alignement pour le poste visé, avec ZÉRO HALLUCINATION et un ton d'ingénierie direct.

=== CADRE STRICT DU TEMPLATE & INTÉGRITÉ DES DONNÉES (NE PAS ALTÉRER) ===
- Identité : Badroudine Bacar
- En-tête & Disponibilité obligatoire sous le titre : "Available March 2027 – 6-Month End-of-Studies Internship (PFE)" (ou "Disponible Mars 2027 – Stage de Fin d'Études (PFE) de 6 mois" en FR).
- Règle Typographique & Encodage : UTF-8 / ASCII strict. Éradication absolue du bug OCR remplaçant le "I" majuscule par un "l" minuscule (écrire TOUJOURS "AI", JAMAIS "Al").
- Formation & Certification TOEIC : TOEIC Listening & Reading — 905/990 (Niveau C1 Courant). Le score 905/990 doit rester STRICTEMENT à l'intérieur du bloc EDUCATION & CERTIFICATIONS.
- Expérience Professionnelle (Dates Exactes) : Remplacer les années vagues par les mois exacts : "Jun 2026 – Sep 2026" (ou "Juin 2026 – Sept 2026") pour "Founder & Lead Software Developer (Entrepreneurial Internship PÉPITE) | Étiquette Jaune".
- Bloc Compétences Techniques ATS (statique, directement après le Résumé Professionnel) :
  * Languages: Python, C#, TypeScript, SQL, PHP
  * AI & Machine Learning: PyTorch, TensorFlow Lite, Hugging Face, RAG Pipelines, Word2Vec / Gensim, Google ML Kit (OCR), LLM Orchestration
  * Backend, Cloud & DevOps: FastAPI, .NET Core, Docker, GCP (Firestore, Cloud Functions), Supabase, Git, CI/CD, Linux/WSL2

=== RÈGLES STRICTES DE GÉNÉRATION LLM (CHAMP D'ACTION RESTREINT) ===
La personnalisation dynamique par l'IA est STRICTEMENT RESTREINTE À :
(a) Le RÉSUMÉ PROFESSIONNEL (PROFESSIONAL SUMMARY) de 3 lignes maximum, ciblé sur l'offre.
(b) La SÉLECTION et l'ORDONNANCEMENT des 3 meilleurs projets parmi le pool vérifié ci-dessous.

- MOTS ET FORMULATIONS STRICTEMENT BANNIS (HARD NEGATIVE CONSTRAINTS) :
  Tu as l'INTERDICTION FORMELLE ET STRICTE d'écrire les mots ou motifs suivants :
  "Accomplished", "measured by", "significantly", "robust", "leveraged", "utilizing", "cutting-edge", "delve", "proven expertise".
  (Et en français : "Accompli", "mesuré par", "de manière significative", "robuste", "faisant levier", "utilisant", "à la pointe", "expertise avérée").

- STYLE D'INGÉNIERIE CONCRET (ACTIVE VERBS) :
  Utilise des verbes d'action directs et concrets : Engineered, Architected, Deployed, Built, Optimized, Integrated.
  N'écris JAMAIS "measured by [metric]" sans un chiffre réel. Si aucun benchmark chiffré n'est fourni, décris le mécanisme technique concret, l'architecture ou la contrainte résolue au lieu d'adjectifs vagues (ex: remplace "achieving low-latency inference" par "serving real-time cosine similarity queries via pre-loaded in-memory Word2Vec embeddings").

=== POOL DE PROJETS VÉRIFIÉS (SÉLECTIONNER STRICTEMENT LES TOP 3 ADAPTÉS AU POSTE) ===
1. "Antigravity — Autonomous LLM & RAG Pipeline" (Pour rôles AI/LLM/NLP) :
   - EN: "Engineered an automated job-matching and document-generation pipeline using Google Gemini API, structured JSON schemas, and few-shot prompting to enforce 100% LaTeX compilation compliance without hallucinations."
   - EN: "Built automated validation and context-extraction layers to parse unstructured job descriptions and align candidate profiles against target technical requirements."
   - FR: "Conception d'un pipeline automatisé de matching d'offres et de génération de documents sous Google Gemini API, schémas JSON stricts et Few-Shot Prompting, assurant 100% de compilation LaTeX sans hallucination."
   - FR: "Développement de couches de validation et d'extraction de contexte pour analyser les descriptions de postes et aligner le profil candidat sur les exigences techniques ciblées."
2. "VectorWord / Guess-What — Semantic Search Engine" (Pour rôles AI/Backend/Full-Stack) :
   - EN: "Architected a FastAPI inference backend computing cosine similarity across multilingual Word2Vec vector spaces with in-memory model caching."
   - EN: "Containerized and deployed the full-stack application using Docker, Railway, Next.js 15, and Supabase for real-time state synchronization."
   - FR: "Architecture d'un backend d'inférence FastAPI calculant la similarité cosinus sur des espaces vectoriels Word2Vec multilingues avec mise en cache mémoire des modèles."
   - FR: "Conteneurisation et déploiement de l'application sous Docker, Railway, Next.js 15 et Supabase pour la synchronisation temps réel de l'état."
3. "EILCO Project Management & Scheduling Platform (PIC)" (Pour rôles Data/Backend/Software) :
   - EN: "Designed the relational SQL database schema and backend ingestion pipeline to parse legacy Excel academic records and automate defense scheduling and grade exports."
   - FR: "Modélisation du schéma de base de données relationnelle SQL et du pipeline d'ingestion pour traiter les archives Excel et automatiser la planification des soutenances et l'export des notes."
4. "Draw1 — Full-Stack Card Game Simulator" (Pour rôles Software Engineering / .NET / Web) :
   - EN: "Built a RESTful API in C# (.NET Core, Entity Framework Core, SQLite) with Swagger documentation, integrated with an Angular frontend and Godot simulation client."
   - FR: "Développement d'une API RESTful en C# (.NET Core, Entity Framework Core, SQLite) avec documentation Swagger, interfacée avec un client de simulation Godot et un frontend Angular."

=== OFFRE D'EMPLOI CIBLÉE ===
Entreprise fournie : ${cleanCompany ? cleanCompany : "NON SPÉCIFIÉE (À extraire impérativement du texte de l'offre ci-dessous, ex: Luxembourg Institute of Science and Technology - LIST)"}
Intitulé de poste fourni : ${jobTitle}
Description / Missions :
${jobText.slice(0, 4500)}

=== IDENTIFICATION OBLIGATOIRE DE L'ENTREPRISE CIBLE (ZÉRO MÉLANGE) ===
- Analyse minutieusement le texte de l'offre d'emploi :
  * Identifie avec exactitude l'organisation qui recrute (ex: "Luxembourg Institute of Science and Technology (LIST)", "CERN", "Rolex", "Google", etc.).
  * Tu as l'INTERDICTION FORMELLE ET STRICTE de mentionner "NeuroTech Solutions" si l'annonce provient d'une autre entreprise ou organisation.
  * NE MÉLANGE JAMAIS deux entreprises différentes. L'offre s'adresse EXCLUSIVEMENT à l'entreprise qui recrute !
  * Renseigne UNIQUEMENT ce nom réel dans "detectedCompany".
  * Renseigne l'intitulé de poste précis extrait de l'annonce dans "detectedJobTitle".

=== RÈGLE DE LANGUE IMPÉRATIVE (BILINGUISME INTELLIGENT ET ZÉRO MÉLANGE) ===
- Si l'offre est en ANGLAIS -> La langue par défaut est "en".
- Si l'offre est en FRANÇAIS -> La langue par défaut est "fr".
- RÈGLE D'OR : INTERDICTION FORMELLE DE MÉLANGER ANGLAIS ET FRANÇAIS (ZÉRO "FRANGLAIS").
- Tu DOIS générer les champs racine dans la langue principale, ainsi que les deux versions complètes ("versions.en" et "versions.fr") :
  * "versions.en" : Résumé 3 lignes en anglais direct + top 3 projets vérifiés en anglais + lettre de motivation en anglais natif.
  * "versions.fr" : Résumé 3 lignes en français direct + top 3 projets vérifiés en français + lettre de motivation en français soigné.

=== RÈGLE CONTRAINTE CONVENTION DE STAGE : VÉRIFICATION DU TÉLÉTRAVAIL (FULL REMOTE) ===
- Convention EILCO INTERDIT le 100% Full Remote sans présence physique.
- "full_remote" : UNIQUEMENT si le texte stipule explicitement 100% à distance. Si hybride ou présentiel ou non précisé -> "isFullRemote": false.
- "remoteEvidenceQuote" : Citation exacte mot-à-mot du texte sur le mode de travail.

=== RÈGLE CONTRAINTE CONVENTION DE STAGE : MOBILITÉ INTERNATIONALE OBLIGATOIRE (HORS FRANCE) ===
- Stage PFE OBLIGATOIREMENT à l'étranger pour valider le diplôme EILCO.
- Si situé en France -> "isInFrance": true et alerte dans "franceWarning". Sinon -> "isInFrance": false.

=== LETTRE DE MOTIVATION (COVER LETTER) CIBLÉE ===
- Style exécutif sobre, zéro boilerplate, AUCUN emoji ni logo.
- 4 paragraphes percutants : Accroche & adéquation entreprise, réalisations concrètes chiffrées, rigueur CPGE TSI & diplôme EILCO, disponibilité mars 2027 (6 mois) et mobilité internationale.

Réponds STRICTEMENT au format JSON valide respectant ce schéma :
{
  "language": "en" | "fr",
  "detectedCompany": "Nom réel de l'entreprise cible identifié dans le texte (ou '${cleanCompany}')",
  "detectedJobTitle": "Intitulé précis du poste cible (ou '${jobTitle}')",
  "workplaceType": "full_remote" | "hybrid" | "onsite" | "unspecified",
  "isFullRemote": boolean,
  "remoteEvidenceQuote": "Extrait exact mot-à-mot tiré du texte de l'offre",
  "remoteWarning": "string",
  "isInFrance": boolean,
  "franceWarning": "string",
  "tailoredTitle": "string",
  "tailoredSummary": "string (3 lignes maximum)",
  "projectBullets": [
    {
      "project": "Nom exact parmi le pool vérifié",
      "bullets": ["Puce 1 sans mots bannis", "Puce 2 sans mots bannis"]
    }
  ],
  "versions": {
    "en": {
      "tailoredTitle": "string",
      "tailoredSummary": "string",
      "projectBullets": [
        {
          "project": "string",
          "bullets": ["string", "string"]
        }
      ],
      "coverLetter": "string"
    },
    "fr": {
      "tailoredTitle": "string",
      "tailoredSummary": "string",
      "projectBullets": [
        {
          "project": "string",
          "bullets": ["string", "string"]
        }
      ],
      "coverLetter": "string"
    }
  },
  "coverLetter": "string",
  "atsScore": 92,
  "coverageRate": 89.5,
  "strategyNote": "string"
}`;

  const FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
  ];

  let res: Response | null = null;
  let usedModel = FALLBACK_MODELS[0];

  for (const modelName of FALLBACK_MODELS) {
    usedModel = modelName;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });

      if (res.ok) {
        break;
      }

      if (res.status === 503 || res.status === 429) {
        console.warn(`[Gemini API] Modèle ${modelName} en surcharge (${res.status}). Bascule sur modèle de secours...`);
        await new Promise((r) => setTimeout(r, 600));
        continue;
      } else {
        const errText = await res.text();
        console.warn(`[Gemini API] Erreur ${res.status} sur ${modelName}: ${errText}`);
        continue;
      }
    } catch (fetchErr: any) {
      console.warn(`[Gemini API] Échec sur ${modelName}:`, fetchErr.message);
      continue;
    }
  }

  if (!res || !res.ok) {
    throw new Error("Échec de connexion à tous les modèles Gemini de secours. Veuillez réessayer dans quelques instants.");
  }

  const data = await res.json();
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidate) {
    throw new Error("Réponse vide du modèle d'IA");
  }

  // Extraction métadonnées de consommation de tokens officielle Gemini
  const usageMeta = data.usageMetadata || {};
  const promptTokens = Number(usageMeta.promptTokenCount || 0);
  const completionTokens = Number(usageMeta.candidatesTokenCount || 0);
  const totalTokens = Number(usageMeta.totalTokenCount || promptTokens + completionTokens);

  // Tarifs officiels Google Gemini Flash
  const estimatedCostUsd = (promptTokens * 0.075 + completionTokens * 0.3) / 1_000_000;
  const estimatedCostEur = estimatedCostUsd * 0.92;

  const parsedResult = JSON.parse(candidate);

  // Détection stricte et normalisation de la langue pour bannir tout mélange Franglais
  const isSummaryEnglish = /\b(engineering|student|specializing|seeking|proven|proficient|internship|architected|engineered|built)\b/i.test(
    parsedResult.tailoredSummary || ""
  );
  const isSummaryFrench = /\b(élève-ingénieur|étudiant|dernière année|spécialisé|recherche|stage|diplôme)\b/i.test(
    parsedResult.tailoredSummary || ""
  );

  let resolvedLang: "en" | "fr" = "fr";
  if (isSummaryEnglish && !isSummaryFrench) {
    resolvedLang = "en";
  } else if (isSummaryFrench && !isSummaryEnglish) {
    resolvedLang = "fr";
  } else {
    resolvedLang = String(parsedResult.language || "").toLowerCase().includes("en") ? "en" : "fr";
  }

  parsedResult.language = resolvedLang;

  // Normaliser detectedCompany et detectedJobTitle
  if (!parsedResult.detectedCompany || parsedResult.detectedCompany.trim().length === 0) {
    parsedResult.detectedCompany = cleanCompany;
  }
  if (!parsedResult.detectedJobTitle || parsedResult.detectedJobTitle.trim().length === 0) {
    parsedResult.detectedJobTitle = jobTitle;
  }

  // Garantir que versions contient les deux langues et leurs cover letters
  if (!parsedResult.versions) parsedResult.versions = {};
  if (!parsedResult.versions.fr) parsedResult.versions.fr = {};
  if (!parsedResult.versions.en) parsedResult.versions.en = {};

  if (!parsedResult.versions[resolvedLang]) {
    parsedResult.versions[resolvedLang] = {
      tailoredTitle: parsedResult.tailoredTitle,
      tailoredSummary: parsedResult.tailoredSummary,
      projectBullets: parsedResult.projectBullets,
      coverLetter: parsedResult.coverLetter,
    };
  } else if (!parsedResult.versions[resolvedLang].coverLetter && parsedResult.coverLetter) {
    parsedResult.versions[resolvedLang].coverLetter = parsedResult.coverLetter;
  }

  if (!parsedResult.versions.fr.coverLetter && parsedResult.versions.en.coverLetter) {
    parsedResult.versions.fr.coverLetter = parsedResult.coverLetter || parsedResult.versions.en.coverLetter;
  }
  if (!parsedResult.versions.en.coverLetter && parsedResult.versions.fr.coverLetter) {
    parsedResult.versions.en.coverLetter = parsedResult.coverLetter || parsedResult.versions.fr.coverLetter;
  }
  if (!parsedResult.coverLetter) {
    parsedResult.coverLetter = parsedResult.versions[resolvedLang]?.coverLetter || "";
  }

  // Normalisation typographique & sanitisation stricte (Banned words & bug OCR Al -> AI)
  const sanitizeText = (txt: string): string => {
    if (!txt) return txt;
    let s = txt.replace(/[\u2014\u2013]/g, "-");
    // Éradication du bug OCR remplaçant 'I' majuscule par 'l' minuscule dans AI
    s = s.replace(/\bAl\b/g, "AI").replace(/\bAl\s+/g, "AI ");
    // Remplacement des mots et tournures robotiques bannis
    s = s.replace(/\bmeasured by\b\s*/gi, "")
         .replace(/\bmesuré par\b\s*/gi, "")
         .replace(/\bAccomplished\b/gi, "Engineered")
         .replace(/\bAccompli\b/gi, "Développé")
         .replace(/\bsignificantly\b\s*/gi, "")
         .replace(/\bde manière significative\b\s*/gi, "")
         .replace(/\brobust\b/gi, "production-ready")
         .replace(/\brobuste\b/gi, "fiable")
         .replace(/\bleveraged\b/gi, "applied")
         .replace(/\butilizing\b/gi, "using")
         .replace(/\bcutting-edge\b/gi, "modern")
         .replace(/\bà la pointe\b/gi, "moderne")
         .replace(/\bdelve\b/gi, "focus")
         .replace(/\bproven expertise\b/gi, "engineering background")
         .replace(/\bexpertise avérée\b/gi, "solides compétences");
    return s.replace(/\s{2,}/g, " ").trim();
  };

  const sanitizeProjectList = (projList: any[]) => {
    if (!Array.isArray(projList)) return [];
    return projList.slice(0, 3).map((item) => ({
      ...item,
      project: sanitizeText(item.project || ""),
      bullets: Array.isArray(item.bullets)
        ? item.bullets.map((b: string) => sanitizeText(b))
        : [],
    }));
  };

  parsedResult.tailoredSummary = sanitizeText(parsedResult.tailoredSummary || "");
  if (parsedResult.projectBullets) {
    parsedResult.projectBullets = sanitizeProjectList(parsedResult.projectBullets);
  }
  if (parsedResult.coverLetter) {
    parsedResult.coverLetter = sanitizeText(parsedResult.coverLetter);
  }

  if (parsedResult.versions?.en) {
    parsedResult.versions.en.tailoredSummary = sanitizeText(parsedResult.versions.en.tailoredSummary || "");
    if (parsedResult.versions.en.projectBullets) {
      parsedResult.versions.en.projectBullets = sanitizeProjectList(parsedResult.versions.en.projectBullets);
    }
    if (parsedResult.versions.en.coverLetter) {
      parsedResult.versions.en.coverLetter = sanitizeText(parsedResult.versions.en.coverLetter);
    }
  }

  if (parsedResult.versions?.fr) {
    parsedResult.versions.fr.tailoredSummary = sanitizeText(parsedResult.versions.fr.tailoredSummary || "");
    if (parsedResult.versions.fr.projectBullets) {
      parsedResult.versions.fr.projectBullets = sanitizeProjectList(parsedResult.versions.fr.projectBullets);
    }
    if (parsedResult.versions.fr.coverLetter) {
      parsedResult.versions.fr.coverLetter = sanitizeText(parsedResult.versions.fr.coverLetter);
    }
  }

  // Sécurité anti-fuite NeuroTech
  const finalComp = parsedResult.detectedCompany || cleanCompany;
  if (finalComp && !finalComp.toLowerCase().includes("neurotech")) {
    const purgeNeurotech = (txt: string) => {
      if (!txt) return txt;
      return txt
        .replace(/NeuroTech Solutions and the /gi, "")
        .replace(/NeuroTech Solutions and /gi, "")
        .replace(
          /the Luxembourg Institute of Science and Technology and NeuroTech Solutions/gi,
          "the Luxembourg Institute of Science and Technology"
        )
        .replace(/NeuroTech Solutions et le /gi, "")
        .replace(/NeuroTech Solutions et /gi, "")
        .replace(/NeuroTech Solutions/gi, finalComp);
    };
    if (parsedResult.coverLetter) parsedResult.coverLetter = purgeNeurotech(parsedResult.coverLetter);
    if (parsedResult.versions?.fr?.coverLetter)
      parsedResult.versions.fr.coverLetter = purgeNeurotech(parsedResult.versions.fr.coverLetter);
    if (parsedResult.versions?.en?.coverLetter)
      parsedResult.versions.en.coverLetter = purgeNeurotech(parsedResult.versions.en.coverLetter);
  }

  return {
    success: true,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      estimatedCostEur: Number(estimatedCostEur.toFixed(6)),
      model: "gemini-flash",
      isFreeTier: true,
    },
    ...parsedResult,
  };
}
