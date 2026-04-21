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
import type { Lab } from "@shared/schema";

const PLATFORM_COLORS: Record<string, string> = {
  "CBT Nuggets": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Cisco U": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  INE: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  CML: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  "CML + Python": "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export default function Labs() {
  const [weekFilter, setWeekFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const { isAuthenticated, requireAuth } = useAuth();

  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id: number; done?: boolean; skipped?: boolean }) => {
      await apiRequest("PATCH", `/api/labs/${payload.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plan"] });
    },
  });

  if (isLoading || !labs) {
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

  const doneCount = labs.filter((l) => l.done || l.skipped).length;
  const skippedCount = labs.filter((l) => l.skipped).length;
  const pct = labs.length > 0 ? Math.round((doneCount / labs.length) * 100) : 0;

  const weeks = Array.from(new Set(labs.map((l) => l.week)));
  const platforms = Array.from(new Set(labs.map((l) => l.platform)));

  const filtered = labs.filter((l) => {
    if (weekFilter !== "all" && l.week !== weekFilter) return false;
    if (platformFilter !== "all" && l.platform !== platformFilter) return false;
    return true;
  });

  // Group by weekHeader
  const grouped = filtered.reduce<Record<string, Lab[]>>((acc, l) => {
    if (!acc[l.weekHeader]) acc[l.weekHeader] = [];
    acc[l.weekHeader].push(l);
    return acc;
  }, {});

  // Sort labs within each week: CBT Nuggets first, then others by platform name
  Object.keys(grouped).forEach(header => {
    grouped[header].sort((a, b) => {
      const aIsCBT = a.platform === "CBT Nuggets" ? 0 : 1;
      const bIsCBT = b.platform === "CBT Nuggets" ? 0 : 1;
      return aIsCBT - bIsCBT;
    });
  });

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-labs">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lab Exercises</h1>
        <p className="text-sm text-muted-foreground">
          {doneCount}/{labs.length} labs completed
          {skippedCount > 0 && (
            <span className="text-amber-400/70 ml-1">
              ({skippedCount} skipped)
            </span>
          )}
        </p>
      </div>

      <Progress value={pct} className="h-2" data-testid="progress-labs" />
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Read-only mode is on. Unlock edits to update lab completion.
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-32 h-8 text-xs" data-testid="filter-lab-week">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {weeks.map((w) => (
              <SelectItem key={w} value={w}>{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40 h-8 text-xs" data-testid="filter-lab-platform">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Labs grouped by weekHeader */}
      <div className="space-y-4">
        {Object.entries(grouped)
        .sort(([a], [b]) => {
          const numA = parseInt(a.match(/\d+/)?.[0] ?? "0");
          const numB = parseInt(b.match(/\d+/)?.[0] ?? "0");
          return numA - numB;
        })
        .map(([header, headerLabs]) => (
          <Card key={header} className="bg-card border-card-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {header}
                <span className="ml-2 text-muted-foreground/60 normal-case">
                  ({headerLabs.filter((l) => l.done || l.skipped).length}/{headerLabs.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {headerLabs.map((lab) => {
                  const isBusy = mutation.isPending && mutation.variables?.id === lab.id;

                  return (
                    <div
                      key={lab.id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
                      data-testid={`lab-row-${lab.id}`}
                    >
                      <Checkbox
                        checked={lab.done}
                        onCheckedChange={(checked) => {
                          if (!requireAuth()) return;
                          mutation.mutate({ id: lab.id, done: !!checked });
                        }}
                        disabled={isBusy || lab.skipped}
                        className={`mt-0.5 ${lab.skipped ? "opacity-30" : ""}`}
                        data-testid={`checkbox-lab-${lab.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm ${
                            lab.done
                              ? "text-muted-foreground line-through"
                              : lab.skipped
                              ? "text-amber-400/60 line-through"
                              : ""
                          }`}
                        >
                          {lab.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                          {lab.practice}
                        </div>
                      </div>

                      {/* Skipped badge — click to un-skip */}
                      {lab.skipped ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500/15 text-amber-400 border-amber-500/20 cursor-pointer hover:bg-amber-500/25"
                          onClick={() => {
                            if (!requireAuth()) return;
                            mutation.mutate({ id: lab.id, skipped: false });
                          }}
                        >
                          Skipped ✕
                        </Badge>
                      ) : (
                        /* Skip button — visible on hover for non-done labs */
                        !lab.done && (
                          <button
                            className="text-[10px] px-1.5 py-0.5 rounded shrink-0 text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!requireAuth()) return;
                              mutation.mutate({ id: lab.id, skipped: true });
                            }}
                            disabled={isBusy}
                          >
                            Skip
                          </button>
                        )
                      )}

                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${
                          PLATFORM_COLORS[lab.platform] || ""
                        }`}
                      >
                        {lab.platform}
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
