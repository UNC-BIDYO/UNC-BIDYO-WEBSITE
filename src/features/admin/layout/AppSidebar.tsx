import type { ComponentProps } from "react";
import {
  CalendarCheck,
  EllipsisVertical,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import logo from "@/shared/assets/brand/bidyo-logo-color.png";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/primitives/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/primitives/sidebar";
import { signOut } from "../auth";
import type { Route } from "../data";

const NAV: { route: Route; title: string; icon: typeof LayoutDashboard }[] = [
  { route: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { route: "bookings", title: "Bookings", icon: CalendarCheck },
  { route: "settings", title: "Settings", icon: Settings },
];

/* Adapted from the shadcn/ui "dashboard-01" block (app-sidebar, nav-main, nav-user), with
   lucide icons. */
export function AppSidebar({
  route,
  pendingCount,
  email,
  ...props
}: ComponentProps<typeof Sidebar> & { route: Route; pendingCount: number; email: string }) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#/">
                <img src={logo} alt="" className="h-5 w-auto" />
                <span className="text-base font-semibold">Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.route}>
                  <SidebarMenuButton asChild isActive={route === item.route} tooltip={item.title}>
                    <a href={`#/${item.route === "dashboard" ? "" : item.route}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                  {item.route === "bookings" && pendingCount > 0 && (
                    <SidebarMenuBadge aria-label={`${pendingCount} pending`}>
                      {pendingCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/" target="_blank" rel="noopener">
                    <ExternalLink />
                    <span>View website</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={email} />
      </SidebarFooter>
    </Sidebar>
  );
}

function NavUser({ email }: { email: string }) {
  const { isMobile } = useSidebar();
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Signed in</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
