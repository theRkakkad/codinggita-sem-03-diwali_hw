"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IListing, ListingCategory, ListingCondition, ListingType } from "@/types";
import ListingCard from "@/components/ListingCard";
import {
  Search,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Laptop,
  Armchair,
  PenTool,
  Boxes,
  ChevronRight,
  Clock,
  ArrowRight,
  X,
  Send,
  Bot,
  Zap,
  Package,
  Repeat,
  Heart,
  Tag as TagIcon,
  LayoutGrid,
  Gift,
  MessageSquare,
  Star,
  MapPin,
  Check,
} from "lucide-react";

const SIDEBAR_CATEGORIES: {
  label: string;
  value: ListingCategory | "All";
  icon: React.ReactNode;
  count: number;
}[] = [
  { label: "All categories", value: "All", icon: <Boxes className="w-4 h-4 text-red-500" />, count: 8 },
  { label: "Electronics & Tech", value: "Electronics", icon: <Laptop className="w-4 h-4 text-blue-500" />, count: 3 },
  { label: "Books & Study Material", value: "Books", icon: <BookOpen className="w-4 h-4 text-emerald-500" />, count: 3 },
  { label: "Dorm & Furniture", value: "Furniture", icon: <Armchair className="w-4 h-4 text-amber-500" />, count: 2 },
  { label: "Stationery & Tools", value: "Stationery", icon: <PenTool className="w-4 h-4 text-purple-500" />, count: 2 },
  { label: "Other Student Gear", value: "Other", icon: <ShoppingBag className="w-4 h-4 text-rose-500" />, count: 1 },
];

const BENTO_CATEGORIES = [
  { label: "All Spotlight", value: "All", icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
  { label: "Books & Notes", value: "Books", icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> },
  { label: "Electronics & Tech", value: "Electronics", icon: <Laptop className="w-3.5 h-3.5 text-blue-500" /> },
  { label: "Dorm Furniture", value: "Furniture", icon: <Armchair className="w-3.5 h-3.5 text-amber-500" /> },
  { label: "Stationery", value: "Stationery", icon: <PenTool className="w-3.5 h-3.5 text-purple-500" /> },
  { label: "Free Giveaways", value: "Free", icon: <Zap className="w-3.5 h-3.5 text-emerald-500" /> },
];

const QUICK_TAGS = [
  "Stewart Calculus",
  "Casio FX-991EX",
  "Study Chair",
  "Lab Coat",
  "Bluetooth Keyboard",
  "Electric Kettle",
];

const FALLBACK_IMG = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80";

export default function MarketplaceHome() {
  const [listings, setListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [bentoCategory, setBentoCategory] = useState<string>("All");
  const [condition, setCondition] = useState<string>("All");
  const [type, setType] = useState<string>("All");
  const [campus, setCampus] = useState<string>("All");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<string>("newest");

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 45, seconds: 32 });

  // AI Chat Assistant modal state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "ai" | "user"; text: string }[]>([
    {
      sender: "ai",
      text: "Hello! I am your Campus AI Assistant. Looking for textbooks, calculators, or dorm gear? Ask me anything!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Countdown clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category !== "All") params.append("category", category);
      if (type && type !== "All") params.append("type", type);
      if (condition && condition !== "All") params.append("condition", condition);
      if (campus && campus !== "All") params.append("campus", campus);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (sort) params.append("sort", sort);

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setListings(data.listings);
      }
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, category, condition, type, campus, minPrice, maxPrice, sort]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMessages = [...chatMessages, { sender: "user" as const, text: userText }];
    setChatMessages(newMessages);
    setChatInput("");

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let reply = "Here's what I found for you on campus: ";

      if (lower.includes("calculus") || lower.includes("math") || lower.includes("book")) {
        reply = "We currently have 'Stewart Calculus (8th Edition)' listed by Aarav Sharma for only ₹450. Clean pages and ready for engineering coursework.";
      } else if (lower.includes("calculator") || lower.includes("casio")) {
        reply = "Priya Patel has a 'Casio FX-991EX ClassWiz' in Like New condition for ₹850. Allowed in university examinations!";
      } else if (lower.includes("chair") || lower.includes("furniture") || lower.includes("desk")) {
        reply = "Check out the Ergonomic Mesh Study Chair (₹1,400) or the Foldable Bed Desk (₹350) in North Campus.";
      } else if (lower.includes("free") || lower.includes("giveaway")) {
        reply = "Looking for free study equipment? A Chemistry Lab Coat (Size M) + Safety Goggles is available for FREE in Central Campus!";
      } else {
        reply = `I searched our campus marketplace for "${userText}". Check out our live rolling reel or Bento gallery below!`;
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 500);
  };

  const bentoListings = listings.filter((item) => {
    if (bentoCategory === "All") return true;
    if (bentoCategory === "Free") return item.type === "Free";
    return item.category === bentoCategory;
  });

  // Duplicated multiple times for infinite, non-stop horizontal rolling
  const rollingListings = [...listings, ...listings, ...listings];

  return (
    <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ================= SECTION 1: TOP 3-COLUMN HERO ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3 xl:col-span-2 hidden lg:flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-3 pt-1 pb-3">
              Shop Categories
            </h2>
            <div className="space-y-1">
              {SIDEBAR_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value);
                      setBentoCategory(cat.value === "All" ? "All" : cat.value);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-red-50 text-red-600 shadow-2xs font-black"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cat.icon}
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? "text-red-500 translate-x-0.5" : "text-gray-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Assistant Card */}
          <div className="bg-gradient-to-br from-[#6b21a8] via-[#581c87] to-[#3b0764] text-white rounded-3xl p-5 shadow-lg shadow-purple-900/20 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 text-white">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                AI Assistant
                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">2.0</span>
              </h3>
              <p className="text-xs text-purple-100/90 mt-1.5 leading-snug font-medium">
                Ask anything, get instant item matches & price recommendations.
              </p>
              <button
                onClick={() => setAiChatOpen(true)}
                className="mt-4 px-4 py-2 bg-white text-purple-900 font-black text-xs rounded-xl shadow-md hover:bg-purple-50 transition active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Chat Now
              </button>
            </div>
          </div>
        </aside>

        {/* Center Hero Search Banner */}
        <section className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2/5 hidden md:block pointer-events-none opacity-90 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=600&q=80"
              alt="Campus Tech Essentials"
              className="w-full h-full object-cover object-left"
              style={{ maskImage: "linear-gradient(to right, transparent, black 40%)" }}
            />
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-black mb-3 border border-purple-100/60">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>YOUR AI CAMPUS SHOPPING ASSISTANT</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              Find exactly what you need with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-rose-500 to-red-500 inline-flex items-center gap-1.5">
                AI search
                <Sparkles className="w-5 h-5 text-red-500 fill-red-500 inline" />
              </span>
            </h1>

            {/* Floating Search Bar */}
            <div className="mt-6 bg-white rounded-2xl p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-200/90 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2.5 flex-1 w-full px-2.5">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search here (e.g. Stewart Calculus, Casio, chair)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold text-gray-800 placeholder-gray-400 bg-transparent focus:outline-hidden"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-100 pt-2 sm:pt-0 sm:pl-3">
                <select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setBentoCategory(e.target.value === "All" ? "All" : e.target.value);
                  }}
                  className="text-xs font-bold text-gray-600 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All categories ▾</option>
                  <option value="Books">Books</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Other">Other</option>
                </select>

                <button
                  onClick={() => fetchListings()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  Search
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Popular Tags */}
            <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold text-gray-400">
              <span className="shrink-0 text-gray-500 font-extrabold">Popular:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg whitespace-nowrap transition border border-gray-100 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Top Right Quick Menu Widgets */}
        <aside className="lg:col-span-3 xl:col-span-3 flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800 group-hover:text-red-500 transition">
                    My Enquiries & Offers
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">View sent & received</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800 group-hover:text-red-500 transition">
                    Swaps & Exchanges
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">Trade study items</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition" />
            </Link>

            <Link
              href="/create"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800 group-hover:text-red-500 transition">
                    Quick Post Ad
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">List in 30 seconds</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition" />
            </Link>

            <Link
              href="/favorites"
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800 group-hover:text-red-500 transition">
                    Saved Bookmarks
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">Wishlist & alerts</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition" />
            </Link>
          </div>
        </aside>
      </div>

      {/* ================= SECTION 2: CONTINUOUS HORIZONTAL ROLLING ON A STRAIGHT SLEEPING LINE ================= */}
      {/* "make it on a stright sleeping line and make them rolling" */}
      <section className="mb-14 w-full">
        <div className="mb-3.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-900">
              Live Horizontal Rolling Reel
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-400">
            Rolling 24/7 Across All Campus Hostels • Straight Line Feed
          </span>
        </div>

        {/* Outer Viewport - clips horizontal overflow, forces single straight sleeping line */}
        <div
          className="w-full relative py-2"
          style={{
            overflow: "hidden",
            width: "100%",
          }}
        >
          {/* Inner Continuous Moving Track - guaranteed single horizontal line without wrapping */}
          <div
            className="nonstop-roll-track"
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "center",
              gap: "20px",
              width: "max-content",
            }}
          >
            {rollingListings.map((item, index) => {
              const imageSource =
                item.images && item.images.length > 0 ? item.images[0] : FALLBACK_IMG;

              return (
                <Link
                  key={`${item._id}-${index}`}
                  href={`/listings/${item._id}`}
                  style={{
                    width: "250px",
                    minWidth: "250px",
                    maxWidth: "250px",
                    height: "270px",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                  className="bg-white rounded-3xl border border-gray-100 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer"
                >
                  {/* Clean Product Image Container */}
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#f4f5f8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSource}
                      alt={item.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                    />

                    {/* Top Category Tag */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-md text-gray-800 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm border border-white/40">
                        {item.category}
                      </span>
                    </div>

                    {/* THE PHYSICAL PRICE TAG (As a real Tag Badge, not plain text) */}
                    <div className="absolute bottom-3 left-3">
                      {item.type === "Free" ? (
                        <div className="bg-emerald-600/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-white" />
                          <span className="font-black text-xs uppercase tracking-wide">FREE TAG</span>
                        </div>
                      ) : (
                        <div className="bg-gray-950/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5">
                          <TagIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-black text-xs tracking-tight text-white">
                            ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow Indicator on Bottom Right */}
                    <div className="absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md text-gray-900 flex items-center justify-center shadow-md opacity-90 group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: BENTO GALLERY WITH CATEGORY TABS ABOVE IT ================= */}
      {/* "on getting down there is the bento gallery and make sure u have the images on each and every card" */}
      <section className="mb-14">
        {/* Category Selector Tabs Above the Bento Gallery */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-gray-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="w-5 h-5 text-red-500" />
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Curated Bento Gallery
              </h2>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Featured study essentials in an editorial Bento grid with verified high-res images
            </p>
          </div>

          {/* Category Filter Pills Above Bento */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {BENTO_CATEGORIES.map((cat) => {
              const isSelected = bentoCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setBentoCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-red-500 text-white shadow-md shadow-red-500/20 font-black scale-102"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bento Gallery Grid: Guaranteed image on every single card with error fallback */}
        {bentoListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-bold">No items found in this Bento category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[250px]">
            {/* Bento Card 1: Large Featured Spotlight (2 Col, 2 Row) */}
            {bentoListings[0] && (
              <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white rounded-3xl overflow-hidden shadow-xl relative group flex flex-col justify-between p-6 sm:p-8">
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bentoListings[0].images?.[0] || FALLBACK_IMG}
                    alt={bentoListings[0].title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      <Star className="w-3 h-3 text-white fill-white" />
                      CAMPUS SPOTLIGHT
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold">
                      {bentoListings[0].category}
                    </span>
                  </div>
                  <div className="bg-white/95 backdrop-blur-md text-gray-900 px-3 py-1 rounded-xl shadow-md flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                    <span className="font-black text-xs">
                      {bentoListings[0].type === "Free"
                        ? "FREE"
                        : `₹${bentoListings[0].price.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 max-w-lg">
                  <h3 className="text-xl sm:text-3xl font-black tracking-tight leading-snug group-hover:text-red-400 transition">
                    {bentoListings[0].title}
                  </h3>
                  <p className="text-xs text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                    {bentoListings[0].description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-white/10">
                    <span className="text-xs text-gray-300 font-bold inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {bentoListings[0].campus} • Verified Student
                    </span>

                    <Link
                      href={`/listings/${bentoListings[0]._id}`}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-104 active:scale-96 flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      View Details & Enquire
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Bento Card 2: Tall Vertical Showcase (1 Col, 2 Row) */}
            {bentoListings[1] && (
              <div className="md:col-span-1 md:row-span-2 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between p-4 group hover:shadow-xl transition-all duration-300">
                <div>
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-gray-50 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bentoListings[1].images?.[0] || FALLBACK_IMG}
                      alt={bentoListings[1].title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                    />
                    <div className="absolute bottom-2 left-2 bg-gray-900/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-sm flex items-center gap-1">
                      <TagIcon className="w-3 h-3 text-amber-400" />
                      ₹{bentoListings[1].price}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      {bentoListings[1].category}
                    </span>
                    <span className="text-gray-400 font-bold">{bentoListings[1].condition}</span>
                  </div>

                  <h4 className="font-black text-sm text-gray-900 group-hover:text-red-600 transition line-clamp-2 mt-1">
                    {bentoListings[1].title}
                  </h4>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                    {bentoListings[1].description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {bentoListings[1].campus}
                  </span>
                  <Link
                    href={`/listings/${bentoListings[1]._id}`}
                    className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-xs transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Bento Card 3: Free Giveaway Banner with Image (1 Col, 1 Row) */}
            {bentoListings[2] && (
              <div className="md:col-span-1 md:row-span-1 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-3 flex items-center gap-3 group hover:shadow-lg transition-all overflow-hidden relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bentoListings[2].images?.[0] || FALLBACK_IMG}
                    alt={bentoListings[2].title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                    <Gift className="w-3 h-3" />
                    {bentoListings[2].type === "Free" ? "FREE TAG" : `₹${bentoListings[2].price}`}
                  </div>
                  <h4 className="font-black text-xs text-gray-900 truncate mt-1 group-hover:text-red-600 transition">
                    {bentoListings[2].title}
                  </h4>
                  <Link
                    href={`/listings/${bentoListings[2]._id}`}
                    className="text-[11px] font-bold text-red-600 hover:underline block mt-1"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            )}

            {/* Bento Card 4: Quick Gadget with High-Res Image (1 Col, 1 Row) */}
            {bentoListings[3] && (
              <div className="md:col-span-1 md:row-span-1 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-3 flex items-center gap-3 group hover:shadow-lg transition-all overflow-hidden relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bentoListings[3].images?.[0] || FALLBACK_IMG}
                    alt={bentoListings[3].title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 bg-gray-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                    <TagIcon className="w-3 h-3 text-amber-400" />
                    ₹{bentoListings[3].price}
                  </div>
                  <h4 className="font-black text-xs text-gray-900 truncate mt-1 group-hover:text-red-600 transition">
                    {bentoListings[3].title}
                  </h4>
                  <Link
                    href={`/listings/${bentoListings[3]._id}`}
                    className="text-[11px] font-bold text-red-600 hover:underline block mt-1"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================= SECTION 4: ALL AVAILABLE MARKETPLACE LISTINGS & APP PROMO ================= */}
      <section className="mb-12">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Main 9-Col Grid */}
          <div className="xl:col-span-9">
            <div className="flex items-center justify-between mb-5 border-b border-gray-200/70 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  All Available Listings
                </h2>
                <span className="text-xs text-gray-400 font-bold">
                  {listings.length} verified listings ready for campus pickup
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl border border-gray-100 p-4 aspect-3/4 animate-pulse"
                  >
                    <div className="bg-gray-100 h-36 rounded-2xl mb-3" />
                    <div className="bg-gray-100 h-4 w-3/4 rounded mb-2" />
                    <div className="bg-gray-100 h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : listings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((item) => (
                  <ListingCard key={item._id} listing={item} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-900">No items found</h3>
                <p className="text-xs text-gray-400 mt-1">Try another search or clear filters.</p>
              </div>
            )}
          </div>

          {/* Right Column: "Download our app" Promo Card (Self-start & Sticky so it never stretches vertically) */}
          <div className="xl:col-span-3 self-start sticky top-24 h-fit bg-gradient-to-b from-[#fff3ef] via-[#feece5] to-[#fde5dc] rounded-3xl p-6 border border-orange-200/60 shadow-[0_4px_20px_rgba(251,146,60,0.08)] relative overflow-hidden">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-white px-2.5 py-1 rounded-lg shadow-2xs border border-orange-100">
                CAMPUS MOBILE
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-3 tracking-tight">
                Download our app
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed font-medium">
                Get exclusive student offers & fast on-campus handovers.
              </p>
            </div>

            {/* Mobile App Phone Graphic */}
            <div className="my-5 bg-white rounded-3xl p-4 shadow-md border border-orange-100/90 max-w-[220px] mx-auto text-center">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2.5" />
              <div className="text-[11px] font-black text-gray-900">VidyaBazaar Go</div>
              <div className="my-2.5 bg-gray-50 rounded-2xl p-2.5 border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80"
                  alt="App Preview"
                  className="w-16 h-16 object-cover mx-auto rounded-xl"
                />
                <div className="text-[10px] font-black text-gray-800 mt-2">Calculus (8th Ed)</div>
                <div className="text-[11px] text-red-500 font-black">₹450</div>
              </div>
              <div className="w-full py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-[10px] font-black shadow-xs">
                Fast Handover
              </div>
            </div>

            {/* Student Feature Highlights */}
            <div className="space-y-1.5 mb-5 text-[11px] font-semibold text-gray-700 bg-white/70 backdrop-blur-xs p-3 rounded-2xl border border-orange-100/60">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
                <span>Direct WhatsApp & campus chat</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
                <span>Price drop alerts on textbooks</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
                <span>100% free student exchange</span>
              </div>
            </div>

            <Link
              href="/create"
              className="w-full block text-center py-3 px-4 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition active:scale-95"
            >
              Scan or Post Listing →
            </Link>
          </div>
        </div>
      </section>

      {/* ================= SECTION 5: "BEST DEALS OF THE DAY" & BANNER ================= */}
      <section className="mb-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-8 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Best deals of the day
                </h2>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-black border border-red-100 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>
                    Ends in {String(timeLeft.hours).padStart(2, "0")} :{" "}
                    {String(timeLeft.minutes).padStart(2, "0")} :{" "}
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                View all deals
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {listings.slice(0, 3).map((deal, idx) => (
                <div
                  key={deal._id}
                  className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="relative aspect-4/3 rounded-2xl bg-gray-50 overflow-hidden mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deal.images?.[0] || FALLBACK_IMG}
                      alt={deal.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                      {idx === 0 ? "-20%" : idx === 1 ? "-35%" : "DEAL"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-gray-900 line-clamp-1 group-hover:text-red-600 transition">
                      {deal.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{deal.campus}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-black text-gray-900">
                        {deal.type === "Free" ? "FREE" : `₹${deal.price.toLocaleString("en-IN")}`}
                      </span>
                      <Link
                        href={`/listings/${deal._id}`}
                        className="text-[11px] font-extrabold text-red-600 hover:underline"
                      >
                        Grab Deal →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-[-20px] bottom-[-20px] w-48 h-48 opacity-30 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80"
                alt="Watch Deal"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="relative z-10">
              <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md text-[10px] font-black rounded-lg uppercase tracking-wider mb-3">
                LIMITED TIME DEAL
              </span>
              <h3 className="text-2xl font-black tracking-tight leading-snug">
                Up to 50% off on semester electronics & calculators
              </h3>
              <p className="text-xs text-indigo-100/90 mt-1.5 max-w-xs font-medium">
                Verified student handovers before final exam week.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <button
                onClick={() => {
                  setCategory("Electronics");
                  setBentoCategory("Electronics");
                  window.scrollTo({ top: 400, behavior: "smooth" });
                }}
                className="px-5 py-2.5 bg-white text-indigo-950 hover:bg-gray-100 font-black text-xs rounded-xl shadow-lg transition active:scale-95"
              >
                Shop Electronics
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Chat Modal */}
      {aiChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full h-[520px] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-gradient-to-r from-[#6b21a8] via-[#581c87] to-[#3b0764] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-black">Campus AI Assistant</h4>
                  <p className="text-[10px] text-purple-200">Online • Ready to recommend study gear</p>
                </div>
              </div>
              <button
                onClick={() => setAiChatOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fbfbfe]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-red-500 text-white font-medium shadow-xs"
                        : "bg-white text-gray-800 border border-gray-100 shadow-2xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask e.g. What calculus books are available?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
              />
              <button
                type="submit"
                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
