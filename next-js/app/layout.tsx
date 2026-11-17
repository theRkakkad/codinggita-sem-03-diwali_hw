import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "VidyaBazaar (विद्या बाज़ार) | Student Second-Hand Marketplace",
  description:
    "Student-focused second-hand marketplace to buy, sell, or exchange textbooks, electronics, calculators, stationery, and furniture on campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <AppProvider>
          <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1">
            <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading...</div>}>
              {children}
            </Suspense>
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
