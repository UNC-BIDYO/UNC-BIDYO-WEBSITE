import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/primitives/chart";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/primitives/toggle-group";
import type { Booking } from "../format";

const config = {
  pending: { label: "Pending", color: "var(--chart-4)" },
  approved: { label: "Approved", color: "var(--chart-2)" },
  declined: { label: "Declined", color: "var(--chart-1)" },
} satisfies ChartConfig;

const weekLabel = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

/** Monday 00:00 of the week containing `d`. */
const weekStart = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
};

/* Adapted from the shadcn/ui "dashboard-01" block (chart-area-interactive): requests per week,
   stacked by their current status. */
export function BookingsChart({ bookings }: { bookings: Booking[] }) {
  const [weeks, setWeeks] = useState("12");

  const data = useMemo(() => {
    const n = Number(weeks);
    const first = weekStart(new Date());
    first.setDate(first.getDate() - 7 * (n - 1));
    const rows = Array.from({ length: n }, (_, i) => {
      const start = new Date(first);
      start.setDate(first.getDate() + 7 * i);
      return { week: start.getTime(), pending: 0, approved: 0, declined: 0 };
    });
    for (const b of bookings) {
      if (!b.created_at) continue;
      const i = Math.floor(
        (weekStart(new Date(b.created_at)).getTime() - first.getTime()) / (7 * 864e5),
      );
      if (i >= 0 && i < n) rows[i][b.status ?? "pending"] += 1;
    }
    return rows;
  }, [bookings, weeks]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Booking requests</CardTitle>
        <CardDescription>Per week, by status, for the last {weeks} weeks</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={weeks}
            onValueChange={(v) => v && setWeeks(v)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="12">12 weeks</ToggleGroupItem>
            <ToggleGroupItem value="4">4 weeks</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data} margin={{ left: -20, right: 8 }}>
            <defs>
              {(Object.keys(config) as (keyof typeof config)[]).map((k) => (
                <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(v: number) => weekLabel.format(v)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload?.[0] ? `Week of ${weekLabel.format(payload[0].payload.week)}` : ""
                  }
                  indicator="dot"
                />
              }
            />
            {(["declined", "approved", "pending"] as const).map((k) => (
              <Area
                key={k}
                dataKey={k}
                type="monotone"
                fill={`url(#fill-${k})`}
                stroke={`var(--color-${k})`}
                stackId="a"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
