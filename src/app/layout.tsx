import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAT - Collection Agent Trainer",
  description:
    "AI-powered training platform for collection agents to practice realistic debt collection conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </AppProviders>
      </body>
    </html>
  );
}
