import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Progressive Races 2026",
  description: "Track the fight for the House and the progressive candidates in it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 pb-12">{children}</main>
      </body>
    </html>
  );
}
