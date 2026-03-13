import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { PracticeTest } from "@shared/schema";

const DOMAINS = [
  "Architecture",
  "Virtualization",
  "Infrastructure",
  "Network Assurance",
  "Security",
  "Automation & AI",
];

const PLATFORMS = ["Boson ExSim", "Pearson Test Prep", "Pocket Prep"];

export default function PracticeTests() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [domainScores, setDomainScores] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { isAuthenticated, requireAuth } = useAuth();

  const { data: tests, isLoading } = useQuery<PracticeTest[]>({
    queryKey: ["/api/practice-tests"],
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/practice-tests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice-tests"] });
      setOpen(false);
      resetForm();
    },
  });

  function resetForm() {
    setPlatform("");
    setDate(new Date().toISOString().split("T")[0]);
    setScore("");
    setNotes("");
    setDomainScores({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;

    const parsedScore = Number.parseInt(score, 10);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      toast({
        title: "Invalid score",
        description: "Overall score must be a number between 0 and 100.",
      });
      return;
    }

    const ds: Record<string, number> = {};
    for (const [k, v] of Object.entries(domainScores)) {
      if (!v) continue;
      const parsedValue = Number.parseInt(v, 10);
      if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
        toast({
          title: "Invalid domain score",
          description: `${k} must be a number between 0 and 100.`,
        });
        return;
      }
      ds[k] = parsedValue;
    }
    mutation.mutate({
      platform,
      date,
      overallScore: parsedScore,
      domainScores: ds,
      notes,
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const sortedTests = [...(tests || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build radar data from latest test
  const latestTest = tests && tests.length > 0 ? tests[0] : null;
  const radarData = DOMAINS.map((d) => ({
    domain: d.length > 12 ? d.slice(0, 12) + "…" : d,
    fullDomain: d,
    score: latestTest?.domainScores?.[d] ?? 0,
  }));

  // Trend chart
  const trendData = sortedTests.map((t) => ({
    date: t.date,
    score: t.overallScore,
    platform: t.platform,
  }));

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="page-practice-tests">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Practice Tests</h1>
          <p className="text-sm text-muted-foreground">
            {tests?.length ?? 0} tests logged
          </p>
          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground mt-1">
              Read-only mode is on. Unlock edits to log new scores.
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            size="sm"
            type="button"
            onClick={() => {
              if (!requireAuth()) return;
              setOpen(true);
            }}
            data-testid="button-add-test"
          >
            <Plus className="h-4 w-4 mr-1" /> Log Score
          </Button>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Practice Test</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    data-testid="input-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Overall Score %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="e.g. 78"
                    data-testid="input-score"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Domain Scores (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map((d) => (
                    <div key={d} className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground min-w-0 flex-1 truncate">
                        {d}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-16 h-7 text-xs"
                        value={domainScores[d] || ""}
                        onChange={(e) =>
                          setDomainScores({ ...domainScores, [d]: e.target.value })
                        }
                        data-testid={`input-domain-${d.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Weak areas, time management notes..."
                  data-testid="input-notes"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!platform || !score || mutation.isPending}
                data-testid="button-submit-test"
              >
                {mutation.isPending ? "Saving..." : "Save Score"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Charts row */}
      {tests && tests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Score Trend */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Domain Radar */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Domain Breakdown (Latest)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test History Table */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Test History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tests && tests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Platform</th>
                    <th className="text-right px-4 py-2 font-medium">Score</th>
                    <th className="text-center px-4 py-2 font-medium">Trend</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tests.map((t, idx) => {
                    const prev = tests[idx + 1];
                    const trend = prev
                      ? t.overallScore > prev.overallScore
                        ? "up"
                        : t.overallScore < prev.overallScore
                        ? "down"
                        : "flat"
                      : "flat";
                    return (
                      <tr key={t.id} className="hover:bg-muted/30" data-testid={`test-row-${t.id}`}>
                        <td className="px-4 py-2 text-xs tabular-nums">{t.date}</td>
                        <td className="px-4 py-2">
                          <Badge variant="secondary" className="text-[10px]">{t.platform}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">
                          <span
                            className={
                              t.overallScore >= 80
                                ? "text-emerald-400"
                                : t.overallScore >= 75
                                ? "text-amber-400"
                                : "text-red-400"
                            }
                          >
                            {t.overallScore}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto" />}
                          {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mx-auto" />}
                          {trend === "flat" && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell max-w-48 truncate">
                          {t.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No practice tests logged yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click "Log Score" to record your first Boson or Pearson test result.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness threshold */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>80%+ Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>75-80% Almost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>&lt;75% Keep Studying</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
