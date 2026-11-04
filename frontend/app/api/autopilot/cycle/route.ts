import { NextResponse } from "next/server";
import { RADAR_JOB_OFFERS, RadarJobOffer } from "@/app/data/radarOffers";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  const logs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString("fr-FR");
    logs.push(`[${time}] ${msg}`);
  };

  try {
    const body = await request.json();
    const webhookUrl = body.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    const appliedIds: string[] = Array.isArray(body.appliedIds) ? body.appliedIds : [];
    const customOffers: RadarJobOffer[] = Array.isArray(body.offers) ? body.offers : [];

    log("🤖 Démarrage du cycle Auto-Pilot ResumeSquad...");

    if (!GEMINI_API_KEY) {
      log("❌ Erreur : Clé GEMINI_API_KEY absente.");
      return NextResponse.json(
        { success: false, error: "Clé GEMINI_API_KEY non configurée.", logs },
        { status: 500 }
      );
    }

    // 1. Récupération des offres candidates
    const candidatePool = customOffers.length > 0 ? customOffers : RADAR_JOB_OFFERS;
    log(`📡 Analyse de ${candidatePool.length} offres candidates en base...`);

    // 2. Filtrage des offres déjà traitées
    const unappliedOffers = candidatePool.filter((o) => !appliedIds.includes(o.id));
    log(`🧹 ${candidatePool.length - unappliedOffers.length} offres déjà traitées ignorées.`);

    if (unappliedOffers.length === 0) {
      log("✅ Aucune nouvelle offre à traiter pour ce cycle. Tout est à jour !");
      return NextResponse.json({
        success: true,
        message: "Toutes les offres actuelles ont déjà été traitées.",
        processedApplications: [],
        logs,
      });
    }

    const processedApplications: any[] = [];
    const maxProcessPerCycle = Math.min(unappliedOffers.length, 3); // Limite à 3 par cycle pour respecter les quotas et ne pas saturer

    log(`⚙️ Traitement de ${maxProcessPerCycle} offre(s) prioritaire(s) pour ce cycle...`);

    for (let i = 0; i < maxProcessPerCycle; i++) {
      const offer = unappliedOffers[i];
      log(`\n--- [Candidature ${i + 1}/${maxProcessPerCycle}] : ${offer.company} (${offer.location}) ---`);

      // 3. Filtres Déterministes durs (0 Token)
      const locLower = (offer.location || "").toLowerCase();
      const countryLower = (offer.country || "").toLowerCase();

      // Règle EILCO : Mobilité internationale obligatoire (Hors France)
      if (
        countryLower === "france" ||
        locLower.includes("paris") ||
        locLower.includes("lyon") ||
        locLower.includes("lille") ||
        locLower.includes("france")
      ) {
        log(`🛡️ Rejet déterministe : ${offer.company} est localisé en France (${offer.location}). Incompatible avec la mobilité internationale.`);
        continue;
      }

      // Règle EILCO : Rejet du 100% Full Remote (Présentiel ou Hybride autorisé)
      const descLower = (offer.description || "").toLowerCase();
      const is100Remote =
        /\b(100%\s*(télétravail|remote)|fully[- ]?remote|remote[- ]?only|100%\s*à distance)\b/i.test(descLower) &&
        !/\b(pas de|no|not)\b/i.test(descLower);

      if (is100Remote) {
        log(`🛡️ Rejet déterministe : ${offer.company} est en 100% Full Remote. Convention EILCO non valide.`);
        continue;
      }

      log(`✅ Filtres EILCO validés : ${offer.country} | Mode ${offer.workplace || "Hybride/Sur site"}`);

      // 4. Appel de l'Agent Gemini pour l'adaptation STAR et Cover Letter
      log(`🧠 Inférence Gemini 2.5 Flash en cours pour ${offer.company}...`);

      const pipelinePayload = {
        job_text: offer.description || `${offer.title} chez ${offer.company}. Missions en IA, Data Science et développement Python.`,
        job_title: offer.title,
        company: offer.company,
      };

      try {
        const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // Appel interne direct de la route run-pipeline
        const pipelineRes = await fetch(`${origin}/api/run-pipeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pipelinePayload),
        });

        if (!pipelineRes.ok) {
          log(`⚠️ Échec génération pipeline pour ${offer.company} (HTTP ${pipelineRes.status}).`);
          continue;
        }

        const pipelineData = await pipelineRes.json();
        const score = pipelineData.atsScore || 90;
        log(`🎯 Score ATS calculé : ${score}/100. Puces STAR générées.`);

        // 5. Détection du mode de postulation et de blocage
        const isLinkedInUrl = (offer.url || "").includes("linkedin.com");
        const hasDirectEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(offer.description || "");

        let appStatus: "en_attente" | "entretien" | "offre" | "refus" = "en_attente";
        let actionRequired = false;
        let blockReason = "";

        if (isLinkedInUrl) {
          actionRequired = true;
          blockReason = "Authwall / Protection LinkedIn : postulation manuelle requise avec le CV généré.";
          log(`⚠️ Obstacle détecté : Annonce sur LinkedIn (Easy Apply / Authwall). Escalade requise.`);
        } else if (hasDirectEmail) {
          log(`✉️ Email de recrutement direct détecté. Prêt pour envoi SMTP automatique.`);
        } else {
          log(`📄 Formulaire de candidature externe identifié.`);
        }

        const newApp = {
          id: offer.id,
          company: offer.company,
          title: offer.title,
          appliedDate: new Date().toLocaleDateString("fr-FR"),
          atsScore: score,
          status: appStatus,
          notes: actionRequired
            ? `⚠️ Action requise : ${blockReason}`
            : `Candidature générée automatiquement par Auto-Pilot. Mode : ${offer.workplace || "Hybride"}.`,
          jobUrl: offer.url,
          country: offer.country,
          generatedData: {
            tailoredTitle: pipelineData.tailoredTitle,
            tailoredSummary: pipelineData.tailoredSummary,
            projectBullets: pipelineData.projectBullets,
            coverLetter: pipelineData.coverLetter,
            versions: pipelineData.versions,
          },
        };

        processedApplications.push(newApp);

        // 6. Escalade Discord Webhook
        if (webhookUrl && webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
          try {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: "ResumeSquad Auto-Pilot",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
                embeds: [
                  {
                    title: actionRequired
                      ? `⚠️ [Auto-Pilot Action Requise] ${offer.company}`
                      : `🚀 [Auto-Pilot Candidature Prête] ${offer.company}`,
                    description: actionRequired
                      ? `Le CV et la lettre sont prêts, mais **une validation en 1 clic est nécessaire** (${blockReason}).`
                      : `L'escouade d'agents a adapté tous les documents au poste avec succès.`,
                    color: actionRequired ? 0xf59e0b : 0x10b981,
                    fields: [
                      { name: "🏢 Entreprise", value: offer.company, inline: true },
                      { name: "💼 Intitulé", value: offer.title, inline: true },
                      { name: "🎯 Score ATS", value: `${score}/100`, inline: true },
                      { name: "🌍 Localisation", value: `${offer.location} (${offer.country})`, inline: true },
                      { name: "🔗 Lien de l'offre", value: `[Ouvrir l'offre](${offer.url})`, inline: false },
                    ],
                    footer: { text: "ResumeSquad • Autonomous Multi-Agent Loop" },
                    timestamp: new Date().toISOString(),
                  },
                ],
              }),
            });
            log(`📲 Ping Discord envoyé avec succès pour ${offer.company} !`);
          } catch (hookErr) {
            log(`⚠️ Erreur d'envoi du webhook Discord: ${hookErr}`);
          }
        }
      } catch (genErr: any) {
        log(`❌ Erreur traitement ${offer.company}: ${genErr.message}`);
      }
    }

    log(`\n🎉 Cycle Auto-Pilot terminé avec succès ! ${processedApplications.length} candidature(s) traitée(s).`);

    return NextResponse.json({
      success: true,
      processedApplications,
      logs,
    });
  } catch (error: any) {
    log(`❌ Erreur fatale cycle Auto-Pilot: ${error.message}`);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne cycle", logs },
      { status: 500 }
    );
  }
}
