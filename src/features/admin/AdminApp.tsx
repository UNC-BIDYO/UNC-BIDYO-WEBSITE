import { useState, type CSSProperties } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import { SidebarInset, SidebarProvider } from "@/shared/ui/primitives/sidebar";
import { Toaster } from "@/shared/ui/primitives/sonner";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { useSession } from "./auth";
import { BookingSheet } from "./bookings/BookingSheet";
import { BookingsPage } from "./bookings/BookingsPage";
import { BookingsCalendar } from "./dashboard/BookingsCalendar";
import { BookingsChart } from "./dashboard/BookingsChart";
import { SectionCards } from "./dashboard/SectionCards";
import { UpcomingEvents } from "./dashboard/UpcomingEvents";
import { ROUTES, useBookings, useRoute } from "./data";
import type { Booking } from "./format";
import { AppSidebar } from "./layout/AppSidebar";
import { SiteHeader } from "./layout/SiteHeader";
import { LoginPage } from "./login/LoginPage";
import { SettingsPage } from "./settings/SettingsPage";

export function AdminApp() {
  const session = useSession();
  return (
    <TooltipProvider>
      {session.status === "loading" ? (
        <div
          className="flex min-h-svh items-center justify-center text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="animate-spin" />
          <span className="sr-only">Loading</span>
        </div>
      ) : session.status === "signed-out" ? (
        <LoginPage />
      ) : (
        <Dashboard email={session.session.user.email ?? ""} />
      )}
      <Toaster theme="light" richColors closeButton position="top-right" />
    </TooltipProvider>
  );
}

/* Layout from the shadcn/ui "dashboard-01" block: inset sidebar + header + content. */
function Dashboard({ email }: { email: string }) {
  const route = useRoute();
  const data = useBookings();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = (b: Booking) => setOpenId(b.id);
  const selected = data.bookings.find((b) => b.id === openId) ?? null;
  const pendingCount = data.bookings.filter((b) => b.status === "pending").length;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" route={route} pendingCount={pendingCount} email={email} />
      <SidebarInset>
        <SiteHeader title={ROUTES[route]} onRefresh={data.reload} refreshing={data.loading} />
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          {data.error && (
            <div className="px-4 lg:px-6">
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Couldn't load bookings</AlertTitle>
                <AlertDescription>{data.error}</AlertDescription>
              </Alert>
            </div>
          )}
          {route === "dashboard" && (
            <>
              <SectionCards bookings={data.bookings} />
              <div className="px-4 lg:px-6">
                <BookingsChart bookings={data.bookings} />
              </div>
              <div className="grid gap-4 px-4 md:gap-6 lg:px-6 @5xl/main:grid-cols-[3fr_2fr]">
                <BookingsCalendar bookings={data.bookings} onOpen={open} />
                <UpcomingEvents bookings={data.bookings} onOpen={open} />
              </div>
            </>
          )}
          {route === "bookings" && (
            <BookingsPage bookings={data.bookings} loading={data.loading} onOpen={open} />
          )}
          {route === "settings" && <SettingsPage />}
        </div>
      </SidebarInset>
      <BookingSheet booking={selected} onClose={() => setOpenId(null)} onChange={data.replace} />
    </SidebarProvider>
  );
}
