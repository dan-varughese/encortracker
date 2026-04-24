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
  status: lessonStatusEnum.optional(),
  week: z.string().optional(),
}).refine((data) => data.status !== undefined || data.week !== undefined, {
  message: "At least one lesson field is required",
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
  done: z.boolean().optional(),
  skipped: z.boolean().optional(),
  week: z.string().optional(),
  weekHeader: z.string().optional(),
}).refine(
  (data) =>
    data.done !== undefined ||
    data.skipped !== undefined ||
    data.week !== undefined ||
    data.weekHeader !== undefined,
  { message: "At least one lab field is required" },
);

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
  status: weekStatusEnum.optional(),
  cbtLessons: z.string().optional(),
  otherStudy: z.string().optional(),
  labs: z.string().optional(),
  focus: z.string().optional(),
  isTravel: z.boolean().optional(),
}).refine(
  (data) =>
    data.status !== undefined ||
    data.cbtLessons !== undefined ||
    data.otherStudy !== undefined ||
    data.labs !== undefined ||
    data.focus !== undefined ||
    data.isTravel !== undefined,
  { message: "At least one week field is required" },
);

export const insertWeekSchema = z.object({
  week: z.string().min(1),
  dates: z.string().min(1),
  focus: z.string().default(""),
  cbtLessons: z.string().default(""),
  otherStudy: z.string().default(""),
  labs: z.string().default(""),
  ankiTags: z.string().default(""),
});

export type InsertWeek = z.infer<typeof insertWeekSchema>;

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
