import { NextResponse } from "next/server";
import {
  RADAR_JOB_OFFERS,
  RadarJobOffer,
  calculateOfferPriority,
} from "@/app/data/radarOffers";
import { runGeminiPipeline } from "@/app/api/run-pipeline/pipelineService";

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

    // 3. Filtrage linguistique strict (0 Token) & Éligibilité EILCO
    let langRejections = 0;
    let eilcoRejections = 0;

    const evaluatedOffers = unappliedOffers.map((offer) => {
      const priority = calculateOfferPriority(offer);
      return { offer, priority };
    });

    const eligibleOffers = evaluatedOffers.filter(({ priority }) => {
      if (!priority.isEligible) {
        const reason = priority.rejectionReason || "";
        if (
          reason.includes("allemand") ||
          reason.includes("néerlandais") ||
          reason.includes("langue")
        ) {
          langRejections++;
        } else {
          eilcoRejections++;
        }
        return false;
      }
      return true;
    });

    if (langRejections > 0) {
      log(`🌐 Filtrage linguistique : ${langRejections} offre(s) écartée(s) (allemand/néerlandais non parlés). Badroudine postule en FR 🇫🇷 ou EN 🇬🇧.`);
    }
    if (eilcoRejections > 0) {
      log(`🛡️ Filtrage EILCO : ${eilcoRejections} offre(s) non éligibles écartées (100% Full Remote ou France).`);
    }

    if (eligibleOffers.length === 0) {
      log("⚠️ Aucune offre restante ne satisfait les critères d'éligibilité (Langue FR/EN + Présentiel/Hybride EILCO).");
      return NextResponse.json({
        success: true,
        message: "Aucune offre éligible FR/EN pour ce cycle.",
        processedApplications: [],
        logs,
      });
    }

    // 4. Tri par Priorité Stratégique (Ultra-fraîcheur < 24h & Faible concurrence < 10-25 candidats)
    eligibleOffers.sort((a, b) => b.priority.score - a.priority.score);

    const maxProcessPerCycle = Math.min(eligibleOffers.length, 3);
    const topBatch = eligibleOffers.slice(0, maxProcessPerCycle);

    log(`⚡ Priorisation stratégique activée : Sélection des ${maxProcessPerCycle} offre(s) les plus fraîches et à plus faible concurrence :`);
    topBatch.forEach(({ offer, priority }, idx) => {
      log(`   #${idx + 1} [Score ${priority.score}] ${offer.company} — ${offer.title} (${priority.priorityBadges.join(" | ")})`);
    });

    const processedApplications: any[] = [];

    for (let i = 0; i < topBatch.length; i++) {
      const { offer, priority } = topBatch[i];
      log(`\n--- [Candidature ${i + 1}/${topBatch.length}] : ${offer.company} (${offer.location}) ---`);
      log(`🎯 Atouts ciblés : ${priority.priorityBadges.join(" • ")}`);
      log(`🧠 Inférence Gemini (Multi-Modèle avec Failover) en cours pour ${offer.company}...`);

      try {
        const pipelineData = await runGeminiPipeline({
          jobText: offer.description || `${offer.title} chez ${offer.company}. Missions en IA, Data Science et développement Python.`,
          jobTitle: offer.title,
          company: offer.company,
        });

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
            : `Candidature générée automatiquement par Auto-Pilot. Mode : ${offer.workplace || "Hybride"}. ${priority.priorityBadges.join(" • ")}`,
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
                      { name: "🌐 Langue", value: priority.detectedLang === "en" ? "Anglais 🇬🇧" : "Français 🇫🇷", inline: true },
                      { name: "⚡ Fraîcheur & Candidats", value: priority.priorityBadges.join(" • "), inline: false },
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

        // Pause de 1.2s entre chaque génération pour respecter les quotas de burst API
        await new Promise((r) => setTimeout(r, 1200));
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
