import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// Chemins des fichiers de suivi
function getPaths() {
  const cwd = process.cwd();
  const isServerless = process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  const rootDir = fs.existsSync(path.resolve(cwd, "backend"))
    ? cwd
    : path.resolve(cwd, "..");
  const backendDir = path.resolve(rootDir, "backend");
  const scriptPath = path.resolve(backendDir, "run_linkedin_easy_apply.py");

  // En environnement serverless (Vercel / AWS Lambda), le système de fichiers est strictement en lecture seule (/var/task).
  // Seul le dossier /tmp est accessible en écriture.
  const dataDir = isServerless
    ? path.resolve("/tmp", "backend_data")
    : path.resolve(backendDir, "data");

  const logFile = path.resolve(dataDir, "linkedin_bot.log");
  const pidFile = path.resolve(dataDir, "linkedin_bot.pid");
  const applicationsHistoryFile = path.resolve(dataDir, "applications_history.json");
  const frontendAppliedFile = path.resolve(dataDir, "frontend_applied_ids.json");

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    // Ignore les erreurs de création en environnement de lecture seule
  }

  return { rootDir, backendDir, scriptPath, dataDir, logFile, pidFile, applicationsHistoryFile, frontendAppliedFile, isServerless };
}

// Vérifie si un processus est en cours d'exécution
async function isProcessRunning(pid: number): Promise<boolean> {
  if (!pid || pid <= 0) return false;
  try {
    if (process.platform === "win32") {
      const { stdout } = await execPromise(`tasklist /FI "PID eq ${pid}" /NH`);
      return stdout.includes(String(pid));
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

// GET : État du bot, derniers logs et candidatures synchronisées du Tracker CRM
export async function GET() {
  try {
    const { rootDir, backendDir, pidFile, logFile, applicationsHistoryFile, isServerless } = getPaths();

    let pid: number | null = null;
    let running = false;

    if (fs.existsSync(pidFile)) {
      try {
        const rawPid = fs.readFileSync(pidFile, "utf-8").trim();
        const parsedPid = parseInt(rawPid, 10);
        if (!isNaN(parsedPid)) {
          pid = parsedPid;
          running = await isProcessRunning(parsedPid);
        }
      } catch {}
    }

    let logs: string[] = [];
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, "utf-8");
        logs = content
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(-80); // Garde les 80 dernières lignes
      } catch {}
    }

    let applications: any[] = [];
    const appFileCandidates = [
      applicationsHistoryFile,
      path.resolve(process.cwd(), "public", "data", "applications_history.json"),
      path.resolve(rootDir, "frontend", "public", "data", "applications_history.json"),
      path.resolve(backendDir, "data", "applications_history.json"),
    ];

    for (const cand of appFileCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const rawApps = fs.readFileSync(cand, "utf-8");
          const parsed = JSON.parse(rawApps);
          if (Array.isArray(parsed) && parsed.length > 0) {
            applications = parsed;
            break;
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      running,
      pid,
      logs,
      applications,
      isServerless,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST : Lancer le bot
export async function POST(request: Request) {
  try {
    const { rootDir, backendDir, scriptPath, logFile, pidFile, frontendAppliedFile, isServerless } = getPaths();
    const body = await request.json().catch(() => ({}));

    // En environnement serverless Cloud (Vercel), le filesystem est en lecture seule (/var/task)
    // et il n'y a pas d'affichage ni de session Chromium persistante pour piloter LinkedIn.
    if (isServerless) {
      return NextResponse.json({
        success: false,
        isServerless: true,
        error: "Environnement Cloud Serverless (Vercel) détecté. Pour des raisons de sécurité et d'accès direct à votre session LinkedIn (Playwright), le bot doit être exécuté sur votre machine locale (PC 1 ou PC 2) via le script 'Lancer_Bot_LinkedIn.bat' ou 'python backend/run_linkedin_easy_apply.py'. Vos candidatures apparaîtront automatiquement dans ce dashboard !",
      });
    }

    const {
      keywords = "Machine Learning Stage",
      location = "Suisse",
      allJobs = true,
      dryRun = false,
      headless = false,
      maxApps = 3,
      minDelay = 15,
      maxDelay = 35,
      excludeFrance = true,
      appliedIds = [],
    } = body;

    // Enregistrer les IDs déjà postulés depuis le dashboard pour l'anti-doublon du bot
    if (Array.isArray(appliedIds) && appliedIds.length > 0) {
      try {
        fs.writeFileSync(frontendAppliedFile, JSON.stringify(appliedIds, null, 2), "utf-8");
      } catch {}
    }

    // Vérifier si un bot tourne déjà
    if (fs.existsSync(pidFile)) {
      try {
        const rawPid = fs.readFileSync(pidFile, "utf-8").trim();
        const existingPid = parseInt(rawPid, 10);
        if (!isNaN(existingPid) && (await isProcessRunning(existingPid))) {
          return NextResponse.json({
            success: false,
            error: `Un agent LinkedIn est déjà en cours d'exécution (PID: ${existingPid}). Arrêtez-le avant d'en lancer un nouveau.`,
            running: true,
            pid: existingPid,
          });
        }
      } catch {}
    }

    // Réinitialiser le fichier de log
    const startTimestamp = new Date().toLocaleString("fr-FR");
    const initialLog = `[${startTimestamp}] 🚀 Initialisation du Bot Autonome LinkedIn via le Dashboard Web...\n` +
      `[${startTimestamp}] 🎯 Mots-clés: "${keywords}" | Lieu: "${location}" | Mode: ${dryRun ? "Simulation (Dry-Run)" : "Production Autonome"}\n` +
      `[${startTimestamp}] 🌐 Couverture: ${allJobs ? "Toutes les offres (Easy Apply + Sites Externes)" : "Easy Apply uniquement"}\n` +
      `[${startTimestamp}] 🎓 Conformité EILCO Mobilité Internationale: ${excludeFrance ? "Exclusion stricte de la France active" : "France autorisée"}\n\n`;
    try {
      fs.writeFileSync(logFile, initialLog, "utf-8");
    } catch {}

    // Construire les arguments
    const args: string[] = [
      scriptPath,
      "--once",
      "--keywords",
      keywords,
      "--location",
      location,
      "--max-apps",
      String(maxApps),
      "--min-delay",
      String(minDelay),
      "--max-delay",
      String(maxDelay),
    ];

    if (allJobs) args.push("--all-jobs");
    if (dryRun) args.push("--dry-run");
    if (headless) args.push("--headless");
    if (excludeFrance) {
      args.push("--exclude-france");
    } else {
      args.push("--allow-france");
    }
    args.push("--under-10-applicants", "--max-applicants", "10");

    // Ouvrir le fichier de log pour écriture continue
    const outLogStream = fs.openSync(logFile, "a");
    const errLogStream = fs.openSync(logFile, "a");

    // Lancer le processus en arrière-plan détaché
    const child = spawn("python", args, {
      cwd: rootDir,
      detached: true,
      stdio: ["ignore", outLogStream, errLogStream],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONIOENCODING: "utf-8",
      },
    });

    if (child.pid) {
      try {
        fs.writeFileSync(pidFile, String(child.pid), "utf-8");
      } catch {}
      child.unref(); // Permet à Node.js de ne pas attendre la fin du script

      return NextResponse.json({
        success: true,
        message: "Bot LinkedIn autonome lancé avec succès !",
        running: true,
        pid: child.pid,
        config: {
          keywords,
          location,
          allJobs,
          dryRun,
          headless,
          maxApps,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Impossible d'obtenir le PID du processus Python." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lancement bot" },
      { status: 500 }
    );
  }
}

// DELETE : Arrêter le bot immédiatement
export async function DELETE() {
  try {
    const { pidFile, logFile, isServerless } = getPaths();

    if (isServerless) {
      return NextResponse.json({
        success: true,
        message: "En cloud serverless, aucun processus local n'est actif.",
        running: false,
      });
    }

    if (!fs.existsSync(pidFile)) {
      return NextResponse.json({
        success: true,
        message: "Aucun processus bot enregistré.",
        running: false,
      });
    }

    let pid: number | null = null;
    try {
      const rawPid = fs.readFileSync(pidFile, "utf-8").trim();
      pid = parseInt(rawPid, 10);
    } catch {}

    if (!pid || isNaN(pid)) {
      try { fs.unlinkSync(pidFile); } catch {}
      return NextResponse.json({ success: true, running: false });
    }

    const running = await isProcessRunning(pid);
    if (!running) {
      try { fs.unlinkSync(pidFile); } catch {}
      return NextResponse.json({
        success: true,
        message: "Le bot n'était plus en cours d'exécution.",
        running: false,
      });
    }

    // Tuer l'arbre de processus (Python + Chromium)
    if (process.platform === "win32") {
      await execPromise(`taskkill /F /PID ${pid} /T`).catch(() => {});
    } else {
      try { process.kill(-pid, "SIGTERM"); } catch {
        try { process.kill(pid, "SIGTERM"); } catch {}
      }
    }

    try { fs.unlinkSync(pidFile); } catch {}

    const stopMsg = `\n[${new Date().toLocaleString("fr-FR")}] 🛑 Bot arrêté par l'utilisateur via le Dashboard Web.\n`;
    try { fs.appendFileSync(logFile, stopMsg, "utf-8"); } catch {}

    return NextResponse.json({
      success: true,
      message: "Bot LinkedIn arrêté avec succès !",
      running: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
