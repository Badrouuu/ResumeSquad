import { NextResponse } from "next/server";
import { recordUserFeedback, getUserPreferences } from "@/app/data/userPreferences";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offerId = url.searchParams.get("offerId") || `manual-${Date.now()}`;
  const rawVote = url.searchParams.get("vote") || "like";
  const vote: "like" | "dislike" = rawVote === "dislike" ? "dislike" : "like";
  const company = url.searchParams.get("company") || "Entreprise";
  const title = url.searchParams.get("title") || "Offre d'emploi";

  // Enregistrement du feedback utilisateur
  const { preferences } = await recordUserFeedback({
    offerId,
    vote,
    company,
    title,
  });

  const isLike = vote === "like";
  const accentColor = isLike ? "#10b981" : "#ef4444";
  const badgeBg = isLike ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
  const badgeBorder = isLike ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ResumeSquad • Feedback Enregistré</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .icon-wrapper {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      background: ${badgeBg};
      border: 2px solid ${badgeBorder};
      box-shadow: 0 0 20px ${isLike ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"};
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }
    .target-company {
      font-size: 1.1rem;
      font-weight: 600;
      color: ${accentColor};
      margin-bottom: 0.25rem;
    }
    .target-title {
      font-size: 0.85rem;
      color: #a1a1aa;
      margin-bottom: 1.25rem;
    }
    .explanation {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.85rem;
      padding: 1rem;
      font-size: 0.85rem;
      line-height: 1.5;
      color: #d4d4d8;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .explanation strong {
      color: #ffffff;
    }
    .stats-row {
      display: flex;
      justify-content: space-around;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .stat-pill {
      flex: 1;
      padding: 0.6rem 0.5rem;
      background: #27272a;
      border-radius: 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .stat-liked { color: #34d399; }
    .stat-disliked { color: #f87171; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 0.85rem 1.25rem;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.92;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #71717a;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      ${isLike ? "👍" : "👎"}
    </div>
    <h1>${isLike ? "Opportunité Plébiscitée !" : "Offre Écartée !"}</h1>
    <div class="target-company">${company}</div>
    <div class="target-title">${title}</div>

    <div class="explanation">
      ${
        isLike
          ? `🎯 <strong>Apprentissage Actif pris en compte :</strong> Le bot a identifié votre intérêt fort pour <strong>${company}</strong>. Son score de priorité est boosté de <strong>+120 points</strong> pour les prochains cycles d'exploration en Suisse, Luxembourg, Belgique et Allemagne.`
          : `🛡️ <strong>Apprentissage Actif pris en compte :</strong> Le bot a noté que <strong>${company}</strong> ne correspond pas à votre recherche. Les offres similaires seront désormais rétrogradées (<strong>-350 points</strong>) et filtrées pour ne plus encombrer vos alertes.`
      }
    </div>

    <div class="stats-row">
      <div class="stat-pill stat-liked">
        ⭐ ${preferences.likedCompanies.length} favorites
      </div>
      <div class="stat-pill stat-disliked">
        🚫 ${preferences.dislikedCompanies.length} écartées
      </div>
    </div>

    <a href="/" class="btn">🚀 Ouvrir le Dashboard ResumeSquad</a>
    <div class="footer-note">Vous pouvez fermer cet onglet ou revenir sur Discord.</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { offerId, vote, company, title, keywords } = body;

    if (!offerId || !vote) {
      return NextResponse.json(
        { success: false, error: "offerId et vote requis" },
        { status: 400 }
      );
    }

    const result = await recordUserFeedback({
      offerId,
      vote: vote === "dislike" ? "dislike" : "like",
      company,
      title,
      keywords,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      preferences: result.preferences,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur enregistrement feedback" },
      { status: 500 }
    );
  }
}
