"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
  const isProd = baseDomain.includes("hintboard.app");

  return createServerClient(
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
          "X-Client-Info": "hintboard-server",
        },
      },
      realtime: {
        timeout: 20000,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                domain: isProd ? ".hintboard.app" : ".lvh.me",
                path: "/",
                sameSite: "lax",
                secure: isProd,
              });
            });
          } catch {
            // Ignore errors when setAll is called in Server Components
          }
        },
      },
    },
  );
}
