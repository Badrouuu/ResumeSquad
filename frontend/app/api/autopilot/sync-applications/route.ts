import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

function getApplicationsFiles() {
  const cwd = process.cwd();
  const isServerless = process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  const rootDir = fs.existsSync(path.resolve(cwd, "backend"))
    ? cwd
    : path.resolve(cwd, "..");

  const serverlessFile = path.resolve("/tmp", "backend_data", "applications_history.json");
  const publicFile = path.resolve(cwd, "public", "data", "applications_history.json");
  const publicAltFile = path.resolve(rootDir, "frontend", "public", "data", "applications_history.json");
  const backendFile = path.resolve(rootDir, "backend", "data", "applications_history.json");

  return { serverlessFile, publicFile, publicAltFile, backendFile, isServerless };
}

function loadApplicationsList(): any[] {
  const { serverlessFile, publicFile, publicAltFile, backendFile } = getApplicationsFiles();

  const candidates = [serverlessFile, publicFile, publicAltFile, backendFile];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8").trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
  }
  return [];
}

export async function GET() {
  try {
    const applications = loadApplicationsList();
    return NextResponse.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const incoming: any[] = [];

    if (body.application && typeof body.application === "object") {
      incoming.push(body.application);
    }
    if (Array.isArray(body.applications)) {
      incoming.push(...body.applications);
    }

    if (incoming.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune candidature fournie dans le payload (clé 'application' ou 'applications')." },
        { status: 400 }
      );
    }

    const currentApps = loadApplicationsList();
    const existingIds = new Set(currentApps.map((a: any) => a.id));
    const existingKeys = new Set(
      currentApps.map((a: any) => `${(a.company || "").toLowerCase().trim()}::${(a.title || "").toLowerCase().trim()}`)
    );

    const toPrepend: any[] = [];
    for (const app of incoming) {
      const key = `${(app.company || "").toLowerCase().trim()}::${(app.title || "").toLowerCase().trim()}`;
      if (app.id && existingIds.has(app.id)) {
        // Met à jour le statut si existant
        const idx = currentApps.findIndex((a: any) => a.id === app.id);
        if (idx !== -1) {
          currentApps[idx] = { ...currentApps[idx], ...app };
        }
      } else if (!existingKeys.has(key)) {
        existingIds.add(app.id);
        existingKeys.add(key);
        toPrepend.push(app);
      }
    }

    const merged = [...toPrepend, ...currentApps];
    const { serverlessFile, publicFile, publicAltFile, backendFile } = getApplicationsFiles();

    // Sauvegarde en cascade selon permissions
    const targetFiles = [serverlessFile, publicFile, publicAltFile, backendFile];
    for (const target of targetFiles) {
      try {
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(target, JSON.stringify(merged, null, 2), "utf-8");
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `${incoming.length} candidature(s) synchronisée(s) avec succès !`,
      count: merged.length,
      applications: merged,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
