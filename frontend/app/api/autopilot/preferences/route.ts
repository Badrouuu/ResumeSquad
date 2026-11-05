import { NextResponse } from "next/server";
import {
  getUserPreferences,
  saveUserPreferences,
  DEFAULT_PREFERENCES,
} from "@/app/data/userPreferences";

export async function GET() {
  try {
    const preferences = await getUserPreferences();
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur chargement préférences" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await getUserPreferences();

    const updated = {
      ...current,
      ...body,
      stats: {
        ...current.stats,
        lastUpdated: new Date().toISOString(),
      },
    };

    await saveUserPreferences(updated);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur sauvegarde préférences" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await saveUserPreferences(DEFAULT_PREFERENCES);
    return NextResponse.json({
      success: true,
      message: "Préférences réinitialisées aux valeurs par défaut.",
      preferences: DEFAULT_PREFERENCES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur réinitialisation" },
      { status: 500 }
    );
  }
}
