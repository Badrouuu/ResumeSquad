"use client";

import { useState } from "react";

interface AgentStep {
  name: string;
  role: string;
  status: "idle" | "running" | "done";
  duration?: string;
}

export default function Home() {
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

  const [steps, setSteps] = useState<AgentStep[]>([
    { name: "Agent 1 : JobParser", role: "Extraction NER & Mots-clés ATS", status: "done", duration: "0.8s" },
    { name: "Agent 2 : Strategist", role: "Score d'adéquation & Angle d'attaque", status: "done", duration: "1.1s" },
    { name: "Agent 3 : Tailor", role: "Réécriture STAR & Personnalisation", status: "done", duration: "2.4s" },
    { name: "Agent 4 : Critic (Judge)", role: "Audit de conformité & Zéro hallucination", status: "done", duration: "0.9s" },
  ]);

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

  const handleRun = async () => {
    setIsRunning(true);
    // Simuler ou appeler le backend si disponible
    try {
      const response = await fetch("http://localhost:8000/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: jobText, company_name: company, job_title: jobTitle }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Backend response:", data);
      }
    } catch {
      console.log("Backend local non connecté, exécution de démonstration");
    } finally {
      setTimeout(() => {
        setIsRunning(false);
      }, 1500);
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#27272a] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">ResumeSquad AI</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  Système 4 Agents
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#a1a1aa] mt-0.5">
                Plateforme d&apos;ingénierie ATS & Génération de CV ciblé sans hallucination
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#18181b] border border-[#27272a] p-2.5 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            BB
          </div>
          <div className="text-left pr-2">
            <div className="text-xs font-semibold text-white">Badroudine Bacar</div>
            <div className="text-[11px] text-[#a1a1aa]">EILCO — Parcours IA (ING3)</div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Colonne Gauche : Input de l'offre (5 cols) */}
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

              <button
                onClick={handleRun}
                disabled={isRunning}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isRunning ? "⏳" : "⚡"}</span>
                <span>{isRunning ? "Orchestration en cours..." : "Lancer l'escouade multi-agents"}</span>
              </button>
            </div>
          </div>

          {/* Stepper des 4 agents */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
              Statut des agents
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

        {/* Colonne Droite : Visualisation & Livrables (7 cols) */}
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
                    activeTab === "bullets"
                      ? "bg-blue-600 text-white"
                      : "text-[#a1a1aa] hover:bg-[#09090b]"
                  }`}
                >
                  ✍️ Puces STAR Réécrites
                </button>
                <button
                  onClick={() => setActiveTab("strategy")}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                    activeTab === "strategy"
                      ? "bg-blue-600 text-white"
                      : "text-[#a1a1aa] hover:bg-[#09090b]"
                  }`}
                >
                  🎯 Stratégie & Mots-clés
                </button>
                <button
                  onClick={() => setActiveTab("latex")}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                    activeTab === "latex"
                      ? "bg-blue-600 text-white"
                      : "text-[#a1a1aa] hover:bg-[#09090b]"
                  }`}
                >
                  📄 Aperçu LaTeX
                </button>
              </div>

              <span className="text-xs text-emerald-400 font-medium hidden sm:inline">
                ● Données validées
              </span>
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
                    {[
                      "Stage PFE",
                      "Machine Learning Engineer",
                      "NLP",
                      "PyTorch",
                      "FastAPI",
                      "Docker",
                      "Transformers",
                      "RAG",
                      "LLM",
                      "Word2Vec",
                      "Gensim",
                      "NumPy",
                      "Supabase"
                    ].map((kw, i) => (
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
% Profil et projets réécrits au format STAR...
\\end{document}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
