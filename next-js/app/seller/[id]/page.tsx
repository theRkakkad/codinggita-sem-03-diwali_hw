"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { IListing, SellerInfo } from "@/types";
import ListingCard from "@/components/ListingCard";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Calendar,
  Package,
} from "lucide-react";

export default function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listings?sellerId=${id}&status=All`);
        const data = await res.json();
        if (data.success && data.listings) {
          setListings(data.listings);
          if (data.listings.length > 0) {
            setSeller(data.listings[0].seller);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-gray-400 font-bold">
        Loading seller profile...
      </div>
    );
  }

  const activeListings = listings.filter((l) => l.status === "Available");
  const reservedListings = listings.filter((l) => l.status === "Reserved");
  const soldListings = listings.filter((l) => l.status === "Sold");

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-red-500 to-rose-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md shadow-red-500/20">
              {seller ? seller.name.charAt(0) : "S"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {seller ? seller.name : "Student Seller"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Student
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {seller ? seller.campus : "Campus"}
              </p>
              {seller?.bio && (
                <p className="text-xs text-gray-500 mt-2 max-w-xl italic">
                  &quot;{seller.bio}&quot;
                </p>
              )}
            </div>
          </div>

          {seller && (
            <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto text-xs">
              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call: {seller.phone}
                </a>
              )}
              {seller.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Seller
                </a>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-5 mt-6 text-center">
          <div className="bg-[#fbfbfe] p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 block">Active Listings</span>
            <span className="text-xl font-black text-red-500">{activeListings.length}</span>
          </div>
          <div className="bg-[#fbfbfe] p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 block">Reserved</span>
            <span className="text-xl font-black text-amber-500">{reservedListings.length}</span>
          </div>
          <div className="bg-[#fbfbfe] p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 block">Sold History</span>
            <span className="text-xl font-black text-emerald-500">{soldListings.length}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-red-500" />
          All Listings from {seller?.name || "Seller"} ({listings.length})
        </h2>

        {listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-xs text-gray-400">
            This seller has no active listings currently.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((item) => (
              <ListingCard key={item._id} listing={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
