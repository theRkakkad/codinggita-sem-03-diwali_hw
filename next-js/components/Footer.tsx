import React from "react";
import Link from "next/link";
import { Sparkles, GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16 py-10 text-xs text-gray-500">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-gray-900 text-sm">
                Vidya<span className="text-red-500">Bazaar</span>
              </span>
              <p className="text-[11px] text-gray-400">
                विद्या बाज़ार • Verified student-to-student second-hand marketplace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-bold text-gray-600">
            <Link href="/" className="hover:text-red-500 transition">
              Marketplace
            </Link>
            <Link href="/create" className="hover:text-red-500 transition">
              Post Free Ad
            </Link>
            <Link href="/favorites" className="hover:text-red-500 transition">
              Saved Items
            </Link>
            <Link href="/dashboard" className="hover:text-red-500 transition">
              Student Dashboard
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-400 text-[11px]">
          <p>© 2026 VidyaBazaar. Built with Next.js 16, TypeScript, Tailwind CSS & MongoDB.</p>
          <div className="flex items-center gap-1.5">
            <span>Crafted for Diwali Homework Assignment</span>
            <Sparkles className="w-3 h-3 text-red-500 fill-red-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}
