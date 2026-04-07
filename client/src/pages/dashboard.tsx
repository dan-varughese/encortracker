import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MonitorPlay,
  FlaskConical,
  Clock,
  CalendarClock,
  TrendingUp,
  Plane,
  Home,
} from "lucide-react";
import type { CbtLesson, Lab, WeeklyPlan, PracticeTest } from "@shared/schema";

const DOMAIN_MAP: Record<string, string> = {
  "Architecture": "Architecture",
  "Architecture (QoS)": "Architecture",
  "Virtualization": "Virtualization",
  "Infrastructure": "Infrastructure",
  "Infrastructure (L2/STP)": "Infrastructure",
  "Infrastructure (L3/IP Svc)": "Infrastructure",
  "Network Assurance": "Network Assurance",
  "Security": "Security",
  "Automation & AI": "Automation & AI",
};

const DOMAIN_COLORS: Record<string, string> = {
  "Architecture": "bg-blue-500",
  "Virtualization": "bg-purple-500",
  "Infrastructure": "bg-emerald-500",
  "Network Assurance": "bg-amber-500",
  "Security": "bg-red-500",
  "Automation & AI": "bg-cyan-500",
};

function getDaysUntilDeadline(): number {
  const deadline = new Date("2026-06-06");
  const now = new Date();
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const { data: lessons, isLoading: lessonsLoading } = useQuery<CbtLesson[]>({
    queryKey: ["/api/lessons"],
  });
  const { data: labs, isLoading: labsLoading } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });
  const { data: weeks, isLoading: weeksLoading } = useQuery<WeeklyPlan[]>({
    queryKey: ["/api/weekly-plan"],
  });
  const { data: tests } = useQuery<PracticeTest[]>({
    queryKey: ["/api/practice-tests"],
  });

  const isLoading = lessonsLoading || labsLoading || weeksLoading;

  const watchedCount = lessons?.filter((l) => l.status === "Watched").length ?? 0;
  const totalLessons = lessons?.length ?? 74;
  const lessonPct = Math.round((watchedCount / totalLessons) * 100);

  const doneLabCount = labs?.filter((l) => l.done).length ?? 0;
  const totalLabs = labs?.length ?? 79;
  const labPct = Math.round((doneLabCount / totalLabs) * 100);

  const completedWeeks = weeks?.filter((w) => w.status === "Complete").length ?? 0;
  const totalWeeks = weeks?.length ?? 10;

  // Domain progress for lessons
  const domainProgress = getDomainProgress(lessons ?? []);

  const latestScore = tests && tests.length > 0 ? tests[0].overallScore : null;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="page-dashboard">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">CCNP ENCOR 350-401 study progress overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<MonitorPlay className="h-4 w-4 text-primary" />}
          label="Lessons"
          value={`${watchedCount}/${totalLessons}`}
          sub={`${totalLessons - watchedCount} remaining`}
          pct={lessonPct}
          testId="stat-lessons"
        />
        <StatCard
          icon={<FlaskConical className="h-4 w-4 text-emerald-500" />}
          label="Labs"
          value={`${doneLabCount}/${totalLabs}`}
          sub={`${totalLabs - doneLabCount} remaining`}
          pct={labPct}
          testId="stat-labs"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
          label="Weeks"
          value={`${completedWeeks}/${totalWeeks}`}
          sub={`${totalWeeks - completedWeeks} weeks left`}
          pct={Math.round((completedWeeks / totalWeeks) * 100)}
          testId="stat-weeks"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-red-400" />}
          label="Days to Deadline"
          value={getDaysUntilDeadline().toString()}
          sub="June 6, 2026"
          testId="stat-deadline"
        />
      </div>

      {/* Cert Race Leaderboard */}
      <Card className="bg-[#0a0a0a] border-card-border overflow-hidden">
        <CardContent className="p-0">
          <iframe
            src="https://cert-race.vercel.app/embed"
            title="Cert Race Leaderboard"
            width="100%"
            height="180"
            style={{ border: "none", display: "block", background: "#0a0a0a" }}
          />
        </CardContent>
      </Card>

      {/* Readiness + Domain Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Domain Progress */}
        <Card className="lg:col-span-2 bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Domain Progress — Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {domainProgress.map((d) => (
              <div key={d.domain} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{d.domain}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {d.watched}/{d.total} ({d.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${DOMAIN_COLORS[d.domain] || "bg-primary"}`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Readiness */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Exam Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            {latestScore !== null ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div
                  className={`text-4xl font-bold tabular-nums ${
                    latestScore >= 80 ? "text-emerald-500" : latestScore >= 75 ? "text-amber-500" : "text-red-500"
                  }`}
                >
                  {latestScore}%
                </div>
                <p className="text-xs text-muted-foreground">Latest practice score</p>
                <Badge
                  variant={latestScore >= 80 ? "default" : "secondary"}
                  className={
                    latestScore >= 80
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : latestScore >= 75
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {latestScore >= 80 ? "Ready" : latestScore >= 75 ? "Almost Ready" : "Keep Studying"}
                </Badge>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="text-3xl font-bold text-muted-foreground/40">—</div>
                <p className="text-xs text-muted-foreground">No practice tests logged yet</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Log a Boson or Pearson score to see your readiness level
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Timeline */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">10-Week Study Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {weeks?.map((w) => {
              const statusColor =
                w.status === "Complete"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : w.status === "In Progress"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30";
              return (
                <div
                  key={w.id}
                  className={`rounded-lg border-2 p-2 text-center ${statusColor}`}
                  data-testid={`week-card-${w.id}`}
                >
                  <div className="text-xs font-semibold">{w.week}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{w.dates}</div>
                  {w.isTravel && (
                    <Plane className="h-3 w-3 mx-auto mt-1 text-amber-500" />
                  )}
                  {!w.isTravel && (
                    <Home className="h-3 w-3 mx-auto mt-1 text-muted-foreground/50" />
                  )}
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1 py-0 ${
                        w.status === "Complete"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : w.status === "In Progress"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {w.status === "Not Started" ? "Pending" : w.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  pct,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  pct?: number;
  testId: string;
}) {
  return (
    <Card className="bg-card border-card-border" data-testid={testId}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
        {pct !== undefined && (
          <Progress value={pct} className="mt-2 h-1.5" />
        )}
      </CardContent>
    </Card>
  );
}

function getDomainProgress(lessons: CbtLesson[]) {
  const domains: Record<string, { total: number; watched: number }> = {
    Architecture: { total: 0, watched: 0 },
    Virtualization: { total: 0, watched: 0 },
    Infrastructure: { total: 0, watched: 0 },
    "Network Assurance": { total: 0, watched: 0 },
    Security: { total: 0, watched: 0 },
    "Automation & AI": { total: 0, watched: 0 },
  };

  for (const l of lessons) {
    const mapped = DOMAIN_MAP[l.domain] || l.domain;
    if (domains[mapped]) {
      domains[mapped].total++;
      if (l.status === "Watched") domains[mapped].watched++;
    }
  }

  return Object.entries(domains).map(([domain, { total, watched }]) => ({
    domain,
    total,
    watched,
    pct: total > 0 ? Math.round((watched / total) * 100) : 0,
  }));
}
