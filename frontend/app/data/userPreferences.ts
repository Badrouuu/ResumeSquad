import fs from "fs/promises";
import path from "path";

export interface PreferenceFeedbackItem {
  timestamp: string;
  offerId: string;
  vote: "like" | "dislike";
  company: string;
  title: string;
}

export interface UserJobPreferences {
  likedOfferIds: string[];
  dislikedOfferIds: string[];
  likedCompanies: string[];
  dislikedCompanies: string[];
  likedKeywords: string[];
  dislikedKeywords: string[];
  feedbackHistory: PreferenceFeedbackItem[];
  stats: {
    totalLikes: number;
    totalDislikes: number;
    lastUpdated?: string;
  };
}

export const DEFAULT_PREFERENCES: UserJobPreferences = {
  likedOfferIds: [],
  dislikedOfferIds: [],
  likedCompanies: ["Distalmotion", "Sony AI", "EPFL", "CERN", "Nvidia"],
  dislikedCompanies: [],
  likedKeywords: [
    "computer vision",
    "machine vision",
    "deep learning",
    "vision par ordinateur",
    "pytorch",
    "yolo",
    "opencv",
    "robotics",
    "edge ai",
    "mlops",
    "rag",
    "transformers",
  ],
  dislikedKeywords: [
    "wordpress",
    "php",
    "salesforce",
    "drupal",
    "prestashop",
    "angularjs",
    "cobol",
  ],
  feedbackHistory: [],
  stats: {
    totalLikes: 0,
    totalDislikes: 0,
  },
};

/**
 * Résout le chemin vers backend/data/user_preferences.json
 * Supporte l'exécution depuis la racine du repo ou depuis le sous-dossier frontend.
 */
function getPreferencesFilePath(): string {
  const cwd = process.cwd();
  // Si le cwd est /frontend
  const pathFromFrontend = path.resolve(cwd, "..", "backend", "data", "user_preferences.json");
  // Si le cwd est la racine
  const pathFromRoot = path.resolve(cwd, "backend", "data", "user_preferences.json");

  try {
    const fsSync = require("fs");
    if (fsSync.existsSync(path.dirname(pathFromFrontend))) {
      return pathFromFrontend;
    }
  } catch {}

  return pathFromRoot;
}

let inMemoryPreferences: UserJobPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Récupère les préférences utilisateur persistées.
 */
export async function getUserPreferences(): Promise<UserJobPreferences> {
  const filePath = getPreferencesFilePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    inMemoryPreferences = {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      likedOfferIds: Array.isArray(parsed.likedOfferIds) ? parsed.likedOfferIds : [],
      dislikedOfferIds: Array.isArray(parsed.dislikedOfferIds) ? parsed.dislikedOfferIds : [],
      likedCompanies: Array.isArray(parsed.likedCompanies) ? parsed.likedCompanies : [],
      dislikedCompanies: Array.isArray(parsed.dislikedCompanies) ? parsed.dislikedCompanies : [],
      likedKeywords: Array.isArray(parsed.likedKeywords) ? parsed.likedKeywords : DEFAULT_PREFERENCES.likedKeywords,
      dislikedKeywords: Array.isArray(parsed.dislikedKeywords) ? parsed.dislikedKeywords : DEFAULT_PREFERENCES.dislikedKeywords,
      feedbackHistory: Array.isArray(parsed.feedbackHistory) ? parsed.feedbackHistory : [],
      stats: parsed.stats || { totalLikes: 0, totalDislikes: 0 },
    };
    return inMemoryPreferences;
  } catch {
    // Si le fichier n'existe pas encore, on le crée avec les valeurs par défaut
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_PREFERENCES, null, 2), "utf-8");
    } catch {}
    return inMemoryPreferences;
  }
}

/**
 * Sauvegarde les préférences utilisateur de façon atomique.
 */
export async function saveUserPreferences(prefs: UserJobPreferences): Promise<void> {
  inMemoryPreferences = prefs;
  const filePath = getPreferencesFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(prefs, null, 2), "utf-8");
  } catch (err) {
    console.warn("⚠️ Impossible d'écrire user_preferences.json sur le disque:", err);
  }
}

/**
 * Applique un vote utilisateur (Like / Dislike) depuis Discord ou l'App Web.
 */
export async function recordUserFeedback(params: {
  offerId: string;
  vote: "like" | "dislike";
  company?: string;
  title?: string;
  keywords?: string[];
}): Promise<{ preferences: UserJobPreferences; message: string }> {
  const current = await getUserPreferences();
  const { offerId, vote, company = "", title = "", keywords = [] } = params;

  const cleanCompany = company.trim();
  const normCompany = cleanCompany.toLowerCase();

  // 1. Mise à jour des listes d'offres
  const likedOfferIds = new Set(current.likedOfferIds);
  const dislikedOfferIds = new Set(current.dislikedOfferIds);

  // 2. Mise à jour des entreprises
  const likedCompanies = new Set(current.likedCompanies);
  const dislikedCompanies = new Set(current.dislikedCompanies);

  if (vote === "like") {
    likedOfferIds.add(offerId);
    dislikedOfferIds.delete(offerId);

    if (cleanCompany) {
      // Retirer des disliked
      for (const comp of Array.from(dislikedCompanies)) {
        if (comp.toLowerCase() === normCompany) dislikedCompanies.delete(comp);
      }
      // Ajouter aux liked si non présent
      let alreadyInLiked = false;
      for (const comp of Array.from(likedCompanies)) {
        if (comp.toLowerCase() === normCompany) {
          alreadyInLiked = true;
          break;
        }
      }
      if (!alreadyInLiked) likedCompanies.add(cleanCompany);
    }
  } else {
    dislikedOfferIds.add(offerId);
    likedOfferIds.delete(offerId);

    if (cleanCompany) {
      // Retirer des liked
      for (const comp of Array.from(likedCompanies)) {
        if (comp.toLowerCase() === normCompany) likedCompanies.delete(comp);
      }
      // Ajouter aux disliked
      let alreadyInDisliked = false;
      for (const comp of Array.from(dislikedCompanies)) {
        if (comp.toLowerCase() === normCompany) {
          alreadyInDisliked = true;
          break;
        }
      }
      if (!alreadyInDisliked) dislikedCompanies.add(cleanCompany);
    }
  }

  // 3. Détection de mots-clés clés si vote positif (ex: vision, robotics)
  const likedKeywords = new Set(current.likedKeywords);
  if (vote === "like") {
    const combined = `${title} ${keywords.join(" ")}`.toLowerCase();
    if (combined.includes("vision") || combined.includes("opencv") || combined.includes("image")) {
      likedKeywords.add("machine vision");
      likedKeywords.add("computer vision");
    }
    if (combined.includes("deep learning") || combined.includes("neural")) {
      likedKeywords.add("deep learning");
    }
    if (combined.includes("robot") || combined.includes("autonomous")) {
      likedKeywords.add("robotics");
    }
    if (combined.includes("embedded") || combined.includes("edge")) {
      likedKeywords.add("edge ai");
    }
  }

  // 4. Historique
  const newHistoryItem: PreferenceFeedbackItem = {
    timestamp: new Date().toISOString(),
    offerId,
    vote,
    company: cleanCompany || "Inconnue",
    title: title.trim() || "Poste",
  };

  const updatedHistory = [newHistoryItem, ...current.feedbackHistory.slice(0, 49)];

  const totalLikes = Array.from(likedOfferIds).length;
  const totalDislikes = Array.from(dislikedOfferIds).length;

  const updatedPrefs: UserJobPreferences = {
    likedOfferIds: Array.from(likedOfferIds),
    dislikedOfferIds: Array.from(dislikedOfferIds),
    likedCompanies: Array.from(likedCompanies),
    dislikedCompanies: Array.from(dislikedCompanies),
    likedKeywords: Array.from(likedKeywords),
    dislikedKeywords: current.dislikedKeywords,
    feedbackHistory: updatedHistory,
    stats: {
      totalLikes,
      totalDislikes,
      lastUpdated: new Date().toISOString(),
    },
  };

  await saveUserPreferences(updatedPrefs);

  const message =
    vote === "like"
      ? `Préférence enregistrée : ${cleanCompany || "Cette opportunité"} a été ajoutée à vos favoris prioritaires.`
      : `Préférence enregistrée : ${cleanCompany || "Cette opportunité"} et les profils similaires seront désormais écartés de l'Auto-Pilot.`;

  return { preferences: updatedPrefs, message };
}
