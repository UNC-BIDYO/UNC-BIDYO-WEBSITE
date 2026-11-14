import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Label } from "@/shared/ui/primitives/label";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { Switch } from "@/shared/ui/primitives/switch";
import { api } from "../auth";

export function SettingsPage() {
  const [overlapCheck, setOverlapCheck] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ overlapCheck: boolean }>("/api/admin/settings")
      .then((r) => setOverlapCheck(r.overlapCheck))
      .catch((e: Error) => toast.error(e.message));
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setOverlapCheck(next);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ overlapCheck: next }),
      });
      toast.success(next ? "Automatic date check is on" : "Automatic date check is off");
    } catch (e) {
      setOverlapCheck(!next);
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking conflicts</CardTitle>
          <CardDescription>Handle requests for days Bidyo is already booked</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="grid gap-1">
              <Label htmlFor="overlap-check">Automatically decline clashing bookings</Label>
              <p className="text-sm text-muted-foreground">
                New requests on a day that already has an event in Bidyo's Google Calendar are
                declined right away, and the requester is asked to pick another date.
              </p>
            </div>
            {overlapCheck === null ? (
              <Skeleton className="h-5 w-9 rounded-full" />
            ) : (
              <Switch
                id="overlap-check"
                checked={overlapCheck}
                onCheckedChange={toggle}
                disabled={saving}
              />
            )}
          </div>
          <Alert>
            <Info />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                <li>When on, booked days also can't be picked in the website's date picker.</li>
                <li>
                  New requests are checked right away; the date picker catches up within about 15
                  minutes.
                </li>
                <li>Any event in the calendar counts, except ones marked &ldquo;Free&rdquo;.</li>
                <li>When off, every request comes in as pending for you to review.</li>
                <li>
                  If Google Calendar can't be checked, the request stays pending and is flagged.
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
