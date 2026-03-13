import { neon } from "@neondatabase/serverless";
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

type SeedLesson = {
  number: number;
  title: string;
  duration: string;
  domain: string;
  week: string;
  status: LessonStatus;
};

type SeedLab = {
  number: number;
  weekHeader: string;
  week: string;
  domain: string;
  title: string;
  practice: string;
  platform: string;
  done: string;
};

type SeedWeek = {
  week: string;
  dates: string;
  focus: string;
  cbtLessons: string;
  otherStudy: string;
  labs: string;
  status: WeekStatus;
  ankiTags?: string;
};

type SeedTopic = {
  domain: string;
  topic: string;
  subtopic?: string | null;
  confidence?: number;
  studied?: string | boolean | null;
  notes?: string | null;
};

type SeedData = {
  cbtLessons?: SeedLesson[];
  labs?: SeedLab[];
  weeklyPlan?: SeedWeek[];
  topics?: SeedTopic[];
  redditTips?: RedditTip[];
};

type DbLessonRow = {
  id: number;
  number: number;
  title: string;
  duration: string;
  domain: string;
  week: string;
  status: LessonStatus;
};

type DbLabRow = {
  id: number;
  number: number;
  week_header: string;
  week: string;
  domain: string;
  title: string;
  practice: string;
  platform: string;
  done: boolean;
};

type DbWeekRow = {
  id: number;
  week: string;
  dates: string;
  focus: string;
  cbt_lessons: string;
  other_study: string;
  labs_desc: string;
  status: WeekStatus;
  anki_tags: string;
  is_travel: boolean;
};

type DbTestRow = {
  id: number;
  platform: string;
  date: string;
  overall_score: number;
  domain_scores: Record<string, number> | string | null;
  notes: string | null;
};

type DbTopicRow = {
  id: number;
  domain: string;
  topic: string;
  subtopic: string | null;
  confidence: number;
  studied: boolean;
  cbt_ref: string | null;
  notes: string | null;
};

type DbRedditTipRow = {
  id: number;
  title: string;
  items_json: string;
  sort_order: number;
};

export interface IStorage {
  getLessons(): Promise<CbtLesson[]>;
  updateLessonStatus(id: number, status: LessonStatus): Promise<CbtLesson | undefined>;
  getLabs(): Promise<Lab[]>;
  updateLabDone(id: number, done: boolean): Promise<Lab | undefined>;
  getWeeklyPlan(): Promise<WeeklyPlan[]>;
  updateWeekStatus(id: number, status: WeekStatus): Promise<WeeklyPlan | undefined>;
  getPracticeTests(): Promise<PracticeTest[]>;
  createPracticeTest(test: InsertPracticeTest): Promise<PracticeTest>;
  getTopics(): Promise<Topic[]>;
  updateTopic(id: number, updates: { confidence?: number; studied?: boolean; notes?: string }): Promise<Topic | undefined>;
  getRedditTips(): Promise<RedditTip[]>;
}

function loadSeedData(): SeedData {
  const maybeSeededGlobal = globalThis as typeof globalThis & { __SEED_DATA__?: SeedData };
  if (maybeSeededGlobal.__SEED_DATA__) {
    return maybeSeededGlobal.__SEED_DATA__;
  }

  const candidates = [
    path.resolve(process.cwd(), "study_plan_data.json"),
    path.resolve(process.cwd(), "../study_plan_data.json"),
    path.resolve(path.dirname(process.argv[1] || process.cwd()), "../study_plan_data.json"),
    path.resolve(path.dirname(process.argv[1] || process.cwd()), "../../study_plan_data.json"),
    "/home/user/workspace/study_plan_data.json",
  ];

  for (const candidate of candidates) {
    try {
      const rawData = fs.readFileSync(candidate, "utf-8");
      return JSON.parse(rawData) as SeedData;
    } catch {
      continue;
    }
  }

  throw new Error("Could not find study_plan_data.json");
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
    this.seedData(loadSeedData());
  }

  private seedData(data: SeedData) {
    if (data.cbtLessons) {
      data.cbtLessons.forEach((lesson, index) => {
        const id = index + 1;
        this.lessons.set(id, {
          id,
          number: lesson.number,
          title: lesson.title,
          duration: lesson.domain,
          domain: lesson.duration,
          week: lesson.week,
          status: lesson.status,
        });
      });
    }

    if (data.labs) {
      data.labs.forEach((lab, index) => {
        const id = index + 1;
        this.labs.set(id, {
          id,
          number: lab.number,
          weekHeader: lab.weekHeader,
          week: lab.week,
          domain: lab.domain,
          title: lab.title,
          practice: lab.practice,
          platform: lab.platform,
          done: lab.done === "Done",
        });
      });
    }

    if (data.weeklyPlan) {
      data.weeklyPlan.forEach((week, index) => {
        const id = index + 1;
        this.weeklyPlan.set(id, {
          id,
          week: week.week,
          dates: week.dates,
          focus: week.focus,
          cbtLessons: week.cbtLessons,
          otherStudy: week.otherStudy,
          labs: week.labs,
          status: week.status,
          ankiTags: week.ankiTags || "",
          isTravel: week.focus.toUpperCase().includes("TRAVEL"),
        });
      });
    }

    if (data.topics) {
      let topicId = 0;
      data.topics.forEach((topic) => {
        if (topic.domain === "Topic #") return;
        topicId += 1;
        this.topics.set(topicId, {
          id: topicId,
          domain: topic.domain,
          topic: topic.topic,
          subtopic: topic.subtopic || null,
          confidence: typeof topic.confidence === "number" ? topic.confidence : 1,
          studied: typeof topic.studied === "string" && topic.studied.length > 0,
          cbtRef: typeof topic.studied === "string" ? topic.studied : null,
          notes: topic.notes || null,
        });
      });
    }

    this.redditTips = data.redditTips || [];
  }

  async getLessons() {
    return Array.from(this.lessons.values()).sort((a, b) => a.number - b.number);
  }

  async updateLessonStatus(id: number, status: LessonStatus) {
    const lesson = this.lessons.get(id);
    if (!lesson) return undefined;
    lesson.status = status;
    return lesson;
  }

  async getLabs() {
    return Array.from(this.labs.values()).sort((a, b) => a.number - b.number);
  }

  async updateLabDone(id: number, done: boolean) {
    const lab = this.labs.get(id);
    if (!lab) return undefined;
    lab.done = done;
    return lab;
  }

  async getWeeklyPlan() {
    return Array.from(this.weeklyPlan.values()).sort((a, b) => a.id - b.id);
  }

  async updateWeekStatus(id: number, status: WeekStatus) {
    const week = this.weeklyPlan.get(id);
    if (!week) return undefined;
    week.status = status;
    return week;
  }

  async getPracticeTests() {
    return Array.from(this.practiceTests.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createPracticeTest(test: InsertPracticeTest) {
    const id = this.nextTestId++;
    const nextTest: PracticeTest = { id, ...test };
    this.practiceTests.set(id, nextTest);
    return nextTest;
  }

  async getTopics() {
    return Array.from(this.topics.values()).sort((a, b) => a.id - b.id);
  }

  async updateTopic(id: number, updates: { confidence?: number; studied?: boolean; notes?: string }) {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    if (updates.confidence !== undefined) topic.confidence = updates.confidence;
    if (updates.studied !== undefined) topic.studied = updates.studied;
    if (updates.notes !== undefined) topic.notes = updates.notes;
    return topic;
  }

  async getRedditTips() {
    return this.redditTips;
  }
}

class DatabaseStorage implements IStorage {
  private sql = neon(process.env.DATABASE_URL!);
  private seedData = loadSeedData();
  private initPromise: Promise<void> | null = null;

  private async ready() {
    if (!this.initPromise) {
      this.initPromise = this.initialize().catch((error) => {
        this.initPromise = null;
        throw error;
      });
    }
    await this.initPromise;
  }

  private async initialize() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT PRIMARY KEY,
        number INT NOT NULL,
        title TEXT NOT NULL,
        duration TEXT NOT NULL,
        domain TEXT NOT NULL,
        week TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Not Started'
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS labs (
        id INT PRIMARY KEY,
        number INT NOT NULL,
        week_header TEXT NOT NULL,
        week TEXT NOT NULL,
        domain TEXT NOT NULL,
        title TEXT NOT NULL,
        practice TEXT NOT NULL,
        platform TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT false
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS weekly_plan (
        id INT PRIMARY KEY,
        week TEXT NOT NULL,
        dates TEXT NOT NULL,
        focus TEXT NOT NULL,
        cbt_lessons TEXT NOT NULL,
        other_study TEXT NOT NULL,
        labs_desc TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Not Started',
        anki_tags TEXT NOT NULL DEFAULT '',
        is_travel BOOLEAN NOT NULL DEFAULT false
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS practice_tests (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        date TEXT NOT NULL,
        overall_score INT NOT NULL,
        domain_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT NOT NULL DEFAULT ''
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS topics (
        id INT PRIMARY KEY,
        domain TEXT NOT NULL,
        topic TEXT NOT NULL,
        subtopic TEXT,
        confidence INT NOT NULL DEFAULT 1,
        studied BOOLEAN NOT NULL DEFAULT false,
        cbt_ref TEXT,
        notes TEXT
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS reddit_tips (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL UNIQUE,
        items_json JSONB NOT NULL,
        sort_order INT NOT NULL
      )
    `;

    const lessonCount = (await this.sql`SELECT COUNT(*)::text AS count FROM lessons`) as unknown as Array<{ count: string }>;
    if (Number.parseInt(lessonCount[0]?.count || "0", 10) === 0) {
      await this.seedDatabase();
    }
  }

  private async seedDatabase() {
    if (this.seedData.cbtLessons) {
      for (const [index, lesson] of this.seedData.cbtLessons.entries()) {
        await this.sql`
          INSERT INTO lessons (id, number, title, duration, domain, week, status)
          VALUES (${index + 1}, ${lesson.number}, ${lesson.title}, ${lesson.domain}, ${lesson.duration}, ${lesson.week}, ${lesson.status})
        `;
      }
    }

    if (this.seedData.labs) {
      for (const [index, lab] of this.seedData.labs.entries()) {
        await this.sql`
          INSERT INTO labs (id, number, week_header, week, domain, title, practice, platform, done)
          VALUES (${index + 1}, ${lab.number}, ${lab.weekHeader}, ${lab.week}, ${lab.domain}, ${lab.title}, ${lab.practice}, ${lab.platform}, ${lab.done === "Done"})
        `;
      }
    }

    if (this.seedData.weeklyPlan) {
      for (const [index, week] of this.seedData.weeklyPlan.entries()) {
        await this.sql`
          INSERT INTO weekly_plan (id, week, dates, focus, cbt_lessons, other_study, labs_desc, status, anki_tags, is_travel)
          VALUES (
            ${index + 1},
            ${week.week},
            ${week.dates},
            ${week.focus},
            ${week.cbtLessons},
            ${week.otherStudy},
            ${week.labs},
            ${week.status},
            ${week.ankiTags || ""},
            ${week.focus.toUpperCase().includes("TRAVEL")}
          )
        `;
      }
    }

    if (this.seedData.topics) {
      let topicId = 0;
      for (const topic of this.seedData.topics) {
        if (topic.domain === "Topic #") continue;
        topicId += 1;
        const studied = typeof topic.studied === "string" && topic.studied.length > 0;
        const cbtRef = typeof topic.studied === "string" ? topic.studied : null;
        await this.sql`
          INSERT INTO topics (id, domain, topic, subtopic, confidence, studied, cbt_ref, notes)
          VALUES (
            ${topicId},
            ${topic.domain},
            ${topic.topic},
            ${topic.subtopic || null},
            ${typeof topic.confidence === "number" ? topic.confidence : 1},
            ${studied},
            ${cbtRef},
            ${topic.notes || null}
          )
        `;
      }
    }

    if (this.seedData.redditTips) {
      for (const [index, tip] of this.seedData.redditTips.entries()) {
        await this.sql`
          INSERT INTO reddit_tips (title, items_json, sort_order)
          VALUES (${tip.title}, ${JSON.stringify(tip.items)}, ${index})
        `;
      }
    }
  }

  async getLessons() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM lessons ORDER BY number`) as unknown as DbLessonRow[];
    return rows;
  }

  async updateLessonStatus(id: number, status: LessonStatus) {
    await this.ready();
    const rows = (await this.sql`
      UPDATE lessons
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `) as unknown as DbLessonRow[];
    return rows[0];
  }

  async getLabs() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM labs ORDER BY number`) as unknown as DbLabRow[];
    return rows.map(mapLabRow);
  }

  async updateLabDone(id: number, done: boolean) {
    await this.ready();
    const rows = (await this.sql`
      UPDATE labs
      SET done = ${done}
      WHERE id = ${id}
      RETURNING *
    `) as unknown as DbLabRow[];
    return rows[0] ? mapLabRow(rows[0]) : undefined;
  }

  async getWeeklyPlan() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM weekly_plan ORDER BY id`) as unknown as DbWeekRow[];
    return rows.map(mapWeekRow);
  }

  async updateWeekStatus(id: number, status: WeekStatus) {
    await this.ready();
    const rows = (await this.sql`
      UPDATE weekly_plan
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `) as unknown as DbWeekRow[];
    return rows[0] ? mapWeekRow(rows[0]) : undefined;
  }

  async getPracticeTests() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM practice_tests ORDER BY date DESC, id DESC`) as unknown as DbTestRow[];
    return rows.map(mapTestRow);
  }

  async createPracticeTest(test: InsertPracticeTest) {
    await this.ready();
    const rows = (await this.sql`
      INSERT INTO practice_tests (platform, date, overall_score, domain_scores, notes)
      VALUES (${test.platform}, ${test.date}, ${test.overallScore}, ${JSON.stringify(test.domainScores)}, ${test.notes})
      RETURNING *
    `) as unknown as DbTestRow[];
    return mapTestRow(rows[0]);
  }

  async getTopics() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM topics ORDER BY id`) as unknown as DbTopicRow[];
    return rows.map(mapTopicRow);
  }

  async updateTopic(id: number, updates: { confidence?: number; studied?: boolean; notes?: string }) {
    await this.ready();
    const existingRows = (await this.sql`SELECT * FROM topics WHERE id = ${id}`) as unknown as DbTopicRow[];
    const existing = existingRows[0];
    if (!existing) return undefined;

    const rows = (await this.sql`
      UPDATE topics
      SET confidence = ${updates.confidence ?? existing.confidence},
          studied = ${updates.studied ?? existing.studied},
          notes = ${updates.notes ?? existing.notes}
      WHERE id = ${id}
      RETURNING *
    `) as unknown as DbTopicRow[];
    return rows[0] ? mapTopicRow(rows[0]) : undefined;
  }

  async getRedditTips() {
    await this.ready();
    const rows = (await this.sql`SELECT * FROM reddit_tips ORDER BY sort_order, id`) as unknown as DbRedditTipRow[];
    return rows.map((row) => ({
      title: row.title,
      items:
        typeof row.items_json === "string"
          ? (JSON.parse(row.items_json) as RedditTip["items"])
          : (row.items_json as unknown as RedditTip["items"]),
    }));
  }
}

function mapLabRow(row: DbLabRow): Lab {
  return {
    id: row.id,
    number: row.number,
    weekHeader: row.week_header,
    week: row.week,
    domain: row.domain,
    title: row.title,
    practice: row.practice,
    platform: row.platform,
    done: row.done,
  };
}

function mapWeekRow(row: DbWeekRow): WeeklyPlan {
  return {
    id: row.id,
    week: row.week,
    dates: row.dates,
    focus: row.focus,
    cbtLessons: row.cbt_lessons,
    otherStudy: row.other_study,
    labs: row.labs_desc,
    status: row.status,
    ankiTags: row.anki_tags,
    isTravel: row.is_travel,
  };
}

function mapTestRow(row: DbTestRow): PracticeTest {
  const domainScores =
    typeof row.domain_scores === "string"
      ? (JSON.parse(row.domain_scores) as Record<string, number>)
      : row.domain_scores || {};

  return {
    id: row.id,
    platform: row.platform,
    date: row.date,
    overallScore: row.overall_score,
    domainScores,
    notes: row.notes || "",
  };
}

function mapTopicRow(row: DbTopicRow): Topic {
  return {
    id: row.id,
    domain: row.domain,
    topic: row.topic,
    subtopic: row.subtopic,
    confidence: row.confidence,
    studied: row.studied,
    cbtRef: row.cbt_ref,
    notes: row.notes,
  };
}

export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
