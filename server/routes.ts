import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import {
  clearEditorAuthCookie,
  getEditorPassword,
  isEditorAuthenticated,
  setEditorAuthCookie,
} from "./auth";
import { storage } from "./storage";
import {
  updateLessonSchema,
  updateLabSchema,
  updateWeekSchema,
  insertWeekSchema,
  insertPracticeTestSchema,
  updateTopicSchema,
} from "@shared/schema";

function requireEditorAuth(req: Request, res: Response, next: NextFunction) {
  if (isEditorAuthenticated(req)) {
    return next();
  }

  return res.status(401).json({ error: "Authentication required for changes" });
}

function parseNumericId(rawId: string | string[]) {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) ? id : null;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function getClientIp(req: Request) {
  const forwardedHeader = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(forwardedHeader)
    ? forwardedHeader[forwardedHeader.length - 1]
    : forwardedHeader;
  if (typeof forwarded === "string" && forwarded.trim()) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const lastHop = parts[parts.length - 1];
    if (lastHop && /^[a-fA-F0-9:.]+$/.test(lastHop)) return lastHop;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/auth/session", (req, res) => {
    res.json({ authenticated: isEditorAuthenticated(req) });
  });

  app.post("/api/auth/login", (req, res) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + LOGIN_WINDOW_MS;
    }
    record.count++;
    loginAttempts.set(ip, record);
    if (record.count > LOGIN_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many login attempts. Try again later." });
    }

    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const expectedPassword = getEditorPassword();
    if (!expectedPassword) {
      return res.status(503).json({ error: "Editor authentication is not configured" });
    }
    if (password !== expectedPassword) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    loginAttempts.delete(ip);
    if (!setEditorAuthCookie(res)) {
      return res.status(503).json({ error: "Editor authentication is not configured" });
    }
    return res.json({ authenticated: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    clearEditorAuthCookie(res);
    res.json({ authenticated: false });
  });

  // ─── CBT Lessons ──────────────────────────────────────
  app.get("/api/lessons", async (_req, res) => {
    const lessons = await storage.getLessons();
    res.json(lessons);
  });

  app.patch("/api/lessons/:id", requireEditorAuth, async (req, res) => {
    const id = parseNumericId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid lesson id" });
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateLesson(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Lesson not found" });
    res.json(updated);
  });

  // ─── Labs ─────────────────────────────────────────────
  app.get("/api/labs", async (_req, res) => {
    const labs = await storage.getLabs();
    res.json(labs);
  });

  app.patch("/api/labs/:id", requireEditorAuth, async (req, res) => {
    const id = parseNumericId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid lab id" });
    const parsed = updateLabSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateLab(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Lab not found" });
    res.json(updated);
  });

  app.delete("/api/labs/:id", requireEditorAuth, async (req, res) => {
    const id = parseNumericId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid lab id" });
    const deleted = await storage.deleteLab(id);
    if (!deleted) return res.status(404).json({ error: "Lab not found" });
    res.json({ deleted: true, id });
  });

  // ─── Weekly Plan ──────────────────────────────────────
  app.get("/api/weekly-plan", async (_req, res) => {
    const plan = await storage.getWeeklyPlan();
    res.json(plan);
  });

  app.patch("/api/weekly-plan/:id", requireEditorAuth, async (req, res) => {
    const id = parseNumericId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid week id" });
    const parsed = updateWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateWeek(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Week not found" });
    res.json(updated);
  });

  app.post("/api/weekly-plan", requireEditorAuth, async (req, res) => {
    const parsed = insertWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const week = await storage.createWeek(parsed.data);
    res.status(201).json(week);
  });

  // ─── Practice Tests ───────────────────────────────────
  app.get("/api/practice-tests", async (_req, res) => {
    const tests = await storage.getPracticeTests();
    res.json(tests);
  });

  app.post("/api/practice-tests", requireEditorAuth, async (req, res) => {
    const parsed = insertPracticeTestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const test = await storage.createPracticeTest(parsed.data);
    res.status(201).json(test);
  });

  // ─── Topics ───────────────────────────────────────────
  app.get("/api/topics", async (_req, res) => {
    const topics = await storage.getTopics();
    res.json(topics);
  });

  app.patch("/api/topics/:id", requireEditorAuth, async (req, res) => {
    const id = parseNumericId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid topic id" });
    const parsed = updateTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateTopic(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Topic not found" });
    res.json(updated);
  });

  // ─── Reddit Tips ──────────────────────────────────────
  app.get("/api/reddit-tips", async (_req, res) => {
    const tips = await storage.getRedditTips();
    res.json(tips);
  });

  return httpServer;
}
