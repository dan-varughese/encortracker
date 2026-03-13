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

  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });

  const mutation = useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      await apiRequest("PATCH", `/api/labs/${id}`, { done });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labs"] });
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

  const doneCount = labs.filter((l) => l.done).length;
  const pct = Math.round((doneCount / labs.length) * 100);

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

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-labs">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lab Exercises</h1>
        <p className="text-sm text-muted-foreground">
          {doneCount}/{labs.length} labs completed
        </p>
      </div>

      <Progress value={pct} className="h-2" data-testid="progress-labs" />

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
        {Object.entries(grouped).map(([header, headerLabs]) => (
          <Card key={header} className="bg-card border-card-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {header}
                <span className="ml-2 text-muted-foreground/60 normal-case">
                  ({headerLabs.filter((l) => l.done).length}/{headerLabs.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {headerLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                    data-testid={`lab-row-${lab.id}`}
                  >
                    <Checkbox
                      checked={lab.done}
                      onCheckedChange={(checked) => {
                        mutation.mutate({ id: lab.id, done: !!checked });
                      }}
                      className="mt-0.5"
                      data-testid={`checkbox-lab-${lab.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${lab.done ? "text-muted-foreground line-through" : ""}`}>
                        {lab.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                        {lab.practice}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${
                        PLATFORM_COLORS[lab.platform] || ""
                      }`}
                    >
                      {lab.platform}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
