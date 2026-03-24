import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Attestara -- Cryptographic Trust for AI Agents",
  description:
    "Verifiable credentials, zero-knowledge proofs, and on-chain commitments for autonomous AI agent negotiations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-navy-900 text-navy-100 font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
