import type { Metadata } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display font - used for big headings (scoreboard feel)
const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// Body font - used for normal text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

// Mono font - used for numbers/stats (reps, sets, streaks)
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PulseFit - AI Training Log",
  description: "Your AI-powered gym companion",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#FF4B3E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${bebas.variable} ${inter.variable} ${mono.variable} font-body`}
      >
        {children}
      </body>
    </html>
  );
}
