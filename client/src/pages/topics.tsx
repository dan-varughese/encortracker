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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Topic } from "@shared/schema";

const DOMAIN_COLORS: Record<string, string> = {
  "Architecture": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Virtualization": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Infrastructure": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Network Assurance": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Security": "bg-red-500/15 text-red-400 border-red-500/20",
  "Automation": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

function getDomainColor(domain: string) {
  for (const [key, val] of Object.entries(DOMAIN_COLORS)) {
    if (domain.includes(key)) return val;
  }
  return "";
}

const CONFIDENCE_LABELS = ["", "Low", "Basic", "Moderate", "Strong", "Solid"];
const CONFIDENCE_COLORS = [
  "",
  "text-red-400",
  "text-orange-400",
  "text-amber-400",
  "text-emerald-400",
  "text-green-400",
];

function ConfidenceDots({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <Tooltip key={level}>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                level <= value
                  ? `${CONFIDENCE_COLORS[value]} border-current bg-current`
                  : "border-muted-foreground/30 bg-transparent"
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"}`}
              data-testid={`confidence-dot-${level}`}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {CONFIDENCE_LABELS[level]}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export default function Topics() {
  const [domainFilter, setDomainFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [studiedFilter, setStudiedFilter] = useState("all");
  const { isAuthenticated, requireAuth } = useAuth();

  const { data: topics, isLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      confidence?: number;
      studied?: boolean;
      notes?: string;
    }) => {
      await apiRequest("PATCH", `/api/topics/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
    },
  });

  if (isLoading || !topics) {
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

  const studiedCount = topics.filter((t) => t.studied).length;
  const pct = Math.round((studiedCount / topics.length) * 100);
  const avgConfidence = topics.length
    ? (topics.reduce((s, t) => s + t.confidence, 0) / topics.length).toFixed(1)
    : "0";

  const domains = Array.from(new Set(topics.map((t) => t.domain)));

  const filtered = topics.filter((t) => {
    if (domainFilter !== "all" && t.domain !== domainFilter) return false;
    if (confidenceFilter !== "all" && String(t.confidence) !== confidenceFilter)
      return false;
    if (studiedFilter === "studied" && !t.studied) return false;
    if (studiedFilter === "not-studied" && t.studied) return false;
    return true;
  });

  // Group by domain
  const grouped = filtered.reduce<Record<string, Topic[]>>((acc, t) => {
    if (!acc[t.domain]) acc[t.domain] = [];
    acc[t.domain].push(t);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-topics">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Exam Topics</h1>
        <p className="text-sm text-muted-foreground">
          {studiedCount}/{topics.length} topics studied · avg confidence{" "}
          {avgConfidence}/5
        </p>
      </div>

      <Progress value={pct} className="h-2" data-testid="progress-topics" />
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Read-only mode is on. Unlock edits to update topic confidence.
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger
            className="w-44 h-8 text-xs"
            data-testid="filter-topic-domain"
          >
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger
            className="w-36 h-8 text-xs"
            data-testid="filter-topic-confidence"
          >
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {[1, 2, 3, 4, 5].map((c) => (
              <SelectItem key={c} value={String(c)}>
                {CONFIDENCE_LABELS[c]} ({c}/5)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={studiedFilter} onValueChange={setStudiedFilter}>
          <SelectTrigger
            className="w-36 h-8 text-xs"
            data-testid="filter-topic-studied"
          >
            <SelectValue placeholder="Studied" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="studied">Studied</SelectItem>
            <SelectItem value="not-studied">Not Studied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topics grouped by domain */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([domain, domainTopics]) => {
          const domainStudied = domainTopics.filter((t) => t.studied).length;
          return (
            <Card key={domain} className="bg-card border-card-border">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${getDomainColor(domain)}`}
                  >
                    {domain}
                  </Badge>
                  <span className="text-muted-foreground/60 normal-case">
                    ({domainStudied}/{domainTopics.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {domainTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                      data-testid={`topic-row-${topic.id}`}
                    >
                      <Checkbox
                        checked={topic.studied}
                        onCheckedChange={(checked) => {
                          if (!requireAuth()) return;
                          mutation.mutate({
                            id: topic.id,
                            studied: !!checked,
                          });
                        }}
                        disabled={
                          mutation.isPending &&
                          mutation.variables?.id === topic.id
                        }
                        data-testid={`checkbox-topic-${topic.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm ${topic.studied ? "text-muted-foreground line-through" : ""}`}
                        >
                          {topic.topic}
                        </div>
                        {topic.subtopic && (
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                            {topic.subtopic}
                          </div>
                        )}
                      </div>
                      <ConfidenceDots
                        value={topic.confidence}
                        onChange={(level) => {
                          if (!requireAuth()) return;
                          mutation.mutate({
                            id: topic.id,
                            confidence: level,
                          });
                        }}
                        disabled={
                          !isAuthenticated ||
                          (mutation.isPending &&
                            mutation.variables?.id === topic.id)
                        }
                      />
                      {topic.cbtRef && (
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:block">
                          {topic.cbtRef}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
