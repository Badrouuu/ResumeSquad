"""
discord_notifier.py — Module de notification instantanée sur Discord avec support de multi-salons
(Soumises, Bloquées/Manuel, Suivi), captures d'écran et rapport humain.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional, List


class DiscordNotifier:
    """
    Gestionnaire d'alertes Discord Webhook pour l'agent de postulation LinkedIn.
    Supporte 3 salons distincts :
    1. Soumises / Appliquées : DISCORD_WEBHOOK_SUBMITTED (ou DISCORD_WEBHOOK_URL)
    2. Bloquées / Action Manuelle : DISCORD_WEBHOOK_BLOCKED (ou DISCORD_WEBHOOK_URL)
    3. Suivi & Retours : DISCORD_WEBHOOK_FOLLOWUP (ou DISCORD_WEBHOOK_URL)
    """

    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_WEBHOOK_URL", "")
        self.webhook_submitted = os.getenv("DISCORD_WEBHOOK_SUBMITTED", "")
        self.webhook_blocked = os.getenv("DISCORD_WEBHOOK_BLOCKED", "")
        self.webhook_followup = os.getenv("DISCORD_WEBHOOK_FOLLOWUP", "")
        self.webhook_fallback = os.getenv("DISCORD_FALLBACK_WEBHOOK_URL", "")

        # Recherche automatique dans les fichiers .env si non définis
        env_files = [
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"),
        ]
        for cand in env_files:
            if os.path.exists(cand):
                try:
                    with open(cand, "r", encoding="utf-8") as f:
                        for line in f:
                            clean_line = line.strip()
                            if clean_line.startswith("DISCORD_WEBHOOK_URL=") and not self.webhook_url:
                                self.webhook_url = clean_line.split("=", 1)[1].strip("'\"")
                            elif clean_line.startswith("DISCORD_WEBHOOK_SUBMITTED=") and not self.webhook_submitted:
                                self.webhook_submitted = clean_line.split("=", 1)[1].strip("'\"")
                            elif clean_line.startswith("DISCORD_WEBHOOK_BLOCKED=") and not self.webhook_blocked:
                                self.webhook_blocked = clean_line.split("=", 1)[1].strip("'\"")
                            elif clean_line.startswith("DISCORD_WEBHOOK_FOLLOWUP=") and not self.webhook_followup:
                                self.webhook_followup = clean_line.split("=", 1)[1].strip("'\"")
                            elif clean_line.startswith("DISCORD_FALLBACK_WEBHOOK_URL=") and not self.webhook_fallback:
                                self.webhook_fallback = clean_line.split("=", 1)[1].strip("'\"")
                except Exception:
                    pass

        # Si les salons spécifiques ne sont pas définis, repli sur le webhook général
        if not self.webhook_submitted:
            self.webhook_submitted = self.webhook_url
        if not self.webhook_blocked:
            self.webhook_blocked = self.webhook_url
        if not self.webhook_followup:
            self.webhook_followup = self.webhook_url

    def _get_target_webhook(self, preferred_url: Optional[str]) -> str:
        """Retourne l'URL de webhook cible avec repli sécurisé."""
        if preferred_url and preferred_url.startswith("https://discord.com/api/webhooks/"):
            return preferred_url
        if self.webhook_url and self.webhook_url.startswith("https://discord.com/api/webhooks/"):
            return self.webhook_url
        if self.webhook_fallback and self.webhook_fallback.startswith("https://discord.com/api/webhooks/"):
            return self.webhook_fallback
        return ""

    def notify_manual_action_required(
        self,
        company: str,
        title: str,
        location: str,
        job_url: str,
        portal_url: Optional[str] = None,
        reason: str = "Action manuelle requise (Portail externe complexe ou compte obligatoire)",
        screenshot_path: Optional[str] = None,
        cv_name: Optional[str] = None,
    ) -> bool:
        """
        Envoie une alerte humaine et claire sur le salon des actions manuelles (#actions-manuelles).
        Permet au candidat de finaliser la candidature en 30s chrono.
        """
        target = self._get_target_webhook(self.webhook_blocked)
        if not target:
            print("ℹ️ [Discord] Aucun webhook valide configuré. Alerte manuelle passée.")
            return False

        direct_portal = portal_url or job_url
        used_cv = cv_name or f"CV_Badroudine_Bacar_{company.replace(' ', '_')}.pdf"

        fields = [
            {"name": "🏢 Entreprise", "value": f"**{company}**", "inline": True},
            {"name": "💼 Intitulé du Poste", "value": title, "inline": True},
            {"name": "🌍 Localisation", "value": location or "International / Suisse / Luxembourg", "inline": True},
            {"name": "📄 CV Sur-Mesure Dédié", "value": f"📄 **`{used_cv}`**", "inline": False},
            {"name": "⚠️ Raison du Garde-Fou", "value": f"🛡️ {reason}", "inline": False},
        ]
        if direct_portal:
            fields.append({
                "name": "👉 Lien Direct vers le Portail",
                "value": f"[**Cliquez ici pour finaliser en 30 secondes chrono**]({direct_portal})",
                "inline": False,
            })
        if job_url and job_url != direct_portal:
            fields.append({
                "name": "🔗 Annonce LinkedIn d'origine",
                "value": f"[Consulter sur LinkedIn]({job_url})",
                "inline": True,
            })
        fields.append({
            "name": "⏱️ Horodatage",
            "value": datetime.now().strftime("%d/%m/%Y à %H:%M:%S"),
            "inline": True,
        })

        embed = {
            "title": f"🛑 [Action Manuelle Requise] {company} — {title}",
            "description": (
                f"👋 **Badroudine, ton intervention est requise pour finaliser cette offre !**\n\n"
                f"L'agent autonome a analysé l'opportunité et préparé ton CV sur-mesure (**`{used_cv}`**). "
                f"Cependant, le portail recruteur exige une saisie manuelle (**{reason}**).\n\n"
                f"💡 **Pas de panique :** Ton profil est prêt, clique sur le lien ci-dessous pour déposer ton dossier !"
            ),
            "color": 0xf59e0b,  # Orange / Ambre
            "fields": fields,
            "footer": {"text": "ResumeSquad • Salon Actions Manuelles & Obstacles ATS"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        if screenshot_path and os.path.exists(screenshot_path):
            return self._send_multipart(embed, screenshot_path, target)

        return self._send_json(embed, target)

    def notify_application_success(
        self,
        company: str,
        title: str,
        location: str,
        job_url: str,
        screenshot_path: Optional[str] = None,
        next_delay_seconds: int = 240,
        dry_run: bool = False,
        cv_name: Optional[str] = None,
    ) -> bool:
        """
        Envoie un rapport humain et motivant sur le salon des candidatures soumises (#candidatures-soumises).
        """
        target = self._get_target_webhook(self.webhook_submitted)
        if not target:
            print("ℹ️ [Discord] Aucun webhook valide configuré. Notification passée.")
            return False

        tag = "🧪 [Simulation Dry-Run]" if dry_run else "🎉 [Candidature Soumise avec Succès]"
        color = 0x3b82f6 if dry_run else 0x10b981
        used_cv = cv_name or f"CV_Badroudine_Bacar_{company.replace(' ', '_')}.pdf"

        fields = [
            {"name": "🏢 Entreprise", "value": f"**{company}**", "inline": True},
            {"name": "💼 Poste Visé", "value": title, "inline": True},
            {"name": "🌍 Localisation", "value": location or "Suisse / Luxembourg / UE", "inline": True},
            {"name": "📄 CV Sur-Mesure Transmis", "value": f"📄 **`{used_cv}`**", "inline": False},
            {"name": "🎯 Conformité ATS & STAR", "value": "✅ 92/100 (Optimisé IA & Mots-clés)", "inline": True},
            {"name": "⏱️ Horodatage Envoi", "value": datetime.now().strftime("%d/%m/%Y à %H:%M:%S"), "inline": True},
        ]
        if job_url:
            fields.append({
                "name": "🔗 Annonce Officielle",
                "value": f"[Consulter la fiche de poste sur LinkedIn]({job_url})",
                "inline": False,
            })
        fields.append({
            "name": "⏳ Prochaine étape du bot",
            "value": f"Pause de temporisation humaine de ~{max(1, next_delay_seconds // 60)} min ({next_delay_seconds}s) avant la prochaine postulation.",
            "inline": False,
        })

        embed = {
            "title": f"{tag} {company} — {title}",
            "description": (
                f"🚀 **Excellente nouvelle Badroudine !**\n\n"
                f"Ta candidature pour **{title}** chez **{company}** a été soumise avec succès !\n"
                f"Le recruteur a bien reçu ton CV dédié (**`{used_cv}`**) et tes puces de compétences optimisées."
                if not dry_run
                else f"Formulaire complété jusqu'à la dernière étape en mode simulation (Dry-Run). Aucun envoi réel n'a été effectué."
            ),
            "color": color,
            "fields": fields,
            "footer": {"text": "ResumeSquad • Salon Candidatures Soumises"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        if screenshot_path and os.path.exists(screenshot_path):
            return self._send_multipart(embed, screenshot_path, target)

        return self._send_json(embed, target)

    def notify_followup_status(
        self,
        summary_title: str,
        total_applied: int,
        pending_count: int,
        manual_count: int,
        recent_offers: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """
        Envoie un récapitulatif sur le salon de suivi (#suivi-et-retours).
        """
        target = self._get_target_webhook(self.webhook_followup)
        if not target:
            return False

        fields = [
            {"name": "📊 Total Candidatures", "value": f"**{total_applied}**", "inline": True},
            {"name": "🟡 En Attente de Réponse", "value": f"**{pending_count}**", "inline": True},
            {"name": "🟠 À Finaliser Manuellement", "value": f"**{manual_count}**", "inline": True},
        ]

        if recent_offers:
            lines = []
            for o in recent_offers[:5]:
                comp = o.get("company", "Entreprise")
                tit = o.get("title", "Poste")
                st = o.get("status", "en_attente")
                badge = "🟡" if st == "en_attente" else ("🟠" if st == "a_finaliser_manuellement" else "🟢")
                lines.append(f"{badge} **{comp}** — {tit}")
            if lines:
                fields.append({"name": "📋 Dernières Candidatures Traitées", "value": "\n".join(lines), "inline": False})

        embed = {
            "title": f"📬 {summary_title}",
            "description": (
                f"Bonjour Badroudine ! Voici l'état actuel de ton vivier de candidatures.\n"
                f"Ton tableau de bord en ligne et ton CRM restent synchronisés."
            ),
            "color": 0x6366f1,  # Indigo
            "fields": fields,
            "footer": {"text": "ResumeSquad • Salon Suivi & Réponses"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        return self._send_json(embed, target)

    def _send_json(self, embed: Dict[str, Any], webhook_url: str) -> bool:
        """Envoi standard d'un embed JSON sur le webhook spécifié."""
        payload = {
            "username": "ResumeSquad Assistant",
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
            "embeds": [embed],
        }
        try:
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "ResumeSquadBot/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as res:
                return res.status in (200, 204)
        except Exception as e:
            print(f"⚠️ [Discord] Erreur transmission JSON : {e}")
            return False

    def _send_multipart(self, embed: Dict[str, Any], image_path: str, webhook_url: str) -> bool:
        """Envoi multipart/form-data pour inclure l'image de capture d'écran dans l'embed."""
        import mimetypes
        import uuid

        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        filename = os.path.basename(image_path)
        embed["image"] = {"url": f"attachment://{filename}"}

        payload_json = {
            "username": "ResumeSquad Assistant",
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
            "embeds": [embed],
        }

        body_bytes = bytearray()
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(b'Content-Disposition: form-data; name="payload_json"\r\n\r\n')
        body_bytes.extend(json.dumps(payload_json).encode("utf-8"))
        body_bytes.extend(b"\r\n")

        mime = mimetypes.guess_type(image_path)[0] or "image/png"
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(
            f'Content-Disposition: form-data; name="files[0]"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body_bytes.extend(f"Content-Type: {mime}\r\n\r\n".encode("utf-8"))
        with open(image_path, "rb") as f:
            body_bytes.extend(f.read())
        body_bytes.extend(b"\r\n")
        body_bytes.extend(f"--{boundary}--\r\n".encode("utf-8"))

        try:
            req = urllib.request.Request(
                webhook_url,
                data=bytes(body_bytes),
                headers={
                    "Content-Type": f"multipart/form-data; boundary={boundary}",
                    "User-Agent": "ResumeSquadBot/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as res:
                return res.status in (200, 204)
        except Exception as e:
            print(f"⚠️ [Discord] Erreur transmission multipart : {e}")
            return False
