import { lazy, Suspense } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Lock, LockOpen } from "lucide-react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Lessons = lazy(() => import("@/pages/lessons"));
const Labs = lazy(() => import("@/pages/labs"));
const PracticeTests = lazy(() => import("@/pages/practice-tests"));
const WeeklyPlan = lazy(() => import("@/pages/weekly-plan"));
const RedditTips = lazy(() => import("@/pages/reddit-tips"));
const Topics = lazy(() => import("@/pages/topics"));

function RouteFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/lessons" component={Lessons} />
        <Route path="/labs" component={Labs} />
        <Route path="/tests" component={PracticeTests} />
        <Route path="/plan" component={WeeklyPlan} />
        <Route path="/tips" component={RedditTips} />
        <Route path="/topics" component={Topics} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Layout() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };
  const { isAuthenticated, isCheckingAuth, promptLogin, logout } = useAuth();

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={isAuthenticated ? logout : promptLogin}
                disabled={isCheckingAuth}
                data-testid="button-edit-auth"
              >
                {isAuthenticated ? (
                  <>
                    <LockOpen className="h-4 w-4 mr-1" />
                    Lock edits
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-1" />
                    Unlock edits
                  </>
                )}
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <AppRouter />
            <PerplexityAttribution />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <Layout />
          </Router>
        </AuthProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
