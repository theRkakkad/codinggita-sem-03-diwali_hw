"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { IListing } from "@/types";
import ListingCard from "@/components/ListingCard";
import { Heart, Trash2, ArrowLeft, ShoppingBag, AlertTriangle } from "lucide-react";

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useApp();
  const [favoriteListings, setFavoriteListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteItems = async () => {
      if (favorites.length === 0) {
        setFavoriteListings([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch("/api/listings?status=All");
        const data = await res.json();
        if (data.success && data.listings) {
          const matched = data.listings.filter((item: IListing) =>
            favorites.includes(item._id)
          );
          setFavoriteListings(matched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavoriteItems();
  }, [favorites]);

  const clearAllFavorites = () => {
    if (confirm("Clear all items from your saved list?")) {
      favorites.forEach((id) => toggleFavorite(id));
    }
  };

  const unavailableCount = favoriteListings.filter((i) => i.status !== "Available").length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Saved Items</h1>
            <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {favorites.length}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Items you have bookmarked to check back on or purchase later.
          </p>
        </div>

        {favorites.length > 0 && (
          <button
            onClick={clearAllFavorites}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {unavailableCount > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{unavailableCount}</strong> of your saved items are now marked as Sold or Reserved by the seller.
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading saved items...</div>
      ) : favoriteListings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No saved items yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Browse through textbook and gadget ads in the marketplace and click the heart icon on any card to save it here!
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteListings.map((item) => (
            <ListingCard key={item._id} listing={item} />
          ))}
        </div>
      )}
    </div>
  );
}
