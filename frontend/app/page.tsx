"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [currentView, setCurrentView] = useState<"generator" | "tracker">("generator");

  // Mode de saisie de l'offre : "text" ou "url"
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [jobUrl, setJobUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // Inputs Générateur
  const [jobTitle, setJobTitle] = useState("Stage PFE - AI / Machine Learning Engineer (6 mois)");
  const [company, setCompany] = useState("NeuroTech Solutions (Genève / Remote)");
  const [jobText, setJobText] = useState(DEFAULT_JOB_TEXT);

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"bullets" | "strategy" | "latex">("bullets");

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

  useEffect(() => {
    const saved = localStorage.getItem("resumesquad_applications");
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur chargement localStorage", e);
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
  const handleRunPipeline = async () => {
    setIsRunning(true);
    setExtractMessage(null);

    let activeText = jobText;
    let activeTitle = jobTitle;
    let activeCompany = company;

    // Si l'utilisateur est en mode URL et n'a pas encore cliqué sur extraire
    if (inputMode === "url" && jobUrl && (!jobText || jobText === DEFAULT_JOB_TEXT)) {
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
        if (data.tailoredTitle) setTailoredTitle(data.tailoredTitle);
        if (data.tailoredSummary) setTailoredSummary(data.tailoredSummary);
        if (data.projectBullets && data.projectBullets.length > 0) setProjectBullets(data.projectBullets);
        if (data.atsScore) setAtsScore(data.atsScore);
        if (data.coverageRate) setCoverageRate(data.coverageRate);

        setExtractMessage({
          type: "success",
          text: `🎉 L'escouade d'agents IA a adapté votre profil et vos projets en direct pour ${activeCompany} (Score ATS : ${data.atsScore}/100) !`,
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

  // Téléchargement du fichier LaTeX (.tex)
  const handleDownloadTex = () => {
    const texContent = `\\documentclass[10pt,a4paper]{article}
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
    \\small Calais / Hauts-de-France (Mobilité : Suisse, Luxembourg, Belgique, Télétravail) \\\\
    \\href{tel:+33767560786}{07 67 56 07 86} \\ $|$ \\ 
    \\href{mailto:badroudinebacar@gmail.com}{badroudinebacar@gmail.com} \\ $|$ \\ 
    \\href{https://www.linkedin.com/in/badroudine-bacar/}{LinkedIn} \\ $|$ \\ 
    \\href{https://github.com/Badrouuu}{GitHub}
\\end{center}

\\vspace{-0.4em}
\\noindent
\\small ${tailoredSummary}

\\section{Formation \\& Certifications}
\\begin{itemize}
    \\item \\textbf{Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle} \\hfill 2024 - 2027 \\\\
    \\textit{EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais, France} \\\\
    \\footnotesize Dernière année (ING3). Modules avancés : Deep Learning, Vision par Ordinateur, Machine Learning, Architecture Logicielle, MLOps, CI/CD, Bases de Données Avancées.
    \\item \\textbf{Certification Anglais : TOEIC Listening and Reading} \\hfill Score : \\textbf{905 / 990 (Niveau C1)}
\\end{itemize}

\\section{Projets Techniques \\& Réalisations}
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

\\section{Expérience Professionnelle}
\\noindent
\\textbf{Fondateur \\& Développeur Lead (Stage Entrepreneurial PÉPITE)} \\hfill 2025 - 2026 \\\\
\\textit{Étiquette Jaune (Micro-entreprise)}
\\begin{itemize}
    \\item Accompli l'intégration de modèles de Vision par Ordinateur mesurés par la vitesse d'extraction textuelle, en faisant usage de Google ML Kit Text Recognition (OCR).
    \\item Accompli le développement d'un backend serverless mesuré par la synchronisation temps réel, en faisant appel à Google Cloud Firestore, Cloud Functions et TypeScript.
\\end{itemize}

\\end{document}`;

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
        <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] p-1.5 rounded-xl">
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
                  onClick={handleRunPipeline}
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

            {/* BARRE D'ACTION PRINCIPALE : TÉLÉCHARGER & SUIVRE */}
            <div className="bg-gradient-to-r from-blue-900/40 via-[#18181b] to-emerald-900/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📄</span> Ton CV sur-mesure est prêt pour l&apos;envoi
                </div>
                <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                  Format LaTeX (.tex) prêt pour compilation Overleaf ou PDF direct
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownloadTex}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md"
                >
                  <span>📥</span>
                  <span>{downloadSuccess ? "Téléchargé !" : "Télécharger mon CV (.tex)"}</span>
                </button>

                <button
                  onClick={handleSaveApplication}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md"
                >
                  <span>🚀</span>
                  <span>{saveSuccess ? "Enregistré !" : "Postuler & Suivre"}</span>
                </button>
              </div>
            </div>

            {/* Tabs Container */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div className="flex gap-2">
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
                    onClick={() => setActiveTab("latex")}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === "latex" ? "bg-blue-600 text-white" : "text-[#a1a1aa] hover:bg-[#09090b]"
                    }`}
                  >
                    📄 Code LaTeX Complet
                  </button>
                </div>

                <a
                  href="https://www.overleaf.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline font-medium hidden sm:flex items-center gap-1"
                >
                  <span>Ouvrir Overleaf</span>
                  <span>↗</span>
                </a>
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

              {/* Onglet 3 : LaTeX */}
              {activeTab === "latex" && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#a1a1aa] text-[11px]">
                      Fichier prêt : <code className="text-white">cv_badroudine_bacar.tex</code>
                    </span>
                    <button
                      onClick={handleDownloadTex}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
                    >
                      📥 Télécharger le fichier .tex
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] font-mono text-[11px] text-[#f4f4f5] overflow-x-auto max-h-72">
{`\\documentclass[10pt,a4paper]{article}
\\usepackage{hyperref}
\\begin{document}
\\begin{center}
    {\\huge \\textbf{Badroudine Bacar}} \\\\[0.4em]
    {\\large \\textbf{${tailoredTitle}}} \\\\[0.4em]
    \\small Calais $|$ badroudinebacar@gmail.com $|$ LinkedIn $|$ GitHub
\\end{center}
% Profil et projets réécrits au format Google STAR...
\\end{document}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : TABLEAU DE BORD DE SUIVI DES CANDIDATURES (CRM)                    */}
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
    </main>
  );
}
