import { useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarX2,
  Check,
  FileText,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/primitives/alert-dialog";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import { Separator } from "@/shared/ui/primitives/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/primitives/sheet";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { decide, letterUrl, type DecideResult } from "../data";
import {
  eventDates,
  formatCrew,
  formatServices,
  fullName,
  submittedAt,
  type Booking,
} from "../format";
import { StatusBadge } from "../StatusBadge";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{children}</dd>
    </div>
  );
}

/* A booking's details in a shadcn/ui Sheet, with Approve / Disapprove (AlertDialog) and
   calendar-sync status. */
export function BookingSheet({
  booking,
  onClose,
  onChange,
}: {
  booking: Booking | null;
  onClose: () => void;
  onChange: (booking: Booking) => void;
}) {
  const [busy, setBusy] = useState<"approve" | "decline" | "sync" | "letter" | null>(null);
  const [reason, setReason] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);

  async function run(action: "approve" | "decline" | "sync") {
    if (!booking) return;
    setBusy(action);
    try {
      const r: DecideResult = await decide(
        booking.id,
        action,
        action === "decline" ? reason : undefined,
      );
      onChange(r.booking);
      if (action === "decline") {
        setDeclineOpen(false);
        setReason("");
        toast.success("Booking disapproved", {
          description: r.emailed
            ? "The requester was emailed the reason."
            : "No email was sent (check BOOKING_FROM).",
        });
      } else if (r.calendarSynced === false) {
        toast.warning(
          action === "approve"
            ? "Approved, but not added to Google Calendar"
            : "Still not on Google Calendar",
          {
            description: r.calendarError,
          },
        );
      } else {
        toast.success(action === "approve" ? "Booking approved" : "Added to Google Calendar", {
          description:
            action === "approve"
              ? `Added to Google Calendar${r.emailed ? " and the requester was emailed." : "."}`
              : undefined,
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openLetter() {
    if (!booking) return;
    setBusy("letter");
    try {
      window.open(await letterUrl(booking.id), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const b = booking;
  return (
    <Sheet open={!!b} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {b && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{b.event_title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <StatusBadge status={b.status} />
                <span>Submitted {submittedAt(b.created_at)}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4">
              {b.status === "approved" &&
                (b.calendar_event_id ? (
                  <Alert>
                    <CalendarCheck />
                    <AlertTitle>On Google Calendar</AlertTitle>
                    <AlertDescription>This booking was added to Bidyo's calendar.</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <CalendarX2 />
                    <AlertTitle>Not on Google Calendar yet</AlertTitle>
                    <AlertDescription>
                      <p>{b.calendar_sync_error ?? "The calendar event wasn't created."}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => run("sync")}
                        disabled={!!busy}
                      >
                        {busy === "sync" ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <RefreshCw />
                        )}
                        Retry sync
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              {b.status === "declined" && b.decision_reason && (
                <Alert variant="destructive">
                  <X />
                  <AlertTitle>
                    {b.auto_declined ? "Declined automatically" : "Reason for declining"}
                  </AlertTitle>
                  <AlertDescription>{b.decision_reason}</AlertDescription>
                </Alert>
              )}
              {b.status === "pending" && b.calendar_sync_error && (
                <Alert variant="destructive">
                  <CalendarX2 />
                  <AlertTitle>Date not checked</AlertTitle>
                  <AlertDescription>{b.calendar_sync_error}</AlertDescription>
                </Alert>
              )}

              <section>
                <h3 className="mb-1 text-sm font-semibold">Event</h3>
                <dl>
                  <Row label="Organization">{b.organization}</Row>
                  <Row label={b.services.length > 1 ? "Services" : "Service"}>
                    {formatServices(b)}
                  </Row>
                  <Row label={b.end_date ? "Dates" : "Date"}>{eventDates(b)}</Row>
                  <Row label="Place">{b.venue}</Row>
                  <Row label="Crew">{formatCrew(b)}</Row>
                  {b.requests && (
                    <Row label="Requests">
                      <span className="whitespace-pre-wrap">{b.requests}</span>
                    </Row>
                  )}
                </dl>
              </section>
              <Separator />
              <section>
                <h3 className="mb-1 text-sm font-semibold">Requester</h3>
                <dl>
                  <Row label="Name">{fullName(b)}</Row>
                  <Row label="Email">
                    <a href={`mailto:${b.email}`} className="underline-offset-4 hover:underline">
                      {b.email}
                    </a>
                  </Row>
                  <Row label="Mobile">
                    <a
                      href={`tel:${b.mobile.replace(/[\s-]/g, "")}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {b.mobile}
                    </a>
                  </Row>
                </dl>
                {b.letter_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={openLetter}
                    disabled={busy === "letter"}
                  >
                    {busy === "letter" ? <LoaderCircle className="animate-spin" /> : <FileText />}
                    View formal letter
                  </Button>
                )}
              </section>
              <Separator />
              <section>
                <h3 className="mb-1 text-sm font-semibold">Record</h3>
                <dl>
                  <Row label="Reference #">
                    <span className="font-mono text-xs">{b.id}</span>
                  </Row>
                  {b.decided_at && (
                    <Row label="Decided">{`${submittedAt(b.decided_at)}${b.decided_by ? ` by ${b.decided_by}` : ""}`}</Row>
                  )}
                </dl>
              </section>
            </div>

            {b.status === "pending" && (
              <SheetFooter className="flex-row gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="flex-1" disabled={!!busy}>
                      {busy === "approve" ? <LoaderCircle className="animate-spin" /> : <Check />}
                      Approve
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {b.event_title} on {eventDates(b)} will be added to Bidyo's Google Calendar,
                        and {b.first_name} will get a confirmation email.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => run("approve")}>Approve</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="flex-1" disabled={!!busy}>
                      <X />
                      Disapprove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disapprove this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {b.first_name} will get an email with your reason.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-2">
                      <Label htmlFor="decline-reason">Reason</Label>
                      <Textarea
                        id="decline-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={500}
                        placeholder="e.g. We're already covering another event that day."
                        required
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={busy === "decline"}>Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={!reason.trim() || busy === "decline"}
                        onClick={() => run("decline")}
                      >
                        {busy === "decline" && <LoaderCircle className="animate-spin" />}
                        Disapprove
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
