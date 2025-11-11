import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
  const isProd = baseDomain.includes("hintboard.app");

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "hintboard-app",
        },
      },
      realtime: {
        timeout: 20000,
      },
      cookieOptions: {
        domain: isProd ? ".hintboard.app" : ".lvh.me",
        path: "/",
        sameSite: "lax",
        secure: isProd,
      },
    },
  );
}
