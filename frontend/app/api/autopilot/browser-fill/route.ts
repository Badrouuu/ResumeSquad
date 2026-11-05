import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      url,
      company = "Entreprise",
      title = "Ingénieur IA & ML",
      webhookUrl = process.env.DISCORD_WEBHOOK_URL || "",
      autoSubmit = false,
      headless = false,
    } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL manquante" },
        { status: 400 }
      );
    }

    const cwd = process.cwd();
    // Résout le script Python depuis frontend/ ou racine
    const scriptPathFromFrontend = path.resolve(cwd, "..", "backend", "app", "browser_applicant.py");
    const scriptPathFromRoot = path.resolve(cwd, "backend", "app", "browser_applicant.py");
    const scriptPath = require("fs").existsSync(scriptPathFromFrontend)
      ? scriptPathFromFrontend
      : scriptPathFromRoot;

    const baseDir = path.dirname(path.dirname(scriptPath));

    const cleanCompany = company.replace(/["\\]/g, "");
    const cleanTitle = title.replace(/["\\]/g, "");

    const cmd = [
      "python",
      `"${scriptPath}"`,
      `--url "${url}"`,
      `--company "${cleanCompany}"`,
      `--title "${cleanTitle}"`,
      headless ? "--headless" : "",
      autoSubmit ? "--auto-submit" : "",
      webhookUrl ? `--webhook "${webhookUrl}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Exécution du script Python Playwright
    const { stdout, stderr } = await execPromise(cmd, {
      cwd: baseDir,
      timeout: 90000, // 90 secondes max
      maxBuffer: 1024 * 1024 * 5,
    });

    const logs = (stdout + "\n" + stderr)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Extraction du chemin du screenshot depuis les logs
    let screenshotPath: string | null = null;
    const match = stdout.match(/Capture enregistrée : (.*\.png)/);
    if (match) {
      screenshotPath = match[1].trim();
    }

    return NextResponse.json({
      success: true,
      message: "Formulaire pré-rempli et capture d'écran générée avec succès !",
      screenshot: screenshotPath,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors du lancement du navigateur Playwright",
      },
      { status: 500 }
    );
  }
}
