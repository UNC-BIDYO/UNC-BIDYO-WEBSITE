import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import logo from "@/shared/assets/brand/bidyo-logo-color.png";
import { Alert, AlertDescription } from "@/shared/ui/primitives/alert";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/primitives/field";
import { Input } from "@/shared/ui/primitives/input";
import { signIn, supabase } from "../auth";

/* Adapted from the shadcn/ui "login-03" block: centred card on a muted background. */
export function LoginPage() {
  const [error, setError] = useState<string | null>(
    supabase
      ? null
      : "The admin panel isn't configured yet (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(await signIn(String(data.get("email")), String(data.get("password"))));
    setPending(false);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <img src={logo} alt="UNC Bidyo" className="h-8 w-auto" />
          <span className="sr-only">Back to the website</span>
        </a>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin sign in</CardTitle>
            <CardDescription>Review and manage booking requests</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="username" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={pending || !supabase}>
                    {pending && <LoaderCircle className="animate-spin" />}
                    {pending ? "Signing in…" : "Sign in"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
