/** Trimmed environment variable, "" when unset. */
export const env = (key: string) => process.env[key]?.trim() ?? "";

/** For logs: whether a variable is missing, empty or set. Never returns the value. */
export const envState = (name: string) =>
  !(name in process.env) ? "missing" : env(name) ? "set" : "present but empty";

/** Public site address, used for links and images in emails. */
export const siteUrl = () => (env("SITE_URL") || "https://uncbidyo.org").replace(/\/+$/, "");
