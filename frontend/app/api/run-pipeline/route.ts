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
- Formation : Étudiant en 3e année d'école d'ingénieurs (Bac+5) à l'EILCO (Calais, France). Spécialité : Informatique - Parcours Intelligence Artificielle (Deep Learning, Vision par Ordinateur, MLOps, CI/CD, FastAPI). Issu de CPGE TSI au Lycée Antonin Artaud (Marseille, France).
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

=== RÈGLE DE LANGUE IMPÉRATIVE (BILINGUISME INTELLIGENT ET ZÉRO MÉLANGE) ===
- Analyse la langue de l'offre d'emploi (Description / Missions) :
  * Si l'offre est en ANGLAIS (English) ou bilingue international -> La langue par défaut est "en".
  * Si l'offre est 100% en FRANÇAIS -> La langue par défaut est "fr".
- RÈGLE D'OR ABSOLUE : INTERDICTION FORMELLE DE MÉLANGER ANGLAIS ET FRANÇAIS DANS UN MÊME CV OU UNE LETTRE DE MOTIVATION (ZÉRO "FRANGLAIS").
  Ne génère JAMAIS un résumé en anglais avec des puces en français, ou une lettre en anglais avec un CV en français.
- Pour permettre à l'utilisateur de basculer instantanément entre CV/Lettre en Anglais et CV/Lettre en Français sur son interface et Overleaf sans jamais mélanger les langues, tu DOIS générer :
  1. Les champs racine ("tailoredTitle", "tailoredSummary", "projectBullets", "coverLetter") dans la langue principale de l'offre (selon "language": "en" | "fr").
  2. Deux versions complètes dans le champ "versions" :
     - "versions.en" : { "tailoredTitle": string, "tailoredSummary": string, "projectBullets": [...], "coverLetter": string } 100% en ANGLAIS PROFESSIONNEL NATIF (verbes au prétérit : Accomplished, Engineered, Architected, Built; lettre de motivation 300-400 mots en anglais natif).
     - "versions.fr" : { "tailoredTitle": string, "tailoredSummary": string, "projectBullets": [...], "coverLetter": string } 100% en FRANÇAIS SOIGNÉ (verbes d'action : Conçu, Développé, Déployé, Optimisé; lettre de motivation 300-400 mots en français soigné).

=== RÈGLE CONTRAINTE CONVENTION DE STAGE : VÉRIFICATION DU TÉLÉTRAVAIL (FULL REMOTE) ===
- Badroudine effectue un stage PFE conventionné par son école d'ingénieurs (EILCO). Sa convention de stage INTERDIT le 100% Full Remote (le télétravail total sans présence physique n'est pas autorisé par l'école).
- Analyse soigneusement le texte de l'offre pour détecter le mode de travail :
  * "full_remote" : si l'offre est 100% à distance / télétravail complet (mots-clés : "full remote", "100% remote", "fully remote", "remote only", "100% télétravail", "télétravail total", "à distance uniquement").
  * "hybrid" : présence sur site avec télétravail partiel (ex: 2 jours de remote).
  * "onsite" : travail dans les locaux de l'entreprise.
- Si le mode est "full_remote", mets "isFullRemote": true et écris une note explicative d'alerte dans "remoteWarning" (ex: "Attention : cette offre est en 100% Full Remote. Ton école (EILCO) exige une présence sur site (hybride ou présentiel) pour valider ta convention de stage."). Sinon, "isFullRemote": false et "remoteWarning": "".

=== RÈGLE CONTRAINTE CONVENTION DE STAGE : MOBILITÉ INTERNATIONALE OBLIGATOIRE (HORS FRANCE) ===
- Le stage de fin d'études (PFE) de Badroudine doit OBLIGATOIREMENT être réalisé à l'ÉTRANGER (en dehors de la France) pour satisfaire l'obligation de mobilité internationale du diplôme d'ingénieur EILCO (ex: Suisse, Luxembourg, Belgique, Allemagne, Royaume-Uni, etc.).
- Analyse soigneusement le lieu de travail de l'offre (titre, entreprise, localisation, texte) :
  * Si l'offre est située en FRANCE (ex: Paris, Lyon, Lille, Toulouse, etc.) :
    Mets "isInFrance": true et renseigne "franceWarning": "⚠️ Alerte Convention EILCO : Cette offre est localisée en France. Votre formation exige obligatoirement un stage de fin d'études à l'étranger (Suisse, Luxembourg, Belgique, etc.) pour l'obtention du diplôme d'ingénieur."
  * Si l'offre est située à l'étranger (hors de France) :
    Mets "isInFrance": false et renseigne "franceWarning": "".

=== INSTRUCTIONS DE GÉNÉRATION ===
1. Titre ciblé : Ajuste le titre du CV pour refléter exactement le poste demandé (ex: "Machine Learning Infrastructure Intern", "Ingénieur IA / Deep Learning - Stage PFE").
2. Résumé percutant : Rédige une accroche de 3-4 phrases soulignant les compétences réelles de Badroudine qui correspondent directement aux exigences de l'offre (ex: Python, C++, Deep Learning, FastAPI, Docker, anglais C1).
3. Adaptation des projets : Réécris les puces des 2 projets principaux ("VectorWord" et "Pipeline RAG") selon la formule STAR (Accompli [X] mesuré par [Y] en faisant appel à [Z] / Accomplished [X] as measured by [Y] by doing [Z]) en insistant sur les compétences clés de l'annonce.
4. Score ATS & Couverture : Évalue de manière réaliste le score ATS (entre 80 et 96) et le taux de couverture des mots-clés selon l'adéquation.
5. Lettre de Motivation (Cover Letter) ciblée — ZÉRO BOILERPLATE, ANCRAGE RÉEL SUR L'ENTREPRISE :
- INTERDICTION FORMELLE des formules creuses ou génériques (ex: "Votre positionnement technologique et vos challenges correspondent parfaitement...", "Votre entreprise innovante m'attire...", etc.). La lettre doit prouver une compréhension aiguë de ce que fait ${company}.
- Méthodologie d'écriture obligatoire :
  * Analyse de l'entreprise : Identifie dans le texte de l'offre le cœur de métier de ${company} (secteur d'activité, produit, technologies citées, défis techniques). Cite explicitement ces éléments dans le premier paragraphe pour ancrer la lettre dans la réalité de l'entreprise.
  * En-tête professionnel soigné (SANS mention de mobilité dans les coordonnées, la mobilité doit être rédigée dans le texte final) :
    Badroudine Bacar
    Élève-Ingénieur en Informatique — Spécialité Intelligence Artificielle (Bac+5 / ING3)
    EILCO (École d'Ingénieurs du Littoral Côte d'Opale)
    Email : badroudinebacar@gmail.com | Tél : +33 7 67 56 07 86
    LinkedIn : linkedin.com/in/badroudine-bacar | GitHub : github.com/Badrouuu

    À l'attention de l'équipe Recrutement Tech
    ${company}

    Objet : Candidature — Stage de fin d'études PFE (6 mois) : ${jobTitle}
  * Corps de la lettre en 4 paragraphes percutants :
    - §1 (Accroche & Adéquation Entreprise) : Salutation formelle ("Madame, Monsieur," ou "Dear Hiring Team,"). Candidature pour le stage de 6 mois dès mars/avril 2027. Explication personnalisée de l'intérêt pour ${company} en mentionnant ses projets ou défis techniques spécifiques identifiés dans l'annonce.
    - §2 (Pont technique direct) : Relier les missions concrètes de l'offre aux réalisations réelles de Badroudine : VectorWord (FastAPI, Docker, Word2Vec, Gensim, NumPy), Pipeline RAG (Few-Shot Prompting, parsing, zéro hallucination), ou Computer Vision embarquée (Google ML Kit). Montrer en quoi cette expérience apporte une valeur immédiate.
    - §3 (Rigueur & Formation d'excellence) : Rigueur scientifique acquise en CPGE TSI au Lycée Antonin Artaud à Marseille, dernière année d'école d'ingénieurs à l'EILCO, maîtrise courante de l'anglais certifiée (TOEIC 905/990, C1) pour évoluer en milieu international.
    - §4 (Mobilité & Conclusion) : Disponibilité dès mars/avril 2027 pour 6 mois, confirmation de la mobilité géographique pour rejoindre les locaux de l'entreprise (en présentiel ou hybride), ouverture vers un entretien technique et formule de politesse formelle.
    - Signature : Badroudine Bacar
- Rédige la lettre dans les deux langues dans "versions.en.coverLetter" (100% en anglais natif percutant) et "versions.fr.coverLetter" (100% en français soigné), ainsi que dans "coverLetter" dans la langue de l'offre.

Réponds STRICTEMENT au format JSON valide respectant ce schéma :
{
  "language": "en" | "fr",
  "workplaceType": "full_remote" | "hybrid" | "onsite",
  "isFullRemote": boolean,
  "remoteWarning": "string",
  "isInFrance": boolean,
  "franceWarning": "string",
  "tailoredTitle": "string",
  "tailoredSummary": "string",
  "projectBullets": [
    {
      "project": "string",
      "bullets": ["string", "string"]
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

    // Garantir que versions contient au minimum la langue détectée
    if (!parsedResult.versions) {
      parsedResult.versions = {};
    }
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
