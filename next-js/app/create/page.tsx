"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ListingCategory, ListingCondition, ListingType } from "@/types";
import {
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  MapPin,
  FileText,
  Lock,
} from "lucide-react";
import Link from "next/link";

const PRESET_IMAGES = [
  { label: "Textbook", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80" },
  { label: "Calculator", url: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80" },
  { label: "Study Chair", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80" },
  { label: "Keyboard", url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80" },
  { label: "Stationery", url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80" },
  { label: "Lab Coat", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80" },
  { label: "Desk Stand", url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80" },
  { label: "Electric Kettle", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80" },
];

export default function CreateListingPage() {
  const router = useRouter();
  const { currentUser, isSeller, switchToSeller } = useApp();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ListingCategory>("Books");
  const [condition, setCondition] = useState<ListingCondition>("Good");
  const [type, setType] = useState<ListingType>("For Sale");
  const [campus, setCampus] = useState(currentUser.campus || "North Campus");
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestingCategory, setAiSuggestingCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSuggestCategory = async () => {
    if (!title) {
      alert("Please enter a title first!");
      return;
    }
    try {
      setAiSuggestingCategory(true);
      const res = await fetch("/api/ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest-category", title }),
      });
      const data = await res.json();
      if (data.success && data.suggestedCategory) {
        setCategory(data.suggestedCategory as ListingCategory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiSuggestingCategory(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!title) {
      alert("Please enter a title first!");
      return;
    }
    try {
      setAiGenerating(true);
      const res = await fetch("/api/ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-description",
          title,
          category,
          condition,
        }),
      });
      const data = await res.json();
      if (data.success && data.generatedDescription) {
        setDescription(data.generatedDescription);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please provide an item title.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide an item description.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: type === "Free" ? 0 : Number(price) || 0,
          category,
          condition,
          type,
          status: "Available",
          campus,
          images: [imageUrl],
          seller: currentUser,
        }),
      });

      const data = await res.json();
      if (data.success && data.listing) {
        router.push(`/listings/${data.listing._id}`);
      } else {
        setError(data.error || "Failed to create listing.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      {!isSeller ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/50 shadow-sm">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">
            Seller Account Required
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed mb-6">
            You are currently signed in as <span className="font-bold text-gray-800">{currentUser.name} (Buyer)</span>. Only registered student sellers can publish listings on VidyaBazaar.
          </p>

          <div className="space-y-3">
            <button
              onClick={switchToSeller}
              className="w-full py-3 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-500/25 transition active:scale-98"
            >
              Switch to Seller Account (Aarav Sharma)
            </button>
            <Link
              href="/"
              className="block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 sm:p-8">
        <div className="border-b border-gray-100 pb-5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-500 mb-1">
            <Tag className="w-3.5 h-3.5" />
            Post Student Ad
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            List an Item for Fellow Students
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Posting as <span className="font-bold text-gray-800">{currentUser.name}</span> ({currentUser.email}) • {currentUser.campus}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title with AI Category Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">
                Item Title <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestCategory}
                disabled={aiSuggestingCategory}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg transition"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                {aiSuggestingCategory ? "Detecting..." : "AI Suggest Category"}
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Stewart Calculus (8th Ed) or Casio fx-991EX Scientific Calculator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          {/* Category & Listing Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Books">Books & Notes</option>
                <option value="Electronics">Electronics & Gadgets</option>
                <option value="Furniture">Dorm & Furniture</option>
                <option value="Stationery">Stationery & Tools</option>
                <option value="Other">Other Items</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Listing Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ListingType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="For Sale">For Sale (Priced)</option>
                <option value="Free">Free (Giving Away to Junior)</option>
                <option value="Exchange">Exchange (Item Trade)</option>
              </select>
            </div>
          </div>

          {/* Condition & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Item Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Brand New">Brand New (Unopened/Unused)</option>
                <option value="Like New">Like New (Mint condition)</option>
                <option value="Good">Good (Normal student wear)</option>
                <option value="Fair">Fair (Noticeable wear, fully working)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Price (₹) {type === "Free" && <span className="text-emerald-600 font-normal">(Free)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={type === "Free"}
                  placeholder={type === "Free" ? "0" : "e.g. 450"}
                  value={type === "Free" ? "0" : price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Campus Location */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Pickup Campus / Dorm Location <span className="text-red-500">*</span>
            </label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            >
              <option value="North Campus">North Campus (Hostels 1-4 & Science Block)</option>
              <option value="South Campus">South Campus (Engineering Quad)</option>
              <option value="Central Campus">Central Campus (Library & Student Center)</option>
              <option value="East Campus">East Campus (Design & Architecture)</option>
            </select>
          </div>

          {/* Description with AI Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={aiGenerating}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                {aiGenerating ? "Generating..." : "AI Generate Description"}
              </button>
            </div>
            <textarea
              required
              rows={4}
              placeholder="Describe condition, year purchased, included accessories, and convenient handover location..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          {/* Image Presets Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Item Image (Image URL or Pick a Student Preset)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden mb-2"
            />

            <div className="text-[11px] font-bold text-gray-400 mb-2">Student presets:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_IMAGES.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => setImageUrl(preset.url)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold text-left truncate transition ${
                    imageUrl === preset.url
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {imageUrl && (
              <div className="mt-3 w-32 h-24 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Publishing Ad..." : "Publish Student Ad"}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
