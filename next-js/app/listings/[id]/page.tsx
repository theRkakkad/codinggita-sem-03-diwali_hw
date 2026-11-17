"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IListing } from "@/types";
import { useApp } from "@/context/AppContext";
import ListingCard from "@/components/ListingCard";
import QRCodeModal from "@/components/QRCodeModal";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Send,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  ShieldCheck,
  Tag,
  Star,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { currentUser, isFavorite, toggleFavorite } = useApp();

  const [listing, setListing] = useState<IListing | null>(null);
  const [similar, setSimilar] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // QR Modal
  const [qrOpen, setQrOpen] = useState(false);

  // Enquiry Form State
  const [buyerName, setBuyerName] = useState(currentUser.name || "");
  const [buyerEmail, setBuyerEmail] = useState(currentUser.email || "");
  const [buyerPhone, setBuyerPhone] = useState(currentUser.phone || "");
  const [message, setMessage] = useState("Hi! Is this item still available? Can we coordinate on campus?");
  const [offerPrice, setOfferPrice] = useState("");
  const [enquirySending, setEnquirySending] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");

  // Status update state for seller
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/listings/${id}`);
      const data = await res.json();
      if (data.success && data.listing) {
        setListing(data.listing);
        setSimilar(data.similar || []);
      } else {
        setError(data.error || "Listing not found");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleStatusChange = async (newStatus: "Available" | "Reserved" | "Sold") => {
    if (!listing) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setListing(data.listing);
      }
    } catch (err) {
      alert("Error updating status: " + (err as Error).message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteListing = async () => {
    if (confirm("Are you sure you want to permanently delete this listing?")) {
      try {
        const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          router.push("/dashboard");
        }
      } catch (err) {
        alert("Delete failed: " + (err as Error).message);
      }
    }
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    try {
      setEnquirySending(true);
      setEnquiryError("");
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing._id,
          buyerName,
          buyerEmail,
          buyerPhone,
          message,
          offerPrice: offerPrice ? Number(offerPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEnquirySuccess(true);
        setMessage("");
        setOfferPrice("");
      } else {
        setEnquiryError(data.error || "Failed to submit enquiry.");
      }
    } catch (err) {
      setEnquiryError((err as Error).message);
    } finally {
      setEnquirySending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold">Loading listing details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-gray-900">Listing Not Found</h2>
        <p className="text-xs text-gray-400 mt-1">{error || "This item may have been deleted or moved."}</p>
        <Link
          href="/"
          className="mt-4 inline-block px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isOwner = currentUser.id === listing.seller.id;
  const favorited = isFavorite(listing._id);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </Link>

        <div className="flex items-center gap-2">
          {/* QR Share button */}
          <button
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-2xs transition"
          >
            <Share2 className="w-3.5 h-3.5 text-red-500" />
            Share / QR Code
          </button>

          {/* Favorite button */}
          <button
            onClick={() => toggleFavorite(listing._id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs transition ${
              favorited
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            {favorited ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Owner controls banner if current user is seller */}
      {isOwner && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-xs font-extrabold text-red-900">
              You are the seller of this listing. Quick actions:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-red-800 font-bold">Status:</span>
            <select
              aria-label="Listing status"
              value={listing.status}
              disabled={updatingStatus}
              onChange={(e) =>
                handleStatusChange(e.target.value as "Available" | "Reserved" | "Sold")
              }
              className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-white border border-red-300 text-red-900 shadow-2xs cursor-pointer"
            >
              <option value="Available">Available (Active)</option>
              <option value="Reserved">Reserved (On Hold)</option>
              <option value="Sold">Sold (Completed)</option>
            </select>

            <Link
              href={`/listings/${listing._id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Link>

            <button
              onClick={handleDeleteListing}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Image & Details, Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs">
            {/* Main Picture */}
            <div className="relative aspect-16/10 w-full bg-[#f8f9fa] flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  listing.images && listing.images.length > 0
                    ? listing.images[0]
                    : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
                }
                alt={listing.title}
                className="w-full h-full object-cover rounded-2xl"
              />

              {/* Status and Type Badges */}
              <div className="absolute top-6 left-6 flex gap-2">
                {listing.status === "Sold" && (
                  <span className="bg-gray-900 text-white text-xs font-black px-3 py-1 rounded-full uppercase shadow-md">
                    Sold
                  </span>
                )}
                {listing.status === "Reserved" && (
                  <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase shadow-md">
                    Reserved
                  </span>
                )}
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full shadow-md ${
                    listing.type === "Free"
                      ? "bg-emerald-500 text-white"
                      : listing.type === "Exchange"
                      ? "bg-purple-600 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {listing.type}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-500 mb-1.5">
                    <span className="bg-red-50 px-2.5 py-0.5 rounded-md">{listing.category}</span>
                    <span className="text-gray-400">• Condition: {listing.condition}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold ml-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>4.8</span>
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {listing.title}
                  </h1>
                </div>

                <div className="text-right">
                  {listing.type === "Free" ? (
                    <span className="text-3xl font-black text-emerald-600 tracking-tight">FREE</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-black text-gray-900 tracking-tight">
                        ₹{listing.price.toLocaleString("en-IN")}
                      </span>
                      {listing.price > 0 && (
                        <div className="text-xs text-gray-400 line-through">
                          ₹{(listing.price * 1.4).toFixed(0)} MRP
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Campus Location & Meta */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400 mb-6 font-medium">
                <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{listing.campus}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Listed on {new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                  Item Description
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-[#fbfbfe] p-5 rounded-2xl border border-gray-100 font-normal">
                  {listing.description}
                </p>
              </div>
            </div>
          </div>

          {/* Similar Items Carousel */}
          {similar.length > 0 && (
            <div className="pt-2">
              <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-red-500" />
                Similar items in {listing.category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similar.map((item) => (
                  <ListingCard key={item._id} listing={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Seller Profile & Enquiry Form */}
        <div className="lg:col-span-4 space-y-6">
          {/* Seller Profile Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-4">
              Verified Student Seller
            </h3>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-red-500/20 shrink-0">
                {listing.seller.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">{listing.seller.name}</h4>
                <p className="text-xs text-gray-400">{listing.seller.campus}</p>
                <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Student
                </div>
              </div>
            </div>

            {listing.seller.bio && (
              <p className="text-xs text-gray-500 italic bg-gray-50/70 p-3 rounded-xl border border-gray-100 mb-4">
                &quot;{listing.seller.bio}&quot;
              </p>
            )}

            <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-gray-600">
                <span>Preferred Handover:</span>
                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {listing.seller.contactPreference || "WhatsApp"}
                </span>
              </div>

              {listing.seller.phone && (
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone:
                  </span>
                  <a
                    href={`tel:${listing.seller.phone}`}
                    className="font-bold text-gray-800 hover:text-red-500"
                  >
                    {listing.seller.phone}
                  </a>
                </div>
              )}

              {listing.seller.email && (
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> Email:
                  </span>
                  <a
                    href={`mailto:${listing.seller.email}`}
                    className="font-bold text-gray-800 hover:text-red-500 truncate max-w-[150px]"
                  >
                    {listing.seller.email}
                  </a>
                </div>
              )}
            </div>

            <Link
              href={`/seller/${listing.seller.id}`}
              className="mt-4 block w-full text-center py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              View Seller&apos;s Other Listings →
            </Link>
          </div>

          {/* Enquiry / Offer Submission Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-500 mb-2">
              <MessageCircle className="w-4 h-4" />
              Make an Enquiry / Offer
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-1">
              Contact Seller & Negotiate
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Send a direct enquiry or propose an offer. The seller gets notified on their dashboard.
            </p>

            {enquirySuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-black text-emerald-900">Enquiry Delivered!</h4>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Your message has been sent to {listing.seller.name}. You can track replies in your Dashboard.
                </p>
                <button
                  onClick={() => setEnquirySuccess(false)}
                  className="mt-3 text-xs font-bold text-emerald-800 underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEnquiry} className="space-y-3">
                {enquiryError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    {enquiryError}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Campus Email
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Optional Offer Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      placeholder={`Asking ₹${listing.price}`}
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquirySending || listing.status === "Sold"}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {enquirySending
                    ? "Submitting..."
                    : listing.status === "Sold"
                    ? "Item Sold"
                    : "Send Enquiry & Offer"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <QRCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title={listing.title}
        url={currentUrl}
      />
    </div>
  );
}
