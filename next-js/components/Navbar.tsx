"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, DEMO_USERS } from "@/context/AppContext";
import {
  ShoppingBag,
  Heart,
  PlusCircle,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, setCurrentUser, favorites, isSeller } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-17">
          {/* Brand Logo with modern emblem */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/25 group-hover:scale-105 transition-all duration-300">
              <GraduationCap className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-gray-900 tracking-tight font-sans">
                  Vidya<span className="text-red-500">Bazaar</span>
                </span>
                <span className="text-[10px] font-extrabold bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 py-0.5 rounded-full shadow-2xs tracking-wide">
                  AI MARKET
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium hidden sm:block">
                विद्या बाज़ार • Student Exchange & Marketplace
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50/70 p-1.5 rounded-2xl border border-gray-100/80">
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl transition-all ${
                pathname === "/"
                  ? "bg-white text-gray-900 shadow-2xs font-black"
                  : "hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              Browse
            </Link>

            {/* Only Sellers see "Sell an Item" in desktop navigation */}
            {isSeller && (
              <Link
                href="/create"
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  pathname === "/create"
                    ? "bg-white text-red-600 shadow-2xs font-black"
                    : "hover:text-gray-900 hover:bg-gray-100/60"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-red-500" />
                Sell an Item
              </Link>
            )}

            <Link
              href="/favorites"
              className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all relative ${
                pathname === "/favorites"
                  ? "bg-white text-red-600 shadow-2xs font-black"
                  : "hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Saved
              {favorites.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                pathname === "/dashboard"
                  ? "bg-white text-purple-600 shadow-2xs font-black"
                  : "hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-purple-600" />
              Dashboard
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* User Switcher Pill (Seller vs Buyer) */}
            <div className="flex items-center bg-white rounded-xl p-1 text-xs border border-gray-200/80 shadow-2xs">
              <div
                className={`w-6 h-6 rounded-lg text-white font-black text-[11px] flex items-center justify-center shrink-0 ${
                  isSeller
                    ? "bg-gradient-to-tr from-red-600 to-rose-500"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-500"
                }`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <select
                aria-label="Active student account"
                value={currentUser.id}
                onChange={(e) => {
                  const selected = DEMO_USERS.find((u) => u.id === e.target.value);
                  if (selected) setCurrentUser(selected);
                }}
                className="bg-transparent border-0 pl-1.5 pr-2 py-0.5 font-bold text-gray-800 focus:outline-hidden cursor-pointer text-xs"
              >
                {DEMO_USERS.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === "seller" ? "Seller" : "Buyer"})
                  </option>
                ))}
              </select>
            </div>

            {/* Post Ad Button - ONLY visible for Seller */}
            {isSeller && (
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:to-rose-700 rounded-xl shadow-md shadow-red-500/25 transition-all hover:scale-102 active:scale-98"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Post Ad
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-gray-100 py-2.5 bg-white text-[11px] font-bold text-gray-600">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 ${pathname === "/" ? "text-red-500 font-black" : ""}`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Browse</span>
        </Link>

        {/* Sell option ONLY in Seller account on mobile */}
        {isSeller && (
          <Link
            href="/create"
            className={`flex flex-col items-center gap-0.5 ${pathname === "/create" ? "text-red-500 font-black" : ""}`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Sell</span>
          </Link>
        )}

        <Link
          href="/favorites"
          className={`flex flex-col items-center gap-0.5 relative ${pathname === "/favorites" ? "text-red-500 font-black" : ""}`}
        >
          <Heart className="w-4 h-4" />
          <span>Saved</span>
          {favorites.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1 rounded-full font-black">
              {favorites.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 ${pathname === "/dashboard" ? "text-red-500 font-black" : ""}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>
    </header>
  );
}
