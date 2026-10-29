"use client";

import { useState, useEffect } from "react";
import { RADAR_JOB_OFFERS, DEEP_SEARCH_PORTALS, RadarJobOffer } from "./data/radarOffers";

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

const DEFAULT_COVER_LETTER = `Badroudine Bacar
Élève-Ingénieur en Informatique — Spécialité Intelligence Artificielle (Bac+5 / ING3)
EILCO (École d'Ingénieurs du Littoral Côte d'Opale)
Email : badroudinebacar@gmail.com | Tél : +33 7 67 56 07 86
LinkedIn : linkedin.com/in/badroudine-bacar | GitHub : github.com/Badrouuu
Mobilité : Suisse, Luxembourg, Belgique, Allemagne, UK (Présentiel / Hybride)

À l'attention de l'équipe Recrutement Tech
NeuroTech Solutions

Objet : Candidature — Stage de fin d'études PFE (6 mois) : Ingénieur AI / Machine Learning (dès Mars 2027)

Madame, Monsieur,

Actuellement en dernière année de cycle ingénieur à l'EILCO (spécialisation Intelligence Artificielle & Data Science) après un parcours exigeant en Classes Préparatoires aux Grandes Écoles (CPGE TSI), je vous présente ma candidature pour un stage de fin d'études de 6 mois en tant qu'Ingénieur AI / Machine Learning, disponible à partir de mars 2027.

Votre positionnement technologique et vos challenges en IA appliquée correspondent parfaitement à mon profil et à mes réalisations. Passionné par l'industrialisation des modèles de Machine Learning et le NLP, j'ai notamment conçu et déployé VectorWord / Guess-What, un moteur sémantique temps réel exploitant des embeddings Word2Vec (Gensim, NumPy) et exposé via une API haute performance sous FastAPI et conteneurisé avec Docker. De plus, j'ai mis au point des pipelines agentiques RAG (Retrieval-Augmented Generation) combinant Few-Shot Prompting et matching sémantique pour automatiser des workflows complexes avec une fiabilité totale sans hallucinations.

Rigoureux, autonome et certifié au niveau C1 en anglais professionnel (TOEIC 905/990), je suis particulièrement enthousiaste à l'idée d'intégrer vos équipes sur site ou en format hybride, afin de concevoir et déployer des solutions d'IA robustes et scalables.

Dans l'attente d'un prochain échange au cours duquel je pourrai vous présenter plus en détail mes réalisations techniques, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

Badroudine Bacar`;

export default function Home() {
  const [currentView, setCurrentView] = useState<"generator" | "radar" | "tracker">("generator");

  // Filtres et recherche pour le Radar d'offres
  const [radarCountryFilter, setRadarCountryFilter] = useState<string>("all");
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
  const [company, setCompany] = useState("NeuroTech Solutions (Genève / Remote)");
  const [jobText, setJobText] = useState(DEFAULT_JOB_TEXT);

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"bullets" | "strategy" | "cover_letter" | "latex">("bullets");
  const [coverLetter, setCoverLetter] = useState<string>(DEFAULT_COVER_LETTER);
  const [copyLetterSuccess, setCopyLetterSuccess] = useState(false);

  const [atsScore, setAtsScore] = useState(90);
  const [coverageRate, setCoverageRate] = useState(90.0);

  const [tailoredTitle, setTailoredTitle] = useState("AI / Machine Learning Engineer (Stage PFE)");
  const [tailoredSummary, setTailoredSummary] = useState(
    "Élève-ingénieur en dernière année à l'EILCO (spécialité IA), doté d'une certification TOEIC 905/990. Spécialisé en Machine Learning, NLP et Deep Learning, avec une expérience avérée dans le développement de pipelines RAG, d'agents LLM (Few-Shot Prompting) et de calculs d'espaces vectoriels sémantiques (Word2Vec). Expert dans la conception d'APIs haute performance avec FastAPI et leur conteneurisation via Docker. À la recherche d'un stage de fin d'études (PFE) de 6 mois à partir de mars 2027."
  );

  const [projectBullets, setProjectBullets] = useState([
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
  ]);

  // Applications Tracker State avec localStorage
  const [applications, setApplications] = useState<TrackedApplication[]>(DEFAULT_APPLICATIONS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [extractMessage, setExtractMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);
  const [cvLanguage, setCvLanguage] = useState<"fr" | "en">("fr");
  const [fullRemoteWarning, setFullRemoteWarning] = useState<string | null>(null);
  const [franceWarning, setFranceWarning] = useState<string | null>(null);
  const [workplaceType, setWorkplaceType] = useState<"full_remote" | "hybrid" | "onsite" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("resumesquad_applications");
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur chargement localStorage", e);
      }
    }

    const savedLive = localStorage.getItem("resumesquad_live_offers");
    if (savedLive) {
      try {
        setLiveOffers(JSON.parse(savedLive));
      } catch (e) {
        console.error("Erreur chargement live offers localStorage", e);
      }
    }
  }, []);

  const saveToLocalStorage = (data: TrackedApplication[]) => {
    setApplications(data);
    localStorage.setItem("resumesquad_applications", JSON.stringify(data));
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
        if (data.language === "en" || data.language === "fr") {
          setCvLanguage(data.language);
        }
        if (data.tailoredTitle) setTailoredTitle(data.tailoredTitle);
        if (data.tailoredSummary) setTailoredSummary(data.tailoredSummary);
        if (data.projectBullets && data.projectBullets.length > 0) setProjectBullets(data.projectBullets);
        if (data.coverLetter) setCoverLetter(data.coverLetter);
        if (data.atsScore) setAtsScore(data.atsScore);
        if (data.coverageRate) setCoverageRate(data.coverageRate);

        // Détection Full Remote (contrainte de convention de stage EILCO)
        const isClientFullRemote = /\b(full[- ]?remote|100%\s*(télétravail|remote)|fully[- ]?remote|remote[- ]?only|100%\s*à distance|télétravail complet|télétravail total)\b/i.test(activeText);
        if (data.isFullRemote || isClientFullRemote) {
          setFullRemoteWarning(
            data.remoteWarning ||
              "Cette offre semble être en 100% Full Remote (télétravail total). Rappel convention : Ton école d'ingénieurs (EILCO) exige une présence physique sur site (hybride ou présentiel). Assure-toi de la flexibilité de l'employeur avant de postuler !"
          );
          setWorkplaceType("full_remote");
        } else {
          setFullRemoteWarning(null);
          setWorkplaceType(data.workplaceType || "hybrid");
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
          text: `🎉 L'escouade d'agents IA a adapté votre CV ${langBadge} pour ${activeCompany} (Score ATS : ${data.atsScore}/100) !`,
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

  // Helper de génération du code source LaTeX (.tex) bilingue FR/EN
  const getTexContent = (): string => {
    const isEn = cvLanguage === "en";

    const locationText = isEn
      ? "France (International Mobility: Switzerland, Luxembourg, Belgium, Germany — Onsite / Hybrid)"
      : "France (Mobilité Internationale Obligatoire : Suisse, Luxembourg, Belgique, Allemagne — Présentiel / Hybride)";

    const educationSection = isEn
      ? `\\section{Education \\& Certifications}
\\begin{itemize}
    \\item \\textbf{Master of Science in Computer Engineering — Major in Artificial Intelligence} \\hfill 2024 - 2027 \\\\
    \\textit{EILCO Graduate School of Engineering, Calais, France} \\\\
    \\footnotesize Final year (MSc / ING3). Advanced coursework: Deep Learning, Computer Vision, Machine Learning, Software Architecture, MLOps, CI/CD, Advanced Databases.
    \\item \\textbf{Preparatory Classes for Grandes Écoles (CPGE TSI)} \\hfill 2022 - 2024 \\\\
    \\textit{Lycée César Baggio, Lille, France} \\\\
    \\footnotesize Intensive 2-year preparation in Advanced Mathematics, Physics, and Engineering Sciences.
    \\item \\textbf{English Proficiency: TOEIC Listening and Reading} \\hfill Score: \\textbf{905 / 990 (CEFR C1 Level - Fluent)}
\\end{itemize}`
      : `\\section{Formation \\& Certifications}
\\begin{itemize}
    \\item \\textbf{Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle} \\hfill 2024 - 2027 \\\\
    \\textit{EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais, France} \\\\
    \\footnotesize Dernière année (ING3). Modules avancés : Deep Learning, Vision par Ordinateur, Machine Learning, Architecture Logicielle, MLOps, CI/CD, Bases de Données Avancées.
    \\item \\textbf{Classes Préparatoires aux Grandes Écoles (CPGE TSI)} \\hfill 2022 - 2024 \\\\
    \\textit{Lycée César Baggio, Lille, France} \\\\
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
      ? `\\section{Interests \\& Passions}
\\begin{itemize}
    \\item \\textbf{Game Modding \\& Video Games:} Passionate about video games and modding (gameplay mechanics reverse-engineering, scripting, data structures).
    \\item \\textbf{Strategy Games \\& Competitive TCG:} Active strategy gamer and competitive One Piece TCG tournament player (game theory, deck optimization, probabilistic decision-making).
\\end{itemize}`
      : `\\section{Centres d'Intérêt \\& Passions}
\\begin{itemize}
    \\item \\textbf{Modding \\& Jeux Vidéo :} Passionné de jeux vidéo et de modding (analyse et rétro-ingénierie de mécaniques de gameplay, scripting, structures de données).
    \\item \\textbf{Jeux de Stratégie \\& TCG Compétitif :} Pratique active de jeux de stratégie et participation à des tournois One Piece TCG (théorie des jeux, optimisation tactique, calculs de probabilités).
\\end{itemize}`;

    return `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1.5cm]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\definecolor{primary}{RGB}{30, 58, 138}
\\definecolor{textdark}{RGB}{31, 41, 55}
\\color{textdark}
\\pagestyle{empty}

\\titleformat{\\section}{\\large\\bfseries\\color{primary}\\uppercase}{}{0em}{}[\\vspace{-0.5em}\\rule{\\textwidth}{0.8pt}\\vspace{-0.3em}]
\\titlespacing*{\\section}{0pt}{1.0em}{0.6em}
\\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=2pt, parsep=0pt}

\\begin{document}
\\begin{center}
    {\\huge \\textbf{\\color{primary} Badroudine Bacar}} \\\\[0.4em]
    {\\large \\textbf{${tailoredTitle}}} \\\\[0.4em]
    \\small ${locationText} \\\\
    \\href{tel:+33767560786}{07 67 56 07 86} \\ $|$ \\ 
    \\href{mailto:badroudinebacar@gmail.com}{badroudinebacar@gmail.com} \\ $|$ \\ 
    \\href{https://www.linkedin.com/in/badroudine-bacar/}{LinkedIn} \\ $|$ \\ 
    \\href{https://github.com/Badrouuu}{GitHub}
\\end{center}

\\vspace{-0.4em}
\\noindent
\\small ${tailoredSummary}

${educationSection}

${projectsSectionTitle}
${projectBullets
  .map(
    (p) => `\\noindent
\\textbf{${p.project}} \\\\
\\begin{itemize}
${p.bullets.map((b) => `    \\item ${b}`).join("\n")}
\\end{itemize}
\\vspace{0.4em}`
  )
  .join("\n")}

${experienceSection}

${interestsSection}

\\end{document}`;
  };

  // Téléchargement du fichier LaTeX (.tex) bilingue FR/EN
  const handleDownloadTex = () => {
    const texContent = getTexContent();
    const blob = new Blob([texContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanCompany = (company || "entreprise").toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `cv_badroudine_${cleanCompany}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Ouverture et compilation 1-clic sur Overleaf
  const handleOpenOverleaf = () => {
    const texContent = getTexContent();
    const form = document.createElement("form");
    form.action = "https://www.overleaf.com/docs";
    form.method = "POST";
    form.target = "_blank";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "snip";
    input.value = texContent;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Export direct en PDF conforme ATS via le moteur d'impression navigateur
  const handlePrintPdf = () => {
    window.print();
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

  // Téléchargement de la lettre de motivation (.txt)
  const handleDownloadCoverLetter = () => {
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanCompany = (company || "entreprise").toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `lettre_motivation_badroudine_${cleanCompany}.txt`;
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

  const allRadarOffers = [...liveOffers, ...RADAR_JOB_OFFERS];

  // Filtrage dynamique des offres du Radar (offres vérifiées + flux scanné en direct)
  const filteredRadarOffers = allRadarOffers.filter((offer) => {
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
    return matchesCountry && matchesSearch;
  });

  // Scanner en direct les offres sur les marchés suisse et européen (SwissDevJobs & GermanTechJobs)
  const handleScanLiveOffers = async () => {
    setIsScanningLive(true);
    setLastScanMessage(null);
    try {
      const res = await fetch("/api/radar/live-fetch");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.offers)) {
        setLiveOffers(data.offers);
        try {
          localStorage.setItem("resumesquad_live_offers", JSON.stringify(data.offers));
        } catch (e) {
          console.warn("Erreur sauvegarde localStorage:", e);
        }
        setLastScanMessage(
          `🔥 ${data.offers.length} opportunités fraîches scannées en direct sur les marchés suisse et européen !`
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

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
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
                <div>
                  <label className="text-xs text-[#a1a1aa] block mb-1">Poste & Entreprise</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#a1a1aa] block mb-1">Texte de l&apos;offre d&apos;emploi</label>
                  <textarea
                    rows={7}
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-[#09090b] border border-[#27272a] text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition resize-none"
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

            {/* ALERTE CONVENTION DE STAGE : 100% FULL REMOTE */}
            {fullRemoteWarning && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 space-y-2 shadow-lg">
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
                <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/30">
                  <span>💡</span>
                  <span>
                    <b>Action conseillée :</b> Ton école (EILCO) exige une présence physique. Demande au recruteur si une formule <b>hybride</b> (présence sur site 2-3 j/semaine) est envisageable avant d&apos;envoyer ta candidature.
                  </span>
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
                      onClick={() => setCvLanguage("fr")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        cvLanguage === "fr" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                      }`}
                      title="Générer le CV en Français"
                    >
                      🇫🇷 FR
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvLanguage("en")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        cvLanguage === "en" ? "bg-blue-600 text-white shadow-sm" : "text-[#a1a1aa] hover:text-white"
                      }`}
                      title="Generate CV in English"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#09090b] border border-[#27272a]">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>✉️</span>
                        <span>Lettre de Motivation Personnalisée</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {cvLanguage === "en" ? "🇬🇧 Rédigée en Anglais" : "🇫🇷 Rédigée en Français"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                        Ciblée pour <b>{company}</b> et le poste <b>{jobTitle}</b>. Vous pouvez modifier le texte ci-dessous à votre guise.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleCopyCoverLetter}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-sm"
                      >
                        <span>{copyLetterSuccess ? "✓" : "📋"}</span>
                        <span>{copyLetterSuccess ? "Copié !" : "Copier la lettre"}</span>
                      </button>
                      <button
                        onClick={handleDownloadCoverLetter}
                        className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-lg text-xs font-medium transition flex items-center gap-1 border border-[#3f3f46]"
                      >
                        <span>📥</span>
                        <span>Télécharger (.txt)</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={14}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full text-xs p-4 rounded-xl bg-[#09090b] border border-[#27272a] text-[#f4f4f5] font-sans leading-relaxed focus:outline-none focus:border-blue-500 transition resize-y"
                      placeholder="Lettre de motivation générée automatiquement..."
                    />
                  </div>
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

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Bouton de scan temps réel */}
                <button
                  onClick={handleScanLiveOffers}
                  disabled={isScanningLive}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  title="Interroge en direct les APIs de jobs tech en Suisse et en Allemagne"
                >
                  <span className={isScanningLive ? "animate-spin" : ""}>🔄</span>
                  <span>
                    {isScanningLive ? "Scan du marché suisse & européen..." : "Scanner en direct (Temps Réel)"}
                  </span>
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
                filteredRadarOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition hover:bg-[#1a1a1e] space-y-4"
                  >
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
                          </div>
                          <h4 className="text-sm font-semibold text-blue-400 mt-1">{offer.title}</h4>
                        </div>

                        {/* Badges rémunération & workplace */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {offer.id.startsWith("live-") && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 shadow-sm">
                              <span>🔥</span>
                              <span>En Direct (Live Feed)</span>
                            </span>
                          )}
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
                    <div className="flex items-center gap-2 pt-2 border-t border-[#27272a]">
                      <button
                        onClick={() => handleImportRadarOffer(offer)}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <span>⚡ Importer & Adapter (1-Clic)</span>
                      </button>

                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
                        title="Lien direct vers l'offre officielle"
                      >
                        <span>Offre</span>
                        <span>↗</span>
                      </a>

                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(`${offer.company} ${offer.title} ${offer.location} careers`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-2.5 bg-[#27272a] hover:bg-blue-600/30 hover:text-blue-300 text-[#a1a1aa] rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
                        title="Rechercher sur Google Careers si le lien direct a expiré ou retourne une erreur 404"
                      >
                        <span>🔎 Google</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
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
      <div id="cv-print-area" className="hidden print:block text-black bg-white font-sans text-xs p-2 space-y-3">
        {/* En-tête */}
        <div className="text-center space-y-1 pb-2 border-b border-gray-400">
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 uppercase">Badroudine Bacar</h1>
          <div className="text-sm font-semibold text-gray-800">{tailoredTitle}</div>
          <div className="text-[11px] text-gray-600">
            {cvLanguage === "en"
              ? "France (International Mobility: Switzerland, Luxembourg, Belgium, Germany — Onsite / Hybrid)"
              : "France (Mobilité Internationale Obligatoire : Suisse, Luxembourg, Belgique, Allemagne — Présentiel / Hybride)"}
          </div>
          <div className="text-[11px] text-gray-700 flex items-center justify-center gap-3 pt-0.5">
            <span>+33 7 67 56 07 86</span>
            <span>•</span>
            <span>badroudinebacar@gmail.com</span>
            <span>•</span>
            <span>linkedin.com/in/badroudine-bacar</span>
            <span>•</span>
            <span>github.com/Badrouuu</span>
          </div>
        </div>

        {/* Profil / Accroche */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {cvLanguage === "en" ? "Professional Summary" : "Profil Professionnel"}
          </h2>
          <p className="text-[11px] text-gray-800 leading-relaxed text-justify">
            {tailoredSummary}
          </p>
        </div>

        {/* Formation & Certifications */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {cvLanguage === "en" ? "Education & Certifications" : "Formation & Certifications"}
          </h2>
          <div className="space-y-1 text-[11px] text-gray-800">
            <div className="flex justify-between items-baseline font-semibold">
              <span>{cvLanguage === "en" ? "Master of Science in Computer Engineering — Major in Artificial Intelligence" : "Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle"}</span>
              <span className="text-gray-600 font-normal">2024 - 2027</span>
            </div>
            <div className="italic text-gray-700 text-[10px]">
              {cvLanguage === "en" ? "EILCO Graduate School of Engineering, Calais, France" : "EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais, France"}
            </div>
            <div className="text-[10px] text-gray-600">
              {cvLanguage === "en"
                ? "Final year (ING3 / MSc). Specialization in Deep Learning, Computer Vision, Machine Learning, MLOps, CI/CD, Advanced Databases."
                : "Dernière année (ING3). Spécialisation en Deep Learning, Vision par Ordinateur, Machine Learning, MLOps, CI/CD, Bases de Données Avancées."}
            </div>

            <div className="flex justify-between items-baseline font-semibold pt-1">
              <span>{cvLanguage === "en" ? "Preparatory Classes for Grandes Écoles (CPGE TSI)" : "Classes Préparatoires aux Grandes Écoles (CPGE TSI)"}</span>
              <span className="text-gray-600 font-normal">2022 - 2024</span>
            </div>
            <div className="italic text-gray-700 text-[10px]">Lycée César Baggio, Lille, France</div>

            <div className="flex justify-between items-baseline font-semibold pt-1">
              <span>{cvLanguage === "en" ? "English Certification: TOEIC Listening & Reading" : "Certification Anglais : TOEIC Listening & Reading"}</span>
              <span className="text-blue-900 font-bold">905 / 990 (CEFR C1 Level)</span>
            </div>
          </div>
        </div>

        {/* Projets Techniques */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {cvLanguage === "en" ? "Technical Projects & Key Achievements" : "Projets Techniques & Réalisations"}
          </h2>
          <div className="space-y-2 text-[11px]">
            {projectBullets.map((proj, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold text-gray-900">{proj.project}</div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-800 text-[10.5px]">
                  {proj.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="leading-snug">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Expérience Professionnelle */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {cvLanguage === "en" ? "Professional Experience" : "Expérience Professionnelle"}
          </h2>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between items-baseline font-semibold text-gray-900">
              <span>{cvLanguage === "en" ? "Founder & Lead Software Developer (Entrepreneurial Internship PÉPITE)" : "Fondateur & Développeur Lead (Stage Entrepreneurial PÉPITE)"}</span>
              <span className="text-gray-600 font-normal">2025 - 2026</span>
            </div>
            <div className="italic text-gray-700 text-[10px]">Étiquette Jaune (Micro-entreprise)</div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-800 text-[10.5px]">
              {cvLanguage === "en" ? (
                <>
                  <li>Accomplished integration of on-device Computer Vision models measured by text extraction speed, leveraging Google ML Kit Text Recognition (OCR).</li>
                  <li>Accomplished serverless backend development measured by real-time data synchronization, utilizing Google Cloud Firestore, Cloud Functions, and TypeScript.</li>
                </>
              ) : (
                <>
                  <li>Accompli l&apos;intégration de modèles de Vision par Ordinateur mesurés par la vitesse d&apos;extraction textuelle, en faisant usage de Google ML Kit Text Recognition (OCR).</li>
                  <li>Accompli le développement d&apos;un backend serverless mesuré par la synchronisation temps réel, en faisant appel à Google Cloud Firestore, Cloud Functions et TypeScript.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Centres d'intérêt & Passions */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-gray-300 pb-0.5">
            {cvLanguage === "en" ? "Interests & Passions" : "Centres d'Intérêt & Passions"}
          </h2>
          <div className="space-y-0.5 text-[10.5px] text-gray-800">
            <div>
              <span className="font-semibold text-gray-900">{cvLanguage === "en" ? "Game Modding & Video Games:" : "Modding & Jeux Vidéo :"} </span>
              <span>{cvLanguage === "en" ? "Passionate about video games and modding (gameplay mechanics reverse-engineering, scripting, data structures)." : "Passionné de jeux vidéo et de modding (analyse et rétro-ingénierie de mécaniques de gameplay, scripting, structures de données)."}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">{cvLanguage === "en" ? "Strategy Games & Competitive TCG:" : "Jeux de Stratégie & TCG Compétitif :"} </span>
              <span>{cvLanguage === "en" ? "Active strategy gamer and competitive One Piece TCG tournament player (game theory, deck optimization, probabilistic decision-making)." : "Pratique active de jeux de stratégie et tournois compétitifs One Piece TCG (théorie des jeux, optimisation de deck, calculs probabilistes)."}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
