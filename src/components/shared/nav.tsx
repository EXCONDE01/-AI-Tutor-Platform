"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Bell, HelpCircle, LayoutDashboard, Users, BookOpen, MessageSquare, BarChart3, Settings as SettingsIcon, Shield, FileText, Bell as BellIcon, UserCheck, UserPlus, Menu, X, UserCog } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  { name: "Classes", href: "/teacher/classes", icon: Users },
  { name: "Sessions", href: "/teacher/sessions", icon: MessageSquare },
  { name: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
];

const roleNav: Record<string, NavItem[]> = {
  teacher: navigation,
  student: [
    { name: "My Classes", href: "/student/classes", icon: BookOpen },
    { name: "My Sessions", href: "/student/sessions", icon: MessageSquare },
    { name: "Artifacts", href: "/student/artifacts", icon: FileText },
    { name: "Notifications", href: "/student/notifications", icon: BellIcon },
  ],
  parent: [
    { name: "Children", href: "/parent/children", icon: Users },
    { name: "Consent", href: "/parent/consent", icon: UserCheck },
  ],
  admin: [
    { name: "Districts", href: "/admin/districts", icon: Shield },
    { name: "Audit Logs", href: "/admin/audit", icon: FileText },
    { name: "Retention", href: "/admin/retention", icon: SettingsIcon },
    { name: "Consent Records", href: "/admin/compliance/consent", icon: UserCheck },
  ],
};

function getRoleBadge(role: string) {
  const badges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple" }> = {
    teacher: { label: "Teacher", variant: "purple" },
    student: { label: "Student", variant: "success" },
    parent: { label: "Parent", variant: "warning" },
    admin: { label: "Admin", variant: "destructive" },
  };
  return badges[role] || { label: role, variant: "default" };
}

export function NavMain({ role, onClose, compact = false }: { role: "teacher" | "student" | "parent" | "admin"; onClose?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  // Use the server-verified role prop as source of truth
  // Neon Auth's session.user.role is "user" by default, not our app-level role
  const actualRole = role;

  const items = roleNav[actualRole] || [];

  // Show loading state while session loads
  if (isPending) {
    return (
      <nav className="flex flex-col gap-1 p-4" aria-label="Main navigation" aria-busy="true">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-50">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-50">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        </div>
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-1 w-full", compact ? "p-2" : "p-4")} aria-label="Main navigation">
      {items.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No navigation items for role: {actualRole}
        </div>
      )}
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const isComingSoon = item.comingSoon;
        return (
          isComingSoon ? (
            <span
              key={item.name}
              className={cn(
                "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors opacity-50 cursor-pointer",
                compact
                  ? "justify-center gap-0 group-hover:justify-start group-hover:gap-3 group-hover:px-3"
                  : "px-3 justify-start gap-3",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={cn(
                "transition-all duration-200 ease-out whitespace-nowrap overflow-hidden",
                compact ? "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100" : "w-auto opacity-100"
              )}>
                {item.name}
              </span>
              <span className={cn(
                "text-xs text-muted-foreground transition-all duration-200 ease-out whitespace-nowrap overflow-hidden",
                compact ? "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100" : "w-auto opacity-100"
              )}>
                (coming soon)
              </span>
            </span>
          ) : (
            <Link
              key={item.name}
              href={item.href as any}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                compact
                  ? "justify-center gap-0 group-hover:justify-start group-hover:gap-3 group-hover:px-3"
                  : "px-3 justify-start gap-3",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={cn(
                "transition-all duration-200 ease-out whitespace-nowrap overflow-hidden",
                compact ? "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100" : "w-auto opacity-100"
              )}>
                {item.name}
              </span>
            </Link>
          )
        );
      })}
    </nav>
  );
}

export function NavUser({ displayName, role, onClose }: { displayName?: string; role: "teacher" | "student" | "parent" | "admin"; onClose?: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const roleBadge = getRoleBadge(role);

  const handleSignOut = async () => {
    // The upstream sign-out round trip can take ~1s. Give it a brief head
    // start so the cookie-clearing response usually lands, then navigate
    // immediately instead of blocking the UI on the network.
    await Promise.race([
      signOut().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);

    // Replace so the authenticated page is not kept in history, then refresh
    // so middleware and server components re-evaluate the cleared cookie.
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-full justify-start gap-3 rounded-md px-3" size="icon">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
            <AvatarFallback className="text-xs font-medium">
              {displayName ? displayName.charAt(0).toUpperCase() : user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start w-full min-w-0 flex-1">
            <span className="truncate text-sm font-medium text-left w-full">{displayName ?? user?.name ?? "User"}</span>
            <span className="truncate text-xs text-muted-foreground text-left w-full">{user?.email || ""}</span>
            <Badge variant={roleBadge.variant} className="mt-1.5 text-[10px] h-4 px-2">
              {roleBadge.label}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName ?? user?.name ?? "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${role}/settings`} onClick={onClose} className="flex w-full items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span className="flex w-full items-center gap-2 opacity-50 cursor-pointer">
            <HelpCircle className="h-4 w-4" />
            <span>Help & Support <span className="text-xs text-muted-foreground ml-2">(coming soon)</span></span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ role, title, description, actions, displayName }: { 
  role: "teacher" | "student" | "parent" | "admin";
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  displayName?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Use the server-verified role prop as source of truth
  // Neon Auth's session.user.role is "user" by default, not our app-level role
  const actualRole = role;

  const roleLinks: Record<string, Array<{ name: string; href: string; comingSoon?: boolean }>> = {
    teacher: [
      { name: "Dashboard", href: "/teacher/dashboard" },
      { name: "Classes", href: "/teacher/classes" },
      { name: "Sessions", href: "/teacher/sessions" },
      { name: "Analytics", href: "/teacher/analytics" },
    ],
    student: [
      { name: "My Classes", href: "/student/classes" },
      { name: "My Sessions", href: "/student/sessions" },
      { name: "Artifacts", href: "/student/artifacts" },
      { name: "Notifications", href: "/student/notifications" },
    ],
    parent: [
      { name: "My Children", href: "/parent/children" },
      { name: "Consent", href: "/parent/consent" },
    ],
    admin: [
      { name: "Districts", href: "/admin/districts" },
      { name: "Audit", href: "/admin/audit" },
      { name: "Retention", href: "/admin/retention" },
      { name: "Consent Records", href: "/admin/compliance/consent" },
    ],
  };

  const links = roleLinks[actualRole] || [];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 flex-1 min-w-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <span className="text-primary">AI</span>Tutor
        </Link>
        {description && (
          <span className="text-sm text-muted-foreground hidden sm:block truncate">{description}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <NavUser displayName={displayName} role={actualRole} onClose={() => setMobileMenuOpen(false)} />
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                <span className="text-primary">AI</span>Tutor
              </Link>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </div>
            <NavMain role={actualRole} onClose={() => setMobileMenuOpen(false)} />
            <div className="border-t p-4">
              <NavUser displayName={displayName} role={actualRole} onClose={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function Sidebar({ role, children }: { 
  role: "teacher" | "student" | "parent" | "admin";
  children?: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Use the server-verified role prop as source of truth
  const actualRole = role;

  if (isPending) {
    return (
      <aside className="hidden lg:block fixed top-16 bottom-0 left-0 z-30 w-20 transition-[width] duration-200 ease-out hover:w-64 hover:shadow-xl hover:z-50 focus-within:w-64 focus-within:z-50">
        <div className="flex h-full w-full flex-col border-r bg-background">
          <div className="p-4">
            <div className="h-10 w-full animate-pulse rounded bg-muted mb-4" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted mb-2" />
            <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex-1" />
          <div className="border-t p-4">{children}</div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className="hidden lg:block fixed top-16 bottom-0 left-0 z-30 transition-[width] duration-200 ease-out hover:w-64 hover:shadow-xl hover:z-50"
      style={{ width: isExpanded ? '16rem' : '5rem' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-full w-full flex-col border-r bg-background overflow-hidden">
        <NavMain role={actualRole} compact={!isExpanded} />
        <div className="flex-1" />
        <div className="border-t p-4">{children}</div>
      </div>
    </aside>
  );
}