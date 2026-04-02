import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { RedditTip } from "@shared/schema";

const SECTION_ICONS: Record<number, string> = {
  0: "🎯",
  1: "💡",
  2: "📚",
  3: "⭐",
  4: "🔥",
  5: "🔄",
  6: "⚠️",
  7: "🏆",
  8: "🔗",
};

export default function RedditTips() {
  const { data: tips, isLoading } = useQuery<RedditTip[]>({
    queryKey: ["/api/reddit-tips"],
  });

  if (isLoading || !tips) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-reddit-tips">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reddit Tips & Wisdom</h1>
        <p className="text-sm text-muted-foreground">
          Crowdsourced exam tips from r/ccnp — 10 sections of battle-tested advice
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2" defaultValue={["0"]}>
        {tips.map((section, idx) => (
          <AccordionItem key={idx} value={idx.toString()} className="border-0">
            <Card className="bg-card border-card-border overflow-hidden">
              <AccordionTrigger
                className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border"
                data-testid={`accordion-tip-${idx}`}
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-base">{SECTION_ICONS[idx] || "📌"}</span>
                  <span className="text-sm font-semibold">{section.title}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    {section.items.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="px-4 py-3 text-sm"
                        data-testid={`tip-item-${idx}-${itemIdx}`}
                      >
                        <div className="flex items-start gap-3">
                          {item.col_b && /^\d+$/.test(item.col_b.trim()) ? (
                            <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5 w-6 text-right">
                              {item.col_b}
                            </span>
                          ) : item.col_b ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 mt-0.5 whitespace-nowrap">
                              {item.col_b}
                            </Badge>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{item.col_c}</div>
                            {item.col_d && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                                {item.col_d}
                              </p>
                            )}
                            {item.col_e && (
                              <p className="text-[11px] text-primary/70 mt-1 italic">
                                {item.col_e}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
