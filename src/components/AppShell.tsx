import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Inbox,
  Send,
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  Bell,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Monthly leads", icon: Inbox },
  { to: "/sequences", label: "Sequences", icon: Send },
  { to: "/replies", label: "Replies", icon: MessageSquare },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const listNotifs = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifs(),
    refetchInterval: 60_000,
  });
  const unread = notifs.filter((n) => !n.read_at).length;

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-sidebar">
        <div className="px-6 py-5 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary grid place-items-center text-primary-foreground text-sm font-bold">S</div>
            <span className="font-semibold tracking-tight text-sidebar-foreground">ReDrive</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t text-xs text-muted-foreground">
          Signed in as
          <div className="truncate text-sidebar-foreground font-medium">{email}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-end gap-2 px-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="relative p-2 rounded-md hover:bg-accent transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifs.length === 0 && (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">No notifications yet</div>
              )}
              {notifs.slice(0, 8).map((n) => (
                <DropdownMenuItem key={n.id} onClick={() => markRead({ data: { id: n.id } }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))} className="flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2 w-full">
                    {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span className="font-medium text-sm">{n.title}</span>
                  </div>
                  {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
