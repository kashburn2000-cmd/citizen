import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Progressive Races 2026",
  description: "Track the fight for the House and the progressive candidates in it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout, loads once for every page */}
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <SupabaseProvider config={supabaseEnv()}>
          <Nav />
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pb-16">{children}</main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
