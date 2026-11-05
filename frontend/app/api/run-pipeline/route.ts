import { NextResponse } from "next/server";
import { runGeminiPipeline } from "./pipelineService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runGeminiPipeline({
      jobText: body.job_text || "",
      jobTitle: body.job_title || "Ingénieur IA",
      company: body.company || "",
    });
    return NextResponse.json(result);
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
