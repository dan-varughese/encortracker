import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  updateLessonSchema,
  updateLabSchema,
  updateWeekSchema,
  insertPracticeTestSchema,
  updateTopicSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── CBT Lessons ──────────────────────────────────────
  app.get("/api/lessons", async (_req, res) => {
    const lessons = await storage.getLessons();
    res.json(lessons);
  });

  app.patch("/api/lessons/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateLessonStatus(id, parsed.data.status);
    if (!updated) return res.status(404).json({ error: "Lesson not found" });
    res.json(updated);
  });

  // ─── Labs ─────────────────────────────────────────────
  app.get("/api/labs", async (_req, res) => {
    const labs = await storage.getLabs();
    res.json(labs);
  });

  app.patch("/api/labs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = updateLabSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateLabDone(id, parsed.data.done);
    if (!updated) return res.status(404).json({ error: "Lab not found" });
    res.json(updated);
  });

  // ─── Weekly Plan ──────────────────────────────────────
  app.get("/api/weekly-plan", async (_req, res) => {
    const plan = await storage.getWeeklyPlan();
    res.json(plan);
  });

  app.patch("/api/weekly-plan/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = updateWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateWeekStatus(id, parsed.data.status);
    if (!updated) return res.status(404).json({ error: "Week not found" });
    res.json(updated);
  });

  // ─── Practice Tests ───────────────────────────────────
  app.get("/api/practice-tests", async (_req, res) => {
    const tests = await storage.getPracticeTests();
    res.json(tests);
  });

  app.post("/api/practice-tests", async (req, res) => {
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

  app.patch("/api/topics/:id", async (req, res) => {
    const id = parseInt(req.params.id);
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
