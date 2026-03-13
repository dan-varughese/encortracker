import {
  LayoutDashboard,
  MonitorPlay,
  FlaskConical,
  ClipboardCheck,
  CalendarDays,
  MessageSquareText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "CBT Nuggets", href: "/lessons", icon: MonitorPlay },
  { title: "Labs", href: "/labs", icon: FlaskConical },
  { title: "Practice Tests", href: "/tests", icon: ClipboardCheck },
  { title: "Weekly Plan", href: "/plan", icon: CalendarDays },
  { title: "Reddit Tips", href: "/tips", icon: MessageSquareText },
];

export function AppSidebar() {
  const [location] = useHashLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-label="ENCOR Tracker Logo"
            className="shrink-0"
          >
            <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
            <circle cx="10" cy="12" r="2.5" fill="currentColor" className="text-primary" />
            <circle cx="22" cy="12" r="2.5" fill="currentColor" className="text-primary" />
            <circle cx="16" cy="22" r="2.5" fill="currentColor" className="text-primary" />
            <line x1="10" y1="14.5" x2="16" y2="19.5" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            <line x1="22" y1="14.5" x2="16" y2="19.5" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            <line x1="10" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" className="text-primary/50" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">ENCOR 350-401</span>
            <span className="text-[11px] text-muted-foreground">Study Tracker</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
