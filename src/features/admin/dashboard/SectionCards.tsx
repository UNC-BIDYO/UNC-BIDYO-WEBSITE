import { CalendarCheck, CircleX, Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { isoDay, type Booking } from "../format";

/* Adapted from the shadcn/ui "dashboard-01" block (section-cards). */
export function SectionCards({ bookings }: { bookings: Booking[] }) {
  const today = isoDay(new Date());
  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const monthAgo = Date.now() - 30 * 864e5;

  const pending = bookings.filter((b) => b.status === "pending").length;
  const upcoming = bookings.filter(
    (b) => b.status === "approved" && (b.end_date ?? b.start_date) >= today,
  ).length;
  const declined30 = bookings.filter(
    (b) => b.status === "declined" && b.decided_at && Date.parse(b.decided_at) >= monthAgo,
  ).length;
  const created = (key: string) =>
    bookings.filter((b) => b.created_at && monthKey(new Date(b.created_at)) === key).length;
  const requestsThisMonth = created(thisMonth);
  const requestsLastMonth = created(lastMonth);
  const change =
    requestsLastMonth > 0
      ? Math.round(((requestsThisMonth - requestsLastMonth) / requestsLastMonth) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending review</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pending}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Clock3 />
              To do
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <a href="#/bookings" className="font-medium underline-offset-4 hover:underline">
            Review requests
          </a>
          <div className="text-muted-foreground">Waiting for approve or disapprove</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Upcoming approved</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {upcoming}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CalendarCheck />
              Booked
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Events we're covering</div>
          <div className="text-muted-foreground">From today onward</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Declined</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {declined30}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CircleX />
              30 days
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Disapproved or date unavailable</div>
          <div className="text-muted-foreground">In the last 30 days</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Requests this month</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {requestsThisMonth}
          </CardTitle>
          {change !== null && (
            <CardAction>
              <Badge variant="outline">
                {change >= 0 ? <TrendingUp /> : <TrendingDown />}
                {change >= 0 ? "+" : ""}
                {change}%
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            {change === null
              ? "New this month"
              : change >= 0
                ? "Up from last month"
                : "Down from last month"}
          </div>
          <div className="text-muted-foreground">{requestsLastMonth} last month</div>
        </CardFooter>
      </Card>
    </div>
  );
}
