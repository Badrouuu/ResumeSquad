import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Clé API GEMINI_API_KEY non configurée. Veuillez ajouter GEMINI_API_KEY dans vos variables d'environnement Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const jobText = body.job_text || "";
    const jobTitle = body.job_title || "Ingénieur IA";
    const company = body.company || "Entreprise Ciblée";

    if (!jobText || jobText.length < 20) {
      return NextResponse.json(
        { success: false, error: "Le texte de l'offre d'emploi est trop court." },
        { status: 400 }
      );
    }

    const systemPrompt = `Tu es l'escouade d'ingénieurs IA de ResumeSquad.
Ton objectif : Adapter le CV de Badroudine Bacar pour maximiser son score ATS et son alignement pour le poste visé, avec ZÉRO HALLUCINATION.

=== PROFIL RÉEL DU CANDIDAT (NE RIEN INVENTER D'AUTRE) ===
- Identité : Badroudine Bacar
- Formation : Étudiant en 3e année d'école d'ingénieurs (Bac+5) à l'EILCO (Calais, France). Spécialité : Informatique - Parcours Intelligence Artificielle (Deep Learning, Vision par Ordinateur, MLOps, CI/CD, FastAPI).
- Certification : TOEIC 905/990 (Niveau C1 Courant).
- Recherche : Stage de fin d'études (PFE) de 6 mois à partir de mars/avril 2027.
- Projets techniques réels :
  1. VectorWord / Guess-What : API haute performance (FastAPI, Uvicorn) pour le calcul de similarité cosinus sur des espaces vectoriels Word2Vec multilingues (FR/EN) avec Gensim et NumPy. Architecture Docker sur Railway, frontend Next.js 15, TypeScript, Supabase.
  2. Pipeline RAG & Automatisation Agentique : Parsing d'offres d'emploi, Few-Shot Prompting avec LLMs, génération structurée de documents LaTeX, réduction drastique des hallucinations.
  3. Étiquette Jaune (Fondateur & Lead Dev - Micro-entreprise) : Vision par ordinateur sur mobile avec Google ML Kit Text Recognition (OCR), backend serverless Google Cloud Firestore & Functions, TypeScript.
- Passions & Centres d'intérêt réels :
  * Modding de jeux vidéo (analyse approfondie et modification de mécaniques de gameplay, scripting, structures de données).
  * Jeux de stratégie & pratique compétitive en tournois One Piece TCG (théorie des jeux, optimisation de decks, calculs probabilistes et prise de décision sous incertitude).
  * Passionné de jeux vidéo et de simulation interactive.

=== OFFRE D'EMPLOI CIBLÉE ===
Entreprise : ${company}
Intitulé de poste : ${jobTitle}
Description / Missions :
${jobText.slice(0, 4000)}

=== RÈGLE DE LANGUE IMPÉRATIVE (BILINGUISME INTELLIGENT) ===
- Analyse la langue de l'offre d'emploi (Description / Missions) :
  * Si l'offre est en ANGLAIS (English) -> Tu DOIS générer l'INTÉGRALITÉ des champs (tailoredTitle, tailoredSummary, projectBullets, strategyNote) en ANGLAIS PROFESSIONNEL NATIF (utilise des verbes d'action au prétérit : Accomplished, Engineered, Architected, Built). Renseigne "language": "en".
  * Si l'offre est en FRANÇAIS -> Rédige l'intégralité en FRANÇAIS. Renseigne "language": "fr".

=== INSTRUCTIONS DE GÉNÉRATION ===
1. Titre ciblé : Ajuste le titre du CV pour refléter exactement le poste demandé (ex: "Machine Learning Infrastructure Intern", "Ingénieur IA / Deep Learning - Stage PFE").
2. Résumé percutant : Rédige une accroche de 3-4 phrases soulignant les compétences réelles de Badroudine qui correspondent directement aux exigences de l'offre (ex: Python, C++, Deep Learning, FastAPI, Docker, anglais C1).
3. Adaptation des projets : Réécris les puces des 2 projets principaux ("VectorWord" et "Pipeline RAG") selon la formule STAR (Accompli [X] mesuré par [Y] en faisant appel à [Z] / Accomplished [X] as measured by [Y] by doing [Z]) en insistant sur les compétences clés de l'annonce.
4. Score ATS & Couverture : Évalue de manière réaliste le score ATS (entre 80 et 96) et le taux de couverture des mots-clés selon l'adéquation.

Réponds STRICTEMENT au format JSON valide respectant ce schéma :
{
  "language": "en" | "fr",
  "tailoredTitle": "string",
  "tailoredSummary": "string",
  "projectBullets": [
    {
      "project": "string",
      "bullets": ["string", "string"]
    }
  ],
  "atsScore": 92,
  "coverageRate": 89.5,
  "strategyNote": "string"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erreur API Gemini: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new Error("Réponse vide du modèle d'IA");
    }

    const parsedResult = JSON.parse(candidate);

    return NextResponse.json({
      success: true,
      ...parsedResult,
    });
  } catch (error: any) {
    console.error("Erreur pipeline agentique:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur interne lors de l'exécution de l'escouade d'agents.",
      },
      { status: 500 }
    );
  }
}
