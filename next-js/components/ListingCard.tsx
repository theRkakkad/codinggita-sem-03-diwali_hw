"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IListing } from "@/types";
import { useApp } from "@/context/AppContext";
import { Heart, Star, MapPin, MessageSquare, ArrowRight } from "lucide-react";

interface ListingCardProps {
  listing: IListing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { isFavorite, toggleFavorite } = useApp();
  const favorited = isFavorite(listing._id);
  const [imgError, setImgError] = useState(false);

  // Consistent rating
  const getRating = () => {
    let hash = 0;
    for (let i = 0; i < listing.title.length; i++) {
      hash = (hash << 5) - hash + listing.title.charCodeAt(i);
    }
    const score = (4.6 + (Math.abs(hash) % 5) * 0.08).toFixed(1);
    const reviews = 14 + (Math.abs(hash) % 80);
    return { score, reviews };
  };

  const { score, reviews } = getRating();

  const getStatusBadge = () => {
    if (listing.status === "Sold") {
      return (
        <span className="bg-gray-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
          Sold
        </span>
      );
    }
    if (listing.status === "Reserved") {
      return (
        <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
          Reserved
        </span>
      );
    }
    return null;
  };

  const imageSrc =
    !imgError && listing.images && listing.images.length > 0
      ? listing.images[0]
      : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80";

  const originalPrice =
    listing.price > 0 ? Math.round(listing.price * 1.5) : null;

  return (
    <div className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
      <div>
        {/* Product Image Stage */}
        <div className="relative aspect-4/3 w-full bg-[#f8f9fa] overflow-hidden flex items-center justify-center p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={listing.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-2xl group-hover:scale-106 transition-transform duration-500 ease-out"
          />

          {/* Badges on Top Left */}
          <div className="absolute top-3.5 left-3.5 flex flex-col gap-1 items-start">
            {getStatusBadge()}
            {listing.type === "Free" ? (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm">
                FREE
              </span>
            ) : listing.type === "Exchange" ? (
              <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm">
                EXCHANGE
              </span>
            ) : originalPrice ? (
              <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm">
                SAVE 35%
              </span>
            ) : null}
          </div>

          {/* Top Right Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(listing._id);
            }}
            aria-label={favorited ? "Remove bookmark" : "Bookmark item"}
            className="absolute top-3.5 right-3.5 w-8.5 h-8.5 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-all hover:scale-110 active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorited ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </button>
        </div>

        {/* Content Body with Clear Spacing */}
        <div className="p-4 sm:p-5">
          {/* Category Tag & Condition */}
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="font-extrabold text-red-600 bg-red-50/90 px-2.5 py-0.5 rounded-lg border border-red-100/60 tracking-tight">
              {listing.category}
            </span>
            <span className="text-gray-400 font-semibold">{listing.condition}</span>
          </div>

          {/* Product Title */}
          <Link href={`/listings/${listing._id}`} className="block">
            <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-red-600 transition-colors tracking-tight">
              {listing.title}
            </h3>
          </Link>

          {/* Subtitle / Short Description */}
          <p className="text-xs text-gray-400 line-clamp-1 mt-1 font-normal leading-relaxed">
            {listing.description}
          </p>

          {/* Star Rating & Campus */}
          <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-gray-100/80 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-gray-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{score}</span>
              <span className="text-gray-300 font-normal">({reviews})</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate max-w-[130px]">
              <MapPin className="w-3 h-3 text-red-400 shrink-0" />
              <span className="truncate font-medium">{listing.campus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Price & Action Button */}
      <div className="px-5 py-3.5 bg-[#fafbfc] border-t border-gray-100/80 flex items-center justify-between">
        <div>
          {listing.type === "Free" ? (
            <span className="text-lg font-black text-emerald-600 tracking-tight">FREE</span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-gray-950 tracking-tight">
                ₹{listing.price.toLocaleString("en-IN")}
              </span>
              {originalPrice && (
                <span className="text-xs text-gray-400 line-through font-normal">
                  ₹{originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link
          href={`/listings/${listing._id}`}
          className="w-8.5 h-8.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-500/25 group-hover:scale-108 active:scale-92 transition-all"
          title="View Details & Enquire"
        >
          <MessageSquare className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
