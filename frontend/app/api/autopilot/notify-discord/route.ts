import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const webhookUrl = body.webhookUrl || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        {
          success: false,
          error: "URL de Webhook Discord invalide. L'URL doit commencer par https://discord.com/api/webhooks/",
        },
        { status: 400 }
      );
    }

    const {
      type = "test",
      company = "Entreprise Internationale",
      title = "Stage Ingénieur IA",
      atsScore = 92,
      country = "Suisse 🇨🇭",
      jobUrl = "",
      errorReason = "",
      actionUrl = "",
    } = body;

    let embed;

    if (type === "test") {
      embed = {
        title: "🤖 [ResumeSquad] Test du Webhook Discord Réussi !",
        description:
          "Ton bot autonome est correctement connecté à ce canal Discord.\nTu recevras ici les alertes de candidatures automatiques et les pings en cas de blocage (Captcha, formulaires sécurisés).",
        color: 0x3b82f6, // Bleu
        fields: [
          { name: "Statut de l'Agent", value: "🟢 Opérationnel", inline: true },
          { name: "Modèle IA", value: "Gemini 2.5 Flash", inline: true },
          { name: "Mode", value: "Auto-Pilot Actif", inline: true },
        ],
        footer: { text: "ResumeSquad • Multi-Agent Autonomous Copilot" },
        timestamp: new Date().toISOString(),
      };
    } else if (type === "blocked" || type === "action_required") {
      embed = {
        title: `⚠️ [ResumeSquad Auto-Pilot] Action Requise : ${company}`,
        description: `L'agent autonome a analysé et adapté ton CV, mais **un obstacle nécessite ton intervention humaine** pour finaliser l'envoi.`,
        color: 0xf59e0b, // Ambre / Orange
        fields: [
          { name: "🏢 Entreprise", value: company, inline: true },
          { name: "💼 Poste", value: title, inline: true },
          { name: "🌍 Lieu", value: country, inline: true },
          { name: "🎯 Score ATS estimé", value: `${atsScore}/100`, inline: true },
          { name: "🛑 Obstacle détecté", value: errorReason || "Captcha ou question éliminatoire", inline: false },
          { name: "🔗 Formulaire direct", value: jobUrl ? `[Cliquer pour ouvrir l'offre](${jobUrl})` : "Non spécifié", inline: false },
        ],
        footer: { text: "ResumeSquad • Human-in-the-Loop Escalation" },
        timestamp: new Date().toISOString(),
      };
    } else {
      // Candidature générée avec succès
      embed = {
        title: `🚀 [ResumeSquad Auto-Pilot] Nouvelle Candidature Préparée : ${company}`,
        description: `L'escouade d'agents a scanné l'offre, réécrit le CV en format STAR et rédigé la lettre executive.`,
        color: 0x10b981, // Émeraude / Vert
        fields: [
          { name: "🏢 Entreprise", value: company, inline: true },
          { name: "💼 Poste", value: title, inline: true },
          { name: "🌍 Localisation", value: country, inline: true },
          { name: "🎯 Score ATS", value: `${atsScore}/100`, inline: true },
          { name: "🔗 Offre source", value: jobUrl ? `[Lien de l'offre](${jobUrl})` : "Archivée", inline: false },
        ],
        footer: { text: "ResumeSquad • Autonomous Scout & Dispatch" },
        timestamp: new Date().toISOString(),
      };
    }

    const payload = {
      username: "ResumeSquad Copilot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
      embeds: [embed],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: `Erreur Discord HTTP ${res.status}: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Notification Discord transmise avec succès !" });
  } catch (error: any) {
    console.error("Erreur Webhook Discord:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne webhook" },
      { status: 500 }
    );
  }
}
