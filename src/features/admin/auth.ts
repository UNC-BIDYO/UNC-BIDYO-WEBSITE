import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

/* Supabase Auth for the admin panel only (this module is never part of the public site). The
   publishable key is public by design; data access goes through /api/admin/*, which checks the
   session and the admin list on the server. */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && key ? createClient(url, key, { auth: { storageKey: "bidyo-admin-auth" } }) : null;

export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

/* While signIn() checks the admin list, the new session must not open the dashboard yet:
   the login screen stays up (keeping its error message if the account isn't an admin). */
let verifying = false;
const verifyListeners = new Set<() => void>();
const setVerifying = (v: boolean) => {
  verifying = v;
  verifyListeners.forEach((notify) => notify());
};
const subscribeVerifying = (notify: () => void) => {
  verifyListeners.add(notify);
  return () => verifyListeners.delete(notify);
};

export function useSession(): SessionState {
  const state = useRawSession();
  const isVerifying = useSyncExternalStore(subscribeVerifying, () => verifying);
  return isVerifying && state.status === "signed-in" ? { status: "signed-out" } : state;
}

function useRawSession(): SessionState {
  // Without Supabase settings there is no session to wait for.
  const [state, setState] = useState<SessionState>(() =>
    supabase ? { status: "loading" } : { status: "signed-out" },
  );
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) =>
        setState(
          data.session ? { status: "signed-in", session: data.session } : { status: "signed-out" },
        ),
      );
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState(session ? { status: "signed-in", session } : { status: "signed-out" }),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Calls an admin endpoint with the current session; signs out when the session is rejected. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 401) await supabase?.auth.signOut();
    throw new ApiError(body.error ?? `Request failed (${res.status}).`, res.status);
  }
  return body as T;
}

/** Signs in, then confirms the account is on the admin list (signing out again if not). */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return "The admin panel isn't configured yet.";
  setVerifying(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return /invalid login/i.test(error.message) ? "Wrong email or password." : error.message;
    }
    try {
      await api("/api/admin/settings");
      return null;
    } catch (e) {
      await supabase.auth.signOut();
      return e instanceof ApiError && e.status === 403
        ? "This account isn't an admin."
        : (e as Error).message;
    }
  } finally {
    setVerifying(false);
  }
}

export const signOut = () => supabase?.auth.signOut();
