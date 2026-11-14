import { CircleCheck, CircleX, Clock3 } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import type { BookingStatus } from "./format";

const STATUS: Record<
  BookingStatus,
  { label: string; variant: "secondary" | "default" | "destructive"; Icon: typeof Clock3 }
> = {
  pending: { label: "Pending", variant: "secondary", Icon: Clock3 },
  approved: { label: "Approved", variant: "default", Icon: CircleCheck },
  declined: { label: "Declined", variant: "destructive", Icon: CircleX },
};

/** A booking's status as a shadcn/ui Badge with a lucide icon. */
export function StatusBadge({ status }: { status?: BookingStatus }) {
  const s = STATUS[status ?? "pending"];
  return (
    <Badge variant={s.variant}>
      <s.Icon />
      {s.label}
    </Badge>
  );
}
