import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url?.trim();

    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return NextResponse.json(
        { success: false, error: "URL invalide. L'URL doit commencer par http:// ou https://" },
        { status: 400 }
      );
    }

    // Support natif Greenhouse ATS (ex: Waymo, Stripe, Figma, etc. avec gh_jid)
    const ghJidMatch = url.match(/[?&]gh_jid=(\d+)/) || url.match(/\/jobs\/(\d+)/);
    if (url.includes("greenhouse") || url.includes("gh_jid") || ghJidMatch) {
      let board = "";
      if (url.includes("waymo")) board = "waymo";
      else if (url.includes("boards.greenhouse.io/")) {
        const parts = url.split("boards.greenhouse.io/")[1].split("/");
        board = parts[0];
      } else {
        const host = new URL(url).hostname;
        const cleanHost = host.replace("careers.", "").replace("jobs.", "").split(".")[0];
        board = cleanHost.replace("with", "");
      }

      const jobId = ghJidMatch ? ghJidMatch[1] : null;
      if (board && jobId) {
        try {
          const ghRes = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`, {
            headers: { Accept: "application/json" },
            next: { revalidate: 0 },
          });

          if (ghRes.ok) {
            const ghData = await ghRes.json();
            let content = (ghData.content || "")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&nbsp;/g, " ");

            content = content.replace(/<(h[1-6]|p|div|section|article)[^>]*>/gi, "\n");
            content = content.replace(/<li[^>]*>/gi, "\n- ");
            content = content.replace(/<br\s*\/?>/gi, "\n");
            content = content.replace(/<[^>]+>/g, " ");

            const ghLines = content
              .split("\n")
              .map((l: string) => l.trim())
              .filter((l: string) => l.length > 0 && l !== "-");

            const finalContent = ghLines.join("\n").slice(0, 6000);

            return NextResponse.json({
              success: true,
              raw_text: finalContent,
              title: ghData.title || "Poste d'Ingénieur",
              company: board.charAt(0).toUpperCase() + board.slice(1),
              url,
            });
          }
        } catch (e) {
          console.warn("Erreur fallback Greenhouse:", e);
        }
      }
    }

    // Détection des sites à forte protection anti-bot (LinkedIn, Indeed authwall, etc.)
    const isLinkedIn = url.includes("linkedin.com");
    const isIndeed = url.includes("indeed.com") || url.includes("indeed.fr");
    const isWTTJ = url.includes("welcometothejungle.com");

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 999 || response.status === 429) {
        return NextResponse.json({
          success: false,
          blocked: true,
          error: "anti_bot",
          message:
            "Ce site d'emploi bloque l'extraction automatique pour des raisons de sécurité (anti-bot). Veuillez copier et coller directement le texte de l'annonce dans l'onglet '📝 Texte'.",
        });
      }
      return NextResponse.json(
        { success: false, error: `Erreur HTTP ${response.status} lors de l'accès à la page.` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Vérification si la page est une redirection vers un mur d'authentification (ex: LinkedIn AuthWall)
    if (
      isLinkedIn &&
      (html.includes("authwall") || html.includes("Sign in") || html.includes("S’identifier"))
    ) {
      return NextResponse.json({
        success: false,
        blocked: true,
        error: "authwall",
        message:
          "LinkedIn requiert une connexion pour afficher cette offre. Conseil : copie simplement le texte de l'offre sur LinkedIn et colle-le dans l'onglet '📝 Texte'.",
      });
    }

    // 1. Extraction des métadonnées (titre, entreprise, description)
    let extractedTitle = "";
    let extractedCompany = "";

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      extractedTitle = titleMatch[1].trim();
    }

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      extractedTitle = ogTitleMatch[1].trim();
    }

    const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    if (ogSiteMatch && ogSiteMatch[1]) {
      extractedCompany = ogSiteMatch[1].trim();
    }

    // Nettoyage du titre si format type "Stage IA - Google | Job Board"
    if (extractedTitle) {
      const parts = extractedTitle.split(/[-–|]/);
      if (parts.length >= 2 && !extractedCompany) {
        extractedCompany = parts[parts.length - 1].trim();
      }
    }

    // 2. Nettoyage du HTML pour extraire le texte utile
    let cleanText = html;

    // Supprimer les balises script, style, svg, header, footer, nav
    cleanText = cleanText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
    cleanText = cleanText.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
    cleanText = cleanText.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
    cleanText = cleanText.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");
    cleanText = cleanText.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ");
    cleanText = cleanText.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");
    cleanText = cleanText.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");

    // Remplacer les balises de structure par des sauts de ligne
    cleanText = cleanText.replace(/<(h[1-6]|p|div|section|article)[^>]*>/gi, "\n");
    cleanText = cleanText.replace(/<li[^>]*>/gi, "\n- ");
    cleanText = cleanText.replace(/<br\s*\/?>/gi, "\n");

    // Supprimer toutes les autres balises HTML
    cleanText = cleanText.replace(/<[^>]+>/g, " ");

    // Décoder les entités HTML courantes
    cleanText = cleanText
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&eacute;/gi, "é")
      .replace(/&egrave;/gi, "è")
      .replace(/&agrave;/gi, "à")
      .replace(/&ecirc;/gi, "ê")
      .replace(/&ccedil;/gi, "ç");

    // Nettoyer les espaces et sauts de ligne consécutifs
    const lines = cleanText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== "-" && !line.startsWith("{") && !line.endsWith("}"));

    const finalRawText = lines.join("\n").slice(0, 5000);

    if (finalRawText.length < 50) {
      return NextResponse.json({
        success: false,
        blocked: true,
        message:
          "Le contenu de cette page n'a pas pu être extrait (site protégé ou rendu dynamique JS). Copiez-collez directement le texte de l'offre dans l'onglet '📝 Texte'.",
      });
    }

    return NextResponse.json({
      success: true,
      raw_text: finalRawText,
      title: extractedTitle || "Offre d'emploi ciblée",
      company: extractedCompany || (isWTTJ ? "Entreprise WTTJ" : isIndeed ? "Entreprise Indeed" : "Entreprise"),
      url,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur interne lors de l'extraction de l'URL.",
      },
      { status: 500 }
    );
  }
}
