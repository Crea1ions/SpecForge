import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Health
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      name: "SpecForge Engine",
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // AI Assistant: Intent to Specification
  app.post("/api/ai/intent-to-spec", async (req, res) => {
    const { prompt, currentSpec } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'prompt' parameter." });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const systemInstruction = `Tu es l'architecte logiciel expert de SpecForge, une plateforme de scaffolding pilotée par spécification.
L'utilisateur décrit son intention de projet en langage naturel.
Tu dois renvoyer STRICTEMENT un objet JSON représentant les choix architecturaux et la spécification pour le générateur.
Format attendu:
{
  "project": {
    "name": string (ex: "Lexi", "VaultStream", etc.),
    "slug": string (kebab-case),
    "description": string (explicite, 1-2 phrases),
    "type": "fullstack" | "desktop" | "backend-only" | "frontend-only" | "cli"
  },
  "backend": {
    "enabled": boolean,
    "language": "rust" | "python" | "typescript" | "go",
    "framework": "axum" | "actix-web" | "fastapi" | "express",
    "port": number,
    "logging": boolean,
    "cors": boolean
  },
  "frontend": {
    "enabled": boolean,
    "framework": "react" | "vue" | "none",
    "bundler": "vite",
    "language": "typescript",
    "styling": "tailwind",
    "tauri": boolean
  },
  "database": {
    "enabled": boolean,
    "type": "sqlite" | "postgresql" | "none",
    "orm": "sqlx" | "diesel" | "prisma",
    "migrations": boolean,
    "pooling": boolean
  },
  "api": {
    "style": "rest" | "websocket" | "graphql" | "none",
    "auth": boolean,
    "openapi": boolean,
    "rateLimiting": boolean
  },
  "authentication": {
    "enabled": boolean,
    "provider": "jwt" | "oauth" | "telegram" | "none",
    "sessionStore": boolean
  },
  "infrastructure": {
    "docker": boolean,
    "compose": boolean,
    "systemd": boolean,
    "vpsScript": boolean,
    "nginx": boolean
  },
  "quality": {
    "tests": boolean,
    "lint": boolean,
    "ci": boolean,
    "gitHooks": boolean
  },
  "documentation": {
    "readme": boolean,
    "architectureDoc": boolean,
    "installDoc": boolean,
    "decisionsLog": boolean
  },
  "rationale": string (explication en français du choix d'architecture en 2-3 phrases)
}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: systemInstruction },
                {
                  text: `Intention utilisateur: "${prompt}".\nSpécification actuelle si existante: ${JSON.stringify(
                    currentSpec || {}
                  )}`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text || "";
        const parsed = JSON.parse(text);
        return res.json({ success: true, source: "gemini", data: parsed });
      } catch (err: any) {
        console.warn("Gemini intent-to-spec failed, using deterministic engine:", err.message);
      }
    }

    // Deterministic rule-based fallback if no Gemini key or API failure
    const lower = prompt.toLowerCase();
    const isDesktop = lower.includes("desktop") || lower.includes("bureau") || lower.includes("tauri") || lower.includes("audio");
    const isRust = lower.includes("rust") || isDesktop || (!lower.includes("python") && !lower.includes("node"));
    const isPython = lower.includes("python") || lower.includes("fastapi") || lower.includes("ia") || lower.includes("data");
    const isSqlite = lower.includes("sqlite") || isDesktop || lower.includes("embarqué") || lower.includes("local");
    const isPostgres = lower.includes("postgres") || lower.includes("sql") && !isSqlite;

    const fallbackSpec = {
      project: {
        name: prompt.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "") || "MonProjet",
        slug: "mon-projet",
        description: prompt.slice(0, 120),
        type: isDesktop ? "desktop" : "fullstack",
      },
      backend: {
        enabled: true,
        language: isPython ? "python" : "rust",
        framework: isPython ? "fastapi" : "axum",
        port: 8080,
        logging: true,
        cors: true,
      },
      frontend: {
        enabled: true,
        framework: "react",
        bundler: "vite",
        language: "typescript",
        styling: "tailwind",
        tauri: isDesktop,
      },
      database: {
        enabled: true,
        type: isPostgres ? "postgresql" : "sqlite",
        orm: "sqlx",
        migrations: true,
        pooling: true,
      },
      api: {
        style: "rest",
        auth: lower.includes("auth") || lower.includes("jwt"),
        openapi: true,
        rateLimiting: false,
      },
      authentication: {
        enabled: lower.includes("auth") || lower.includes("jwt"),
        provider: "jwt",
        sessionStore: false,
      },
      infrastructure: {
        docker: !isDesktop || isPostgres,
        compose: isPostgres,
        systemd: false,
        vpsScript: false,
        nginx: false,
      },
      quality: {
        tests: true,
        lint: true,
        ci: true,
        gitHooks: true,
      },
      documentation: {
        readme: true,
        architectureDoc: true,
        installDoc: true,
        decisionsLog: true,
      },
      rationale: isDesktop
        ? "Architecture Desktop native optimisée avec Rust + Tauri + React et persistance locale SQLite zéro configuration."
        : "Architecture Fullstack moderne déterministe avec backend performant, frontend React/Vite et base de données adaptée.",
    };

    return res.json({ success: true, source: "deterministic", data: fallbackSpec });
  });

  // AI Assistant: Explain Architecture & Conflicts
  app.post("/api/ai/explain-architecture", async (req, res) => {
    const { spec, activeBricks, issues } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `En tant qu'architecte logiciel, analyse brièvement cette spécification de projet et les briques activées.
Spécification: ${JSON.stringify(spec)}
Briques actives: ${JSON.stringify(activeBricks)}
Avertissements/Conflits détectés par le moteur: ${JSON.stringify(issues)}

Donne une analyse synthétique en français (150-200 mots maximum) :
1. Forces de ce choix architectural
2. Points de vigilance (sécurité, scalabilité, déploiement)
3. Recommandation clé`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        return res.json({ success: true, analysis: response.text });
      } catch (err: any) {
        console.warn("Gemini explain-architecture failed:", err.message);
      }
    }

    // Deterministic fallback explanation
    const analysis = `Analyse architecturale du moteur SpecForge :
• Cohérence globale : Le projet ${spec?.project?.name || "Scaffold"} repose sur une pile ${
      spec?.backend?.language || "Rust"
    } + ${spec?.frontend?.framework || "React"}.
• Couplage & Données : ${
      spec?.database?.enabled
        ? `L'utilisation de ${spec.database.type} garantit une isolation claire de la couche d'accès aux données.`
        : "Aucune base de données requise, ce qui réduit drastiquement la surface d'exploitation."
    }
• Vigilance : Veiller à synchroniser les contrats de données (OpenAPI / types TypeScript) entre le backend et le frontend.
• Recommandation : Les tests d'intégration et le CI/CD configurés permettent un déploiement déterministe et reproductible dès le premier jour.`;

    return res.json({ success: true, analysis });
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SpecForge Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
