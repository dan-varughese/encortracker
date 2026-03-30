import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { CbtLesson, LessonStatus } from "@shared/schema";

const DOMAIN_COLORS: Record<string, string> = {
  Architecture: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Architecture (QoS)": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Virtualization: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Infrastructure: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Infrastructure (L2/STP)": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Infrastructure (L3/IP Svc)": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Network Assurance": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Security: "bg-red-500/15 text-red-400 border-red-500/20",
  "Automation & AI": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

export default function Lessons() {
  const [weekFilter, setWeekFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { isAuthenticated, requireAuth } = useAuth();

  const { data: lessons, isLoading } = useQuery<CbtLesson[]>({
    queryKey: ["/api/lessons"],
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: LessonStatus }) => {
      await apiRequest("PATCH", `/api/lessons/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plan"] });
    },
  });

  if (isLoading || !lessons) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const watched = lessons.filter((l) => l.status === "Watched").length;
  const skipped = lessons.filter((l) => l.status === "Skipped").length;
  const pct = lessons.length > 0 ? Math.round((watched / lessons.length) * 100) : 0;

  const weeks = Array.from(new Set(lessons.map((l) => l.week)));
  const domains = Array.from(new Set(lessons.map((l) => l.domain)));

  const filtered = lessons.filter((l) => {
    if (weekFilter !== "all" && l.week !== weekFilter) return false;
    if (domainFilter !== "all" && l.domain !== domainFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  // Group by week
  const grouped = filtered.reduce<Record<string, CbtLesson[]>>((acc, l) => {
    if (!acc[l.week]) acc[l.week] = [];
    acc[l.week].push(l);
    return acc;
  }, {});

  const weekOrder = ["Done", ...Array.from({ length: 10 }, (_, i) => `Wk ${i + 1}`)];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-lessons">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">CBT Nuggets Lessons</h1>
        <p className="text-sm text-muted-foreground">
          {watched}/{lessons.length} lessons watched
          {skipped > 0 && (
            <span className="text-amber-400/70 ml-1">
              ({skipped} skipped)
            </span>
          )}
        </p>
      </div>

      <Progress value={pct} className="h-2" data-testid="progress-lessons" />
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Read-only mode is on. Unlock edits to mark lessons watched.
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-32 h-8 text-xs" data-testid="filter-week">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {weeks.map((w) => (
              <SelectItem key={w} value={w}>{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-44 h-8 text-xs" data-testid="filter-domain">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Not Started">Not Started</SelectItem>
            <SelectItem value="Watched">Watched</SelectItem>
            <SelectItem value="Skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lesson list grouped by week */}
      <div className="space-y-4">
        {weekOrder
          .filter((w) => grouped[w])
          .map((weekKey) => (
            <Card key={weekKey} className="bg-card border-card-border">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {weekKey === "Done" ? "Already Completed" : weekKey}
                  <span className="ml-2 text-muted-foreground/60 normal-case">
                    ({grouped[weekKey].filter((l) => l.status === "Watched").length}/{grouped[weekKey].length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {grouped[weekKey].map((lesson) => {
                    const isSkipped = lesson.status === "Skipped";
                    const isWatched = lesson.status === "Watched";
                    const isBusy = mutation.isPending && mutation.variables?.id === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors group"
                        data-testid={`lesson-row-${lesson.id}`}
                      >
                        <Checkbox
                          checked={isWatched}
                          onCheckedChange={(checked) => {
                            if (!requireAuth()) return;
                            mutation.mutate({
                              id: lesson.id,
                              status: checked ? "Watched" : "Not Started",
                            });
                          }}
                          disabled={isBusy || isSkipped}
                          className={isSkipped ? "opacity-30" : ""}
                          data-testid={`checkbox-lesson-${lesson.id}`}
                        />
                        <span className="text-xs text-muted-foreground tabular-nums w-8 shrink-0">
                          #{lesson.number}
                        </span>
                        <span
                          className={`text-sm flex-1 min-w-0 truncate ${
                            isWatched
                              ? "text-muted-foreground line-through"
                              : isSkipped
                              ? "text-amber-400/60 line-through"
                              : ""
                          }`}
                        >
                          {lesson.title}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:block">
                          {lesson.duration}
                        </span>

                        {/* Skipped badge — click to un-skip */}
                        {isSkipped ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500/15 text-amber-400 border-amber-500/20 cursor-pointer hover:bg-amber-500/25"
                            onClick={() => {
                              if (!requireAuth()) return;
                              mutation.mutate({ id: lesson.id, status: "Not Started" });
                            }}
                          >
                            Skipped ✕
                          </Badge>
                        ) : (
                          /* Skip button — visible on hover for non-watched lessons */
                          !isWatched && (
                            <button
                              className="text-[10px] px-1.5 py-0.5 rounded shrink-0 text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!requireAuth()) return;
                                mutation.mutate({ id: lesson.id, status: "Skipped" });
                              }}
                              disabled={isBusy}
                            >
                              Skip
                            </button>
                          )
                        )}

                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 shrink-0 hidden md:inline-flex ${
                            DOMAIN_COLORS[lesson.domain] || ""
                          }`}
                        >
                          {lesson.domain.replace("Architecture (QoS)", "QoS")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
