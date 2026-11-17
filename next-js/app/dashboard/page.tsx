"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { IListing, IEnquiry, ListingStatus } from "@/types";
import {
  Package,
  Inbox,
  Send,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Check,
  ShoppingBag,
  Heart,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  ArrowRight,
  TrendingUp,
  Coins,
  Store,
  ChevronRight,
  Wallet,
  Zap,
  Bot,
  GraduationCap,
} from "lucide-react";

export default function DashboardPage() {
  const { currentUser, favorites, isSeller, switchToSeller, switchToBuyer } = useApp();

  // Seller tab state
  const [sellerTab, setSellerTab] = useState<"listings" | "incoming-offers" | "sold">("listings");
  // Buyer tab state
  const [buyerTab, setBuyerTab] = useState<"ready-handover" | "my-offers" | "watchlist">("ready-handover");

  const [listings, setListings] = useState<IListing[]>([]);
  const [allListings, setAllListings] = useState<IListing[]>([]);
  const [receivedEnquiries, setReceivedEnquiries] = useState<IEnquiry[]>([]);
  const [sentEnquiries, setSentEnquiries] = useState<IEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch user's own listings (as seller)
      const listRes = await fetch(`/api/listings?sellerId=${currentUser.id}&status=All`);
      const listData = await listRes.json();
      if (listData.success) {
        setListings(listData.listings);
      }

      // Fetch all listings for watchlist matching in buyer hub
      const allRes = await fetch(`/api/listings?status=All`);
      const allData = await allRes.json();
      if (allData.success) {
        setAllListings(allData.listings);
      }

      // Fetch received offers (as seller)
      const recRes = await fetch(`/api/enquiries?sellerId=${currentUser.id}`);
      const recData = await recRes.json();
      if (recData.success) {
        setReceivedEnquiries(recData.enquiries);
      }

      // Fetch sent offers (as buyer)
      const sentRes = await fetch(`/api/enquiries?buyerEmail=${currentUser.email}`);
      const sentData = await sentRes.json();
      if (sentData.success) {
        setSentEnquiries(sentData.enquiries);
      }
    } catch (err) {
      console.error("Dashboard loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleUpdateListingStatus = async (id: string, newStatus: ListingStatus) => {
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setListings((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      alert("Error: " + (err as Error).message);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (confirm("Permanently delete this listing?")) {
      try {
        const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setListings((prev) => prev.filter((item) => item._id !== id));
        }
      } catch (err) {
        alert("Delete failed: " + (err as Error).message);
      }
    }
  };

  const handleEnquiryAction = async (
    enquiryId: string,
    newStatus: "Accepted" | "Rejected",
    customReply?: string
  ) => {
    try {
      const reply = customReply !== undefined ? customReply : replyInputs[enquiryId] || "";
      const res = await fetch(`/api/enquiries/${enquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          sellerReply: reply,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReceivedEnquiries((prev) =>
          prev.map((enq) =>
            enq._id === enquiryId
              ? { ...enq, status: newStatus, sellerReply: reply }
              : enq
          )
        );
      }
    } catch (err) {
      alert("Action failed: " + (err as Error).message);
    }
  };

  // Seller metrics
  const activeCount = listings.filter((l) => l.status === "Available").length;
  const reservedCount = listings.filter((l) => l.status === "Reserved").length;
  const soldListings = listings.filter((l) => l.status === "Sold");
  const soldCount = soldListings.length;
  const totalSalesRevenue = soldListings.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const pendingIncomingOffers = receivedEnquiries.filter((e) => e.status === "Pending").length;

  // Buyer metrics
  const acceptedSentOffers = sentEnquiries.filter((e) => e.status === "Accepted");
  const pendingSentOffers = sentEnquiries.filter((e) => e.status === "Pending");
  const watchlistItems = allListings.filter((l) => favorites.includes(l._id));

  // Estimated buyer savings
  const totalSavings = acceptedSentOffers.reduce((sum, e) => {
    const orig = allListings.find((l) => l._id === e.listingId)?.price || 0;
    const diff = orig > (e.offerPrice || 0) ? orig - (e.offerPrice || 0) : 150;
    return sum + diff;
  }, 350);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Account Profile Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md ${
              isSeller
                ? "bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500"
                : "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500"
            }`}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900">{currentUser.name}</h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  isSeller
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isSeller ? "Seller Account" : "Buyer Account"}
              </span>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                • {currentUser.campus}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{currentUser.email} • {currentUser.phone}</p>
          </div>
        </div>

        {/* Quick User Switcher Helper */}
        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <span className="text-gray-400 font-bold hidden sm:inline">Active Role:</span>
          {isSeller ? (
            <button
              onClick={switchToBuyer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition text-xs"
              title="Switch to Buyer Account to browse and make offers"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Switch to Buyer (Priya)</span>
            </button>
          ) : (
            <button
              onClick={switchToSeller}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold transition text-xs border border-red-200/60"
              title="Switch to Seller Account to manage listings and sales"
            >
              <Package className="w-3.5 h-3.5 text-red-500" />
              <span>Switch to Seller (Aarav)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SELLER ACCOUNT DASHBOARD                                  */}
      {/* ========================================================= */}
      {isSeller ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Seller Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-extrabold mb-2">
                <Package className="w-3.5 h-3.5 text-red-500" />
                <span>SELLER INVENTORY & SALES HUB</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Manage Campus Listings & Offers
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Post textbooks, drafters & electronics, accept price offers, and coordinate safe handovers.
              </p>
            </div>

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-500/25 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Create New Listing
            </Link>
          </div>

          {/* Seller KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Active Listings
              </span>
              <span className="text-3xl font-black text-red-500">{activeCount}</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Pending Buyer Offers
              </span>
              <span className="text-3xl font-black text-purple-600">{pendingIncomingOffers}</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Reserved / On Hold
              </span>
              <span className="text-3xl font-black text-amber-500">{reservedCount}</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Total Revenue (Sold)
              </span>
              <span className="text-3xl font-black text-emerald-600">
                ₹{totalSalesRevenue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Seller Sub-Navigation Tabs */}
          <div className="border-b border-gray-200/80">
            <nav className="flex space-x-6 text-xs font-extrabold">
              <button
                onClick={() => setSellerTab("listings")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  sellerTab === "listings"
                    ? "border-red-500 text-red-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Package className="w-4 h-4" />
                My Listings ({listings.length})
              </button>

              <button
                onClick={() => setSellerTab("incoming-offers")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  sellerTab === "incoming-offers"
                    ? "border-red-500 text-red-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Inbox className="w-4 h-4" />
                Incoming Buyer Offers ({receivedEnquiries.length})
                {pendingIncomingOffers > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {pendingIncomingOffers}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSellerTab("sold")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  sellerTab === "sold"
                    ? "border-red-500 text-red-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Sold History ({soldCount})
              </button>
            </nav>
          </div>

          {/* Tab 1: My Listings */}
          {sellerTab === "listings" && (
            <div>
              {listings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No listings posted yet</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Post textbooks, dorm accessories, or gadgets to connect with campus buyers.
                  </p>
                  <Link
                    href="/create"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Post First Listing
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs divide-y divide-gray-50">
                  {listings.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.images?.[0] ||
                              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                item.status === "Available"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.status === "Reserved"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-900 text-white"
                              }`}
                            >
                              {item.status}
                            </span>
                            <span className="text-xs font-bold text-gray-400">
                              {item.category} • {item.type}
                            </span>
                          </div>
                          <Link
                            href={`/listings/${item._id}`}
                            className="text-sm font-extrabold text-gray-900 hover:text-red-500 line-clamp-1"
                          >
                            {item.title}
                          </Link>
                          <span className="text-xs font-black text-red-500">
                            {item.type === "Free" ? "FREE" : `₹${item.price.toLocaleString("en-IN")}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        <select
                          aria-label="Change status"
                          value={item.status}
                          onChange={(e) =>
                            handleUpdateListingStatus(item._id, e.target.value as ListingStatus)
                          }
                          className="text-xs font-bold px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="Available">Available</option>
                          <option value="Reserved">Reserved</option>
                          <option value="Sold">Sold</option>
                        </select>

                        <Link
                          href={`/listings/${item._id}/edit`}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <Link
                          href={`/listings/${item._id}`}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="View"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteListing(item._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Incoming Buyer Offers */}
          {sellerTab === "incoming-offers" && (
            <div className="space-y-4">
              {receivedEnquiries.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No received offers yet</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    When fellow students make price offers or enquiries on your items, they will appear here.
                  </p>
                </div>
              ) : (
                receivedEnquiries.map((enq) => (
                  <div
                    key={enq._id}
                    className="bg-white rounded-3xl border border-gray-100 p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Enquiry for:</span>
                        <h3 className="text-sm font-extrabold text-gray-900">{enq.listingTitle}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                            enq.status === "Accepted"
                              ? "bg-emerald-50 text-emerald-700"
                              : enq.status === "Rejected"
                              ? "bg-red-50 text-red-600"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {enq.status} Offer
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#fbfbfe] p-3.5 rounded-2xl border border-gray-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-gray-800">
                          Buyer: {enq.buyerName} ({enq.buyerEmail})
                        </span>
                        {enq.offerPrice && (
                          <span className="font-black text-red-600 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100">
                            Offered Price: ₹{enq.offerPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 italic">&quot;{enq.message}&quot;</p>
                    </div>

                    {enq.sellerReply && (
                      <div className="p-3 bg-red-50/60 border border-red-100 rounded-2xl text-xs text-red-900">
                        <span className="font-bold">Your Response to Buyer:</span> {enq.sellerReply}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Message buyer (e.g. Agreed! Meet at Central Library 4 PM)..."
                        value={replyInputs[enq._id] || ""}
                        onChange={(e) =>
                          setReplyInputs({ ...replyInputs, [enq._id]: e.target.value })
                        }
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEnquiryAction(enq._id, "Accepted")}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Offer
                        </button>
                        <button
                          onClick={() => handleEnquiryAction(enq._id, "Rejected")}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Sold Items */}
          {sellerTab === "sold" && (
            <div>
              {soldListings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No completed sales yet</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    When you hand over an item and mark it &quot;Sold&quot;, it will appear here with your revenue summary.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {soldListings.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.images?.[0] ||
                              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80"
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900 line-clamp-1">{item.title}</h4>
                          <span className="text-[11px] text-emerald-600 font-bold">
                            Sold for ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg">
                        <Check className="w-3 h-3 stroke-[3]" /> Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* BUYER ACCOUNT DASHBOARD                                   */
        /* ========================================================= */
        <div className="space-y-8 animate-fadeIn">
          {/* Buyer Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-extrabold mb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>BUYER TRACKING HUB</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                My Offers, Campus Deals & Watchlist
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Monitor your submitted offers, view accepted deals ready for campus pickup, and track bookmarked study essentials.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Explore Marketplace
            </Link>
          </div>

          {/* Buyer KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Accepted Deals
              </span>
              <span className="text-3xl font-black text-emerald-600">
                {acceptedSentOffers.length}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Pending Offers Sent
              </span>
              <span className="text-3xl font-black text-purple-600">
                {pendingSentOffers.length}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Saved Watchlist
              </span>
              <span className="text-3xl font-black text-rose-500">
                {favorites.length}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Estimated Savings
              </span>
              <span className="text-3xl font-black text-amber-500">
                ₹{totalSavings.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Buyer Sub-Navigation Tabs */}
          <div className="border-b border-gray-200/80">
            <nav className="flex space-x-6 text-xs font-extrabold">
              <button
                onClick={() => setBuyerTab("ready-handover")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  buyerTab === "ready-handover"
                    ? "border-emerald-500 text-emerald-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Ready for Campus Handover ({acceptedSentOffers.length})
                {acceptedSentOffers.length > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                    READY
                  </span>
                )}
              </button>

              <button
                onClick={() => setBuyerTab("my-offers")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  buyerTab === "my-offers"
                    ? "border-emerald-500 text-emerald-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Send className="w-4 h-4" />
                All My Sent Offers ({sentEnquiries.length})
              </button>

              <button
                onClick={() => setBuyerTab("watchlist")}
                className={`pb-3 border-b-2 flex items-center gap-2 transition ${
                  buyerTab === "watchlist"
                    ? "border-emerald-500 text-emerald-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Heart className="w-4 h-4" />
                My Watchlist ({favorites.length})
              </button>
            </nav>
          </div>

          {/* Tab 1: Ready for Campus Handover (Accepted Deals) */}
          {buyerTab === "ready-handover" && (
            <div className="space-y-4">
              {acceptedSentOffers.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No accepted deals yet</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    When a seller accepts your offer, handover instructions and direct contact details will appear here.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                  >
                    Browse Items to Make an Offer
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Campus Handover Safety Alert */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 leading-relaxed">
                      <span className="font-black">Campus Handover Protocol:</span> Always arrange pickups in public, well-lit campus zones like the Central Library, Cafeteria, or Student Center. Verify condition before cash/UPI payment!
                    </div>
                  </div>

                  {acceptedSentOffers.map((enq) => (
                    <div
                      key={enq._id}
                      className="bg-white rounded-3xl border-2 border-emerald-500/20 p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                              <Check className="w-3 h-3 stroke-[3]" /> Offer Accepted
                            </span>
                            <span className="text-xs text-gray-400">
                              Agreed on {new Date(enq.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-gray-900">
                            {enq.listingTitle}
                          </h3>
                        </div>

                        {enq.offerPrice && (
                          <div className="text-right">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Agreed Price</span>
                            <span className="text-xl font-black text-emerald-600">
                              ₹{enq.offerPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Seller Response / Handover Location */}
                      {enq.sellerReply ? (
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
                          <span className="text-[11px] font-black uppercase text-emerald-800 block mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            Seller&apos;s Handover Instructions:
                          </span>
                          <p className="text-xs font-bold text-gray-800">&quot;{enq.sellerReply}&quot;</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Seller has accepted your offer. Reach out to coordinate time and location.</p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                          href={`https://wa.me/919876543210?text=Hi! I am following up on the accepted offer for ${encodeURIComponent(enq.listingTitle || "your item")}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat on WhatsApp
                        </a>

                        <a
                          href="tel:+919876543210"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call Seller
                        </a>

                        <Link
                          href={`/listings/${enq.listingId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-500 hover:text-gray-900 text-xs font-bold rounded-xl transition ml-auto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Listing
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: All My Sent Offers */}
          {buyerTab === "my-offers" && (
            <div className="space-y-4">
              {sentEnquiries.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No offers sent yet</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    When you enquire or negotiate on items in the marketplace, your full negotiation history appears here.
                  </p>
                </div>
              ) : (
                sentEnquiries.map((enq) => (
                  <div
                    key={enq._id}
                    className="bg-white rounded-3xl border border-gray-100 p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-900">{enq.listingTitle}</h3>
                        <span className="text-xs text-gray-400">
                          Sent on {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                          enq.status === "Accepted"
                            ? "bg-emerald-50 text-emerald-700"
                            : enq.status === "Rejected"
                            ? "bg-red-50 text-red-600"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        Status: {enq.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      <span className="font-bold text-gray-400">Your Message:</span> &quot;{enq.message}&quot;
                      {enq.offerPrice && (
                        <span className="ml-2 font-black text-red-600">
                          (Your Offer: ₹{enq.offerPrice.toLocaleString("en-IN")})
                        </span>
                      )}
                    </div>

                    {enq.sellerReply && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                        <span className="font-bold">Seller Response:</span> {enq.sellerReply}
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <Link
                        href={`/listings/${enq.listingId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-emerald-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Go to Listing
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: My Campus Watchlist */}
          {buyerTab === "watchlist" && (
            <div>
              {watchlistItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                  <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900">No saved items in watchlist</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Click the heart icon on any listing while browsing to track price and availability changes.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl"
                  >
                    Browse Listings
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {watchlistItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-md transition p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-36 rounded-2xl bg-gray-100 overflow-hidden mb-3 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.images?.[0] ||
                              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-md ${
                              item.status === "Available"
                                ? "bg-emerald-500 text-white"
                                : item.status === "Reserved"
                                ? "bg-amber-500 text-white"
                                : "bg-gray-900 text-white"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {item.category} • {item.campus}
                        </span>
                        <h4 className="text-xs font-extrabold text-gray-900 line-clamp-1 mt-0.5">
                          {item.title}
                        </h4>
                        <div className="text-sm font-black text-red-500 mt-1">
                          {item.type === "Free" ? "FREE" : `₹${item.price.toLocaleString("en-IN")}`}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <Link
                          href={`/listings/${item._id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          <span>Make an Offer</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {item.condition}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* "WANT TO BECOME A SELLER?" SECTION (FOR BUYERS)          */}
          {/* ========================================================= */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-red-950 p-6 sm:p-8 text-white shadow-xl mt-12 border border-red-900/30">
            {/* Background glowing ambient effects */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-wider mb-3 border border-red-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Earn Cash on Campus</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Want to become a seller on VidyaBazaar?
                </h3>

                <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                  Have textbooks from previous semesters, engineering drafting tools, scientific calculators, or dorm accessories? Turn them into instant cash with <span className="text-red-400 font-bold">0% commission fees</span> and sell directly to students right on your campus!
                </p>

                {/* 3 Perks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                      <Wallet className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-xs font-black text-white">100% Direct Profit</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      No platform cuts. Direct cash or UPI at handover.
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xs font-black text-white">Instant Handover</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Meet at library or hostel — no packing or courier hassle.
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-xs font-black text-white">Smart AI Assistant</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Auto-generate descriptions & prices in 5 seconds.
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion CTA Box */}
              <div className="lg:w-72 bg-white/10 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-md flex flex-col justify-between shrink-0 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/30">
                  <GraduationCap className="w-6 h-6 text-white stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-black text-white">Activate Seller Account</h4>
                <p className="text-[11px] text-gray-300 mt-1 mb-4">
                  Switch to your seller profile with 1 click to unlock listing creation & inventory tools.
                </p>

                <button
                  onClick={switchToSeller}
                  className="w-full py-3 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>Start Selling Now</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
