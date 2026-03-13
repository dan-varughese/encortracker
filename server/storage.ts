import {
  type CbtLesson,
  type Lab,
  type WeeklyPlan,
  type PracticeTest,
  type InsertPracticeTest,
  type Topic,
  type RedditTip,
  type LessonStatus,
  type WeekStatus,
} from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export interface IStorage {
  // CBT Lessons
  getLessons(): Promise<CbtLesson[]>;
  updateLessonStatus(id: number, status: LessonStatus): Promise<CbtLesson | undefined>;

  // Labs
  getLabs(): Promise<Lab[]>;
  updateLabDone(id: number, done: boolean): Promise<Lab | undefined>;

  // Weekly Plan
  getWeeklyPlan(): Promise<WeeklyPlan[]>;
  updateWeekStatus(id: number, status: WeekStatus): Promise<WeeklyPlan | undefined>;

  // Practice Tests
  getPracticeTests(): Promise<PracticeTest[]>;
  createPracticeTest(test: InsertPracticeTest): Promise<PracticeTest>;

  // Topics
  getTopics(): Promise<Topic[]>;
  updateTopic(id: number, updates: { confidence?: number; studied?: boolean; notes?: string }): Promise<Topic | undefined>;

  // Reddit Tips
  getRedditTips(): Promise<RedditTip[]>;
}

export class MemStorage implements IStorage {
  private lessons: Map<number, CbtLesson> = new Map();
  private labs: Map<number, Lab> = new Map();
  private weeklyPlan: Map<number, WeeklyPlan> = new Map();
  private practiceTests: Map<number, PracticeTest> = new Map();
  private topics: Map<number, Topic> = new Map();
  private redditTips: RedditTip[] = [];
  private nextTestId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    try {
      let data: any;
      // Check for pre-loaded data (Vercel serverless)
      if ((globalThis as any).__SEED_DATA__) {
        data = (globalThis as any).__SEED_DATA__;
      } else {
        // Try multiple paths to find seed data (local dev)
        const candidates = [
          path.resolve(process.cwd(), "study_plan_data.json"),
          path.resolve(process.cwd(), "../study_plan_data.json"),
          path.resolve(__dirname, "../study_plan_data.json"),
          path.resolve(__dirname, "../../study_plan_data.json"),
          "/home/user/workspace/study_plan_data.json",
        ];
        let rawData: string = "";
        for (const candidate of candidates) {
          try {
            rawData = fs.readFileSync(candidate, "utf-8");
            break;
          } catch { /* try next */ }
        }
        if (!rawData) throw new Error("Could not find study_plan_data.json");
        data = JSON.parse(rawData);
      }

      // Seed CBT Lessons - note: duration and domain fields are swapped in the JSON
      if (data.cbtLessons) {
        data.cbtLessons.forEach((l: any, idx: number) => {
          const id = idx + 1;
          this.lessons.set(id, {
            id,
            number: l.number,
            title: l.title,
            duration: l.domain,    // swapped in source data
            domain: l.duration,     // swapped in source data
            week: l.week,
            status: l.status as LessonStatus,
          });
        });
      }

      // Seed Labs
      if (data.labs) {
        data.labs.forEach((l: any, idx: number) => {
          const id = idx + 1;
          this.labs.set(id, {
            id,
            number: l.number,
            weekHeader: l.weekHeader,
            week: l.week,
            domain: l.domain,
            title: l.title,
            practice: l.practice,
            platform: l.platform,
            done: l.done === "Done",
          });
        });
      }

      // Seed Weekly Plan
      if (data.weeklyPlan) {
        data.weeklyPlan.forEach((w: any, idx: number) => {
          const id = idx + 1;
          const isTravel = (w.focus || "").toUpperCase().includes("TRAVEL");
          this.weeklyPlan.set(id, {
            id,
            week: w.week,
            dates: w.dates,
            focus: w.focus,
            cbtLessons: w.cbtLessons,
            otherStudy: w.otherStudy,
            labs: w.labs,
            status: w.status as WeekStatus,
            ankiTags: w.ankiTags || "",
            isTravel,
          });
        });
      }

      // Seed Topics (skip header row)
      if (data.topics) {
        let topicId = 0;
        data.topics.forEach((t: any) => {
          if (t.domain === "Topic #") return; // skip header
          topicId++;
          this.topics.set(topicId, {
            id: topicId,
            domain: t.domain,
            topic: t.topic,
            subtopic: t.subtopic || null,
            confidence: typeof t.confidence === "number" ? t.confidence : 1,
            studied: typeof t.studied === "string" && t.studied.length > 0,
            cbtRef: typeof t.studied === "string" ? t.studied : null,
            notes: t.notes || null,
          });
        });
      }

      // Seed Reddit Tips
      if (data.redditTips) {
        this.redditTips = data.redditTips;
      }

      console.log(
        `Seeded: ${this.lessons.size} lessons, ${this.labs.size} labs, ` +
        `${this.weeklyPlan.size} weeks, ${this.topics.size} topics, ` +
        `${this.redditTips.length} reddit tip sections`
      );
    } catch (err) {
      console.error("Failed to seed data:", err);
    }
  }

  // CBT Lessons
  async getLessons(): Promise<CbtLesson[]> {
    return Array.from(this.lessons.values()).sort((a, b) => a.number - b.number);
  }

  async updateLessonStatus(id: number, status: LessonStatus): Promise<CbtLesson | undefined> {
    const lesson = this.lessons.get(id);
    if (!lesson) return undefined;
    lesson.status = status;
    return lesson;
  }

  // Labs
  async getLabs(): Promise<Lab[]> {
    return Array.from(this.labs.values()).sort((a, b) => a.number - b.number);
  }

  async updateLabDone(id: number, done: boolean): Promise<Lab | undefined> {
    const lab = this.labs.get(id);
    if (!lab) return undefined;
    lab.done = done;
    return lab;
  }

  // Weekly Plan
  async getWeeklyPlan(): Promise<WeeklyPlan[]> {
    return Array.from(this.weeklyPlan.values()).sort((a, b) => a.id - b.id);
  }

  async updateWeekStatus(id: number, status: WeekStatus): Promise<WeeklyPlan | undefined> {
    const week = this.weeklyPlan.get(id);
    if (!week) return undefined;
    week.status = status;
    return week;
  }

  // Practice Tests
  async getPracticeTests(): Promise<PracticeTest[]> {
    return Array.from(this.practiceTests.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async createPracticeTest(test: InsertPracticeTest): Promise<PracticeTest> {
    const id = this.nextTestId++;
    const newTest: PracticeTest = { id, ...test };
    this.practiceTests.set(id, newTest);
    return newTest;
  }

  // Topics
  async getTopics(): Promise<Topic[]> {
    return Array.from(this.topics.values()).sort((a, b) => a.id - b.id);
  }

  async updateTopic(id: number, updates: { confidence?: number; studied?: boolean; notes?: string }): Promise<Topic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    if (updates.confidence !== undefined) topic.confidence = updates.confidence;
    if (updates.studied !== undefined) topic.studied = updates.studied;
    if (updates.notes !== undefined) topic.notes = updates.notes;
    return topic;
  }

  // Reddit Tips
  async getRedditTips(): Promise<RedditTip[]> {
    return this.redditTips;
  }
}

export const storage = new MemStorage();
