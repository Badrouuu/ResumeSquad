import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// Chemins des fichiers de suivi
function getPaths() {
  const cwd = process.cwd();
  const rootDir = fs.existsSync(path.resolve(cwd, "backend"))
    ? cwd
    : path.resolve(cwd, "..");
  const backendDir = path.resolve(rootDir, "backend");
  const scriptPath = path.resolve(backendDir, "run_linkedin_easy_apply.py");
  const dataDir = path.resolve(backendDir, "data");
  const logFile = path.resolve(dataDir, "linkedin_bot.log");
  const pidFile = path.resolve(dataDir, "linkedin_bot.pid");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return { rootDir, backendDir, scriptPath, dataDir, logFile, pidFile };
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

// GET : État du bot et derniers logs
export async function GET() {
  try {
    const { pidFile, logFile } = getPaths();

    let pid: number | null = null;
    let running = false;

    if (fs.existsSync(pidFile)) {
      const rawPid = fs.readFileSync(pidFile, "utf-8").trim();
      const parsedPid = parseInt(rawPid, 10);
      if (!isNaN(parsedPid)) {
        pid = parsedPid;
        running = await isProcessRunning(parsedPid);
      }
    }

    let logs: string[] = [];
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf-8");
      logs = content
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(-80); // Garde les 80 dernières lignes
    }

    return NextResponse.json({
      success: true,
      running,
      pid,
      logs,
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
    const { rootDir, backendDir, scriptPath, logFile, pidFile } = getPaths();
    const body = await request.json().catch(() => ({}));

    const {
      keywords = "Machine Learning Stage",
      location = "France",
      allJobs = true,
      dryRun = false,
      headless = false,
      maxApps = 3,
      minDelay = 120,
      maxDelay = 240,
    } = body;

    // Vérifier si un bot tourne déjà
    if (fs.existsSync(pidFile)) {
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
    }

    // Réinitialiser le fichier de log
    const startTimestamp = new Date().toLocaleString("fr-FR");
    const initialLog = `[${startTimestamp}] 🚀 Initialisation du Bot Autonome LinkedIn via le Dashboard Web...\n` +
      `[${startTimestamp}] 🎯 Mots-clés: "${keywords}" | Lieu: "${location}" | Mode: ${dryRun ? "Simulation (Dry-Run)" : "Production Autonome"}\n` +
      `[${startTimestamp}] 🌐 Couverture: ${allJobs ? "Toutes les offres (Easy Apply + Sites Externes)" : "Easy Apply uniquement"}\n\n`;
    fs.writeFileSync(logFile, initialLog, "utf-8");

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
      fs.writeFileSync(pidFile, String(child.pid), "utf-8");
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
    const { pidFile, logFile } = getPaths();

    if (!fs.existsSync(pidFile)) {
      return NextResponse.json({
        success: true,
        message: "Aucun processus bot enregistré.",
        running: false,
      });
    }

    const rawPid = fs.readFileSync(pidFile, "utf-8").trim();
    const pid = parseInt(rawPid, 10);

    if (isNaN(pid)) {
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
