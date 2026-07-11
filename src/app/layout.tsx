import type { Metadata } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AV Fitness Gym - Goa, Camarines Sur",
  description: "AV Fitness Gym's AI-powered training companion",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#FF6F00",
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
