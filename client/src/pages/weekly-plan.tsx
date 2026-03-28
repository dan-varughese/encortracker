import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Home, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import type { WeeklyPlan as WeeklyPlanType, WeekStatus, Lab, CbtLesson, LessonStatus } from "@shared/schema";

/** Map "Week 1" → "Wk 1", etc. so we can match weekly_plan rows to labs/lessons */
function weekToLabKey(weekName: string): string {
  const m = weekName.match(/Week\s*(\d+)/i);
  return m ? `Wk ${m[1]}` : weekName;
}

/** Compute the correct auto-status for a week based on its lessons + labs */
function computeWeekStatus(
  weekLessons: CbtLesson[],
  weekLabs: Lab[],
): WeekStatus {
  const totalItems = weekLessons.length + weekLabs.length;
  if (totalItems === 0) return "Not Started";

  const doneItems =
    weekLessons.filter((l) => l.status === "Watched").length +
    weekLabs.filter((l) => l.done).length;

  if (doneItems === 0) return "Not Started";
  if (doneItems === totalItems) return "Complete";
  return "In Progress";
}

export default function WeeklyPlan() {
  const { isAuthenticated, requireAuth } = useAuth();
  const { data: weeks, isLoading: weeksLoading } = useQuery<WeeklyPlanType[]>({
    queryKey: ["/api/weekly-plan"],
  });
  const { data: labs, isLoading: labsLoading } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });
  const { data: lessons, isLoading: lessonsLoading } = useQuery<CbtLesson[]>({
    queryKey: ["/api/lessons"],
  });

  const weekStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: WeekStatus }) => {
      await apiRequest("PATCH", `/api/weekly-plan/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plan"] });
    },
  });

  const lessonMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: LessonStatus }) => {
      await apiRequest("PATCH", `/api/lessons/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    },
  });

  const labMutation = useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      await apiRequest("PATCH", `/api/labs/${id}`, { done });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labs"] });
    },
  });

  // Track which week status syncs are in-flight to prevent loops
  const syncingRef = useRef<Set<number>>(new Set());

  // Auto-sync week statuses whenever data changes
  useEffect(() => {
    if (!weeks || !labs || !lessons || !isAuthenticated) return;

    const labsByWeek = labs.reduce<Record<string, Lab[]>>((acc, lab) => {
      if (!acc[lab.week]) acc[lab.week] = [];
      acc[lab.week].push(lab);
      return acc;
    }, {});

    const lessonsByWeek = lessons.reduce<Record<string, CbtLesson[]>>((acc, lesson) => {
      if (!acc[lesson.week]) acc[lesson.week] = [];
      acc[lesson.week].push(lesson);
      return acc;
    }, {});

    for (const w of weeks) {
      if (syncingRef.current.has(w.id)) continue;

      const labKey = weekToLabKey(w.week);
      const weekLabs = labsByWeek[labKey] || [];
      const weekLessons = lessonsByWeek[labKey] || [];
      const correctStatus = computeWeekStatus(weekLessons, weekLabs);

      if (correctStatus !== w.status) {
        syncingRef.current.add(w.id);
        apiRequest("PATCH", `/api/weekly-plan/${w.id}`, { status: correctStatus })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/weekly-plan"] });
          })
          .finally(() => {
            syncingRef.current.delete(w.id);
          });
      }
    }
  }, [weeks, labs, lessons, isAuthenticated]);

  const isLoading = weeksLoading || labsLoading || lessonsLoading;

  if (isLoading || !weeks || !labs || !lessons) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  // Group labs by their week key ("Wk 1", "Wk 2", etc.)
  const labsByWeek = labs.reduce<Record<string, Lab[]>>((acc, lab) => {
    if (!acc[lab.week]) acc[lab.week] = [];
    acc[lab.week].push(lab);
    return acc;
  }, {});

  // Group lessons by their week key ("Wk 1", "Wk 2", "Done", etc.)
  const lessonsByWeek = lessons.reduce<Record<string, CbtLesson[]>>((acc, lesson) => {
    if (!acc[lesson.week]) acc[lesson.week] = [];
    acc[lesson.week].push(lesson);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-weekly-plan">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Weekly Study Plan</h1>
        <p className="text-sm text-muted-foreground">
          10-week plan: March 16 — May 24, 2026
        </p>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground mt-1">
            Read-only mode is on. Unlock edits to change week status.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {weeks.map((w) => {
          const labKey = weekToLabKey(w.week);
          const weekLabs = labsByWeek[labKey] || [];
          const weekLessons = lessonsByWeek[labKey] || [];
          const labsDoneCount = weekLabs.filter((l) => l.done).length;
          const lessonsDoneCount = weekLessons.filter((l) => l.status === "Watched").length;

          return (
            <Card
              key={w.id}
              className={`bg-card border-card-border ${
                w.isTravel ? "border-l-4 border-l-amber-500" : ""
              }`}
              data-testid={`plan-week-${w.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">{w.week}</CardTitle>
                    <span className="text-xs text-muted-foreground">{w.dates}</span>
                    {w.isTravel ? (
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px] gap-1">
                        <Plane className="h-3 w-3" /> Travel
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20 text-[10px] gap-1">
                        <Home className="h-3 w-3" /> Home
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={w.status}
                    onValueChange={(val) => {
                      if (!requireAuth()) return;
                      weekStatusMutation.mutate({ id: w.id, status: val as WeekStatus });
                    }}
                    disabled={weekStatusMutation.isPending && weekStatusMutation.variables?.id === w.id}
                  >
                    <SelectTrigger
                      className={`w-36 h-7 text-xs ${
                        w.status === "Complete"
                          ? "border-emerald-500/30 text-emerald-400"
                          : w.status === "In Progress"
                          ? "border-primary/30 text-primary"
                          : ""
                      }`}
                      data-testid={`select-week-status-${w.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                      Focus
                    </h4>
                    <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
                      {w.focus}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                      CBT Lessons{weekLessons.length > 0 && (
                        <span className="ml-1 text-muted-foreground/60 normal-case">
                          ({lessonsDoneCount}/{weekLessons.length})
                        </span>
                      )}
                    </h4>
                    {weekLessons.length > 0 ? (
                      <ul className="space-y-0.5">
                        {weekLessons.map((lesson) => {
                          const isDone = lesson.status === "Watched";
                          return (
                            <li
                              key={lesson.id}
                              className={`flex items-start gap-1.5 cursor-pointer group ${
                                isDone ? "text-muted-foreground" : "text-foreground/90"
                              }`}
                              onClick={() => {
                                if (!requireAuth()) return;
                                const newStatus: LessonStatus = isDone ? "Not Started" : "Watched";
                                lessonMutation.mutate({ id: lesson.id, status: newStatus });
                              }}
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-400" />
                              ) : (
                                <Circle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                              )}
                              <span className={isDone ? "line-through" : ""}>
                                #{lesson.number} {lesson.title}
                                <span className="text-muted-foreground/50 ml-1">
                                  ({lesson.duration})
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
                        {w.cbtLessons}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                      Other Study
                    </h4>
                    <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
                      {w.otherStudy}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                      Labs{weekLabs.length > 0 && (
                        <span className="ml-1 text-muted-foreground/60 normal-case">
                          ({labsDoneCount}/{weekLabs.length})
                        </span>
                      )}
                    </h4>
                    {weekLabs.length > 0 ? (
                      <ul className="space-y-0.5">
                        {weekLabs.map((lab) => (
                          <li
                            key={lab.id}
                            className={`flex items-start gap-1.5 cursor-pointer group ${
                              lab.done ? "text-muted-foreground" : "text-foreground/90"
                            }`}
                            onClick={() => {
                              if (!requireAuth()) return;
                              labMutation.mutate({ id: lab.id, done: !lab.done });
                            }}
                          >
                            {lab.done ? (
                              <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-400" />
                            ) : (
                              <Circle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                            )}
                            <span className={lab.done ? "line-through" : ""}>
                              {lab.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                        {w.labs}
                      </p>
                    )}
                    {w.ankiTags && (
                      <div className="mt-2">
                        <span className="text-[10px] text-muted-foreground">Anki: </span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                          {w.ankiTags}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
