import { z } from "zod";

// ─── CBT Lessons ─────────────────────────────────────────
export const lessonStatusEnum = z.enum(["Not Started", "Watched", "Skipped"]);
export type LessonStatus = z.infer<typeof lessonStatusEnum>;

export interface CbtLesson {
  id: number;
  number: number;
  title: string;
  duration: string;
  domain: string;
  week: string;
  status: LessonStatus;
}

export const updateLessonSchema = z.object({
  status: lessonStatusEnum,
});

// ─── Labs ────────────────────────────────────────────────
export interface Lab {
  id: number;
  number: number;
  weekHeader: string;
  week: string;
  domain: string;
  title: string;
  practice: string;
  platform: string;
  done: boolean;
  skipped: boolean;
}

export const updateLabSchema = z.object({
  done: z.boolean(),
});

// ─── Weekly Plan ─────────────────────────────────────────
export const weekStatusEnum = z.enum(["Not Started", "In Progress", "Complete"]);
export type WeekStatus = z.infer<typeof weekStatusEnum>;

export interface WeeklyPlan {
  id: number;
  week: string;
  dates: string;
  focus: string;
  cbtLessons: string;
  otherStudy: string;
  labs: string;
  status: WeekStatus;
  ankiTags: string;
  isTravel: boolean;
}

export const updateWeekSchema = z.object({
  status: weekStatusEnum,
});

// ─── Practice Tests ──────────────────────────────────────
export interface PracticeTest {
  id: number;
  platform: string;
  date: string;
  overallScore: number;
  domainScores: Record<string, number>;
  notes: string;
}

export const insertPracticeTestSchema = z.object({
  platform: z.string().min(1),
  date: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  domainScores: z.record(z.string(), z.number().min(0).max(100)),
  notes: z.string().default(""),
});

export type InsertPracticeTest = z.infer<typeof insertPracticeTestSchema>;

// ─── Topics ──────────────────────────────────────────────
export interface Topic {
  id: number;
  domain: string;
  topic: string;
  subtopic: string | null;
  confidence: number;
  studied: boolean;
  cbtRef: string | null;
  notes: string | null;
}

export const updateTopicSchema = z.object({
  confidence: z.number().min(1).max(5).optional(),
  studied: z.boolean().optional(),
  notes: z.string().optional(),
});

// ─── Reddit Tips (static) ────────────────────────────────
export interface RedditTipItem {
  col_b: string;
  col_c: string;
  col_d: string;
  col_e: string;
  url?: string;
}

export interface RedditTip {
  title: string;
  items: RedditTipItem[];
}
