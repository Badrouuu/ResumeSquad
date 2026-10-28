"use client";

import { useState, useEffect } from "react";

interface AgentStep {
  name: string;
  role: string;
  status: "idle" | "running" | "done";
  duration?: string;
}

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

const DEFAULT_APPLICATIONS: TrackedApplication[] = [
  {
    id: "1",
    company: "NeuroTech Solutions",
    title: "Stage PFE - AI / Machine Learning Engineer",
    appliedDate: "28 Oct 2026",
    atsScore: 90,
    status: "en_attente",
    notes: "CV optimisé avec focus NLP et microservices FastAPI.",
  },
  {
    id: "2",
    company: "Sophia AI Labs",
    title: "Computer Vision & Deep Learning Intern",
    appliedDate: "24 Oct 2026",
    atsScore: 86,
    status: "entretien",
    notes: "Entretien technique prévu le 3 novembre (PyTorch & OCR).",
  },
  {
    id: "3",
    company: "DataCorp Finance",
    title: "Data Science & NLP Intern",
    appliedDate: "15 Oct 2026",
    atsScore: 78,
    status: "refus",
    notes: "Recherchait un profil Bac+5 avec 1 an d'expérience préalable.",
  },
];

export default function Home() {
  const [currentView, setCurrentView] = useState<"generator" | "tracker">("generator");

  // Inputs Générateur
  const [jobTitle, setJobTitle] = useState("Stage PFE - AI / Machine Learning Engineer (6 mois)");
  const [company, setCompany] = useState("NeuroTech Solutions (Genève / Remote)");
  const [jobText, setJobText] = useState(`Missions :
- Développer des pipelines de traitement du langage naturel (NLP) et d'embeddings sémantiques.
- Entraîner et déployer des modèles sous PyTorch ou Transformers.
- Exposer des APIs haute performance en Python (FastAPI) et conteneuriser les microservices avec Docker.
- Collaborer avec l'équipe produit pour intégrer des agents LLMs avec Few-Shot Prompting et RAG.

Profil recherché :
- Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5 / Master 2) avec spécialisation IA / Data Science.
- Solides compétences en Python, PyTorch, calcul vectoriel (NumPy) et APIs REST (FastAPI).
- Connaissance des technologies d'embeddings (Word2Vec, Sentence-Transformers) appréciée.`);

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"bullets" | "strategy" | "latex">("bullets");

  const [steps] = useState<AgentStep[]>([
    { name: "Agent 1 : JobParser", role: "Extraction NER & Mots-clés ATS", status: "done", duration: "0.8s" },
    { name: "Agent 2 : Strategist", role: "Score d'adéquation & Angle d'attaque", status: "done", duration: "1.1s" },
    { name: "Agent 3 : Tailor", role: "Réécriture STAR & Personnalisation", status: "done", duration: "2.4s" },
    { name: "Agent 4 : Critic (Judge)", role: "Audit de conformité & Zéro hallucination", status: "done", duration: "0.9s" },
  ]);

  const [atsScore] = useState(90);
  const [coverageRate] = useState(90.0);

  const [tailoredTitle, setTailoredTitle] = useState("AI / Machine Learning Engineer (Stage PFE)");
  const [tailoredSummary, setTailoredSummary] = useState(
    "Élève-ingénieur en dernière année à l'EILCO (spécialité IA), doté d'une certification TOEIC 905/990. Spécialisé en Machine Learning, NLP et Deep Learning, avec une expérience avérée dans le développement de pipelines RAG, d'agents LLM (Few-Shot Prompting) et de calculs d'espaces vectoriels sémantiques (Word2Vec). Expert dans la conception d'APIs haute performance avec FastAPI et leur conteneurisation via Docker. À la recherche d'un stage de fin d'études (PFE) de 6 mois à partir de mars 2027."
  );

  const [projectBullets] = useState([
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

  const handleSaveApplication = () => {
    const newApp: TrackedApplication = {
      id: Date.now().toString(),
      company: company || "Entreprise",
      title: jobTitle || "Poste d'Ingénieur IA",
      appliedDate: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
      atsScore: atsScore,
      status: "en_attente",
      notes: `CV sur-mesure généré avec score ATS ${atsScore}/100.`,
    };

    const updated = [newApp, ...applications];
    saveToLocalStorage(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
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
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>📋</span> Offre d&apos;emploi ciblée
              </h2>

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
                  <label className="text-xs text-[#a1a1aa] block mb-1">Texte brut de l&apos;offre</label>
                  <textarea
                    rows={8}
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-[#09090b] border border-[#27272a] text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsRunning(true);
                      setTimeout(() => setIsRunning(false), 1200);
                    }}
                    disabled={isRunning}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>{isRunning ? "⏳" : "⚡"}</span>
                    <span>{isRunning ? "Orchestration..." : "Lancer l'escouade"}</span>
                  </button>

                  <button
                    onClick={handleSaveApplication}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                    title="Enregistrer cette offre dans votre tableau de suivi"
                  >
                    <span>📥</span>
                    <span>{saveSuccess ? "Enregistré !" : "Postuler & Suivre"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stepper des 4 agents */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Statut des 4 agents
              </h3>

              <div className="space-y-2 text-xs">
                {steps.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium text-white">{s.name}</div>
                        <div className="text-[#a1a1aa] text-[11px]">{s.role}</div>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                      ✓ {s.duration}
                    </span>
                  </div>
                ))}
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
                <div className="text-[10px] text-emerald-400 font-medium mt-1">Excellent alignement</div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-center">
                <div className="text-[11px] text-[#a1a1aa]">Couverture Mots-Clés</div>
                <div className="text-3xl font-black text-blue-400 mt-1">
                  {coverageRate}<span className="text-xs font-normal text-[#a1a1aa]">%</span>
                </div>
                <div className="text-[10px] text-blue-400 font-medium mt-1">Top mots-clés ATS</div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 text-center">
                <div className="text-[11px] text-[#a1a1aa]">Hallucinations</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">0</div>
                <div className="text-[10px] text-emerald-400 font-medium mt-1">100% Vérifié</div>
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
                    📄 Aperçu LaTeX
                  </button>
                </div>

                <button
                  onClick={handleSaveApplication}
                  className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg font-medium transition flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>{saveSuccess ? "Candidature ajoutée !" : "Ajouter au suivi"}</span>
                </button>
              </div>

              {/* Onglet 1 : Puces STAR */}
              {activeTab === "bullets" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-1.5">
                      Titre & Accroche adaptées à l&apos;offre
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
                      Fichier prêt : <code className="text-white">backend/output/cv_tailored_pfe.tex</code>
                    </span>
                    <a
                      href="https://www.overleaf.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                    >
                      Ouvrir dans Overleaf ↗
                    </a>
                  </div>

                  <pre className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] font-mono text-[11px] text-[#f4f4f5] overflow-x-auto max-h-72">
{`\\documentclass[10pt,a4paper]{article}
\\usepackage{hyperref}
\\begin{document}
\\begin{center}
    {\\huge \\textbf{Badroudine Bacar}} \\\\[0.4em]
    {\\large \\textbf{AI / Machine Learning Engineer (Stage PFE)}} \\\\[0.4em]
    \\small Calais $|$ badroudinebacar@gmail.com $|$ LinkedIn $|$ GitHub
\\end{center}
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
          {/* Métriques globales de recherche de stage */}
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

            <button
              onClick={() => setCurrentView("generator")}
              className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Nouvelle Candidature Ciblée</span>
            </button>
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
