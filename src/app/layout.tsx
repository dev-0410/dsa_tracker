import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import { ThemeProvider } from "@/components/theme-provider";
import { metadataBaseUrl } from "@/lib/environment";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: "Invariant — Practice with intent",
    template: "%s · Invariant",
  },
  description:
    "An adaptive DSA practice system that turns mastery, goals, and review timing into an explainable daily problem queue.",
  applicationName: "Invariant",
  keywords: [
    "data structures and algorithms",
    "DSA practice",
    "coding interviews",
    "adaptive learning",
    "spaced repetition",
  ],
  authors: [{ name: "Invariant" }],
  openGraph: {
    type: "website",
    title: "Invariant — Know exactly what to solve next",
    description:
      "Adaptive, explainable DSA practice built around your goals and mastery.",
    siteName: "Invariant",
    images: [
      {
        url: "/invariant-og.png",
        width: 1200,
        height: 630,
        alt: "An abstract algorithm practice path rising through graph and mastery signals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Invariant — Practice with intent",
    description: "Know exactly what to solve next, and why.",
    images: ["/invariant-og.png"],
  },
  category: "education",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0D120F" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!border-line !bg-surface !text-ink !shadow-card",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
