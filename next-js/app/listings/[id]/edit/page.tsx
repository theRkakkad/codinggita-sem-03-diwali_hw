"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListingCategory, ListingCondition, ListingType, ListingStatus } from "@/types";
import { ArrowLeft, Save, Trash2, AlertCircle } from "lucide-react";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ListingCategory>("Books");
  const [condition, setCondition] = useState<ListingCondition>("Good");
  const [type, setType] = useState<ListingType>("For Sale");
  const [status, setStatus] = useState<ListingStatus>("Available");
  const [campus, setCampus] = useState("North Campus");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listings/${id}`);
        const data = await res.json();
        if (data.success && data.listing) {
          const l = data.listing;
          setTitle(l.title);
          setDescription(l.description);
          setPrice(l.price.toString());
          setCategory(l.category);
          setCondition(l.condition);
          setType(l.type);
          setStatus(l.status);
          setCampus(l.campus || "North Campus");
          setImageUrl(l.images?.[0] || "");
        } else {
          setError(data.error || "Failed to load listing");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      const res = await fetch(`/api/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: type === "Free" ? 0 : Number(price) || 0,
          category,
          condition,
          type,
          status,
          campus,
          images: [imageUrl],
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/listings/${id}`);
      } else {
        setError(data.error || "Failed to update listing");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this listing?")) {
      try {
        const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          router.push("/dashboard");
        }
      } catch (err) {
        alert("Failed to delete: " + (err as Error).message);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-xs text-gray-400 font-bold">
        Loading listing details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/listings/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Listing
      </Link>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Edit Listing</h1>
            <p className="text-xs text-gray-400 mt-1">Update price, availability, or item details</p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete Ad
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Books">Books</option>
                <option value="Electronics">Electronics</option>
                <option value="Furniture">Furniture</option>
                <option value="Stationery">Stationery</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Listing Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ListingType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="For Sale">For Sale</option>
                <option value="Free">Free</option>
                <option value="Exchange">Exchange</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Item Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ListingStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden font-bold"
              >
                <option value="Available">Available (Active)</option>
                <option value="Reserved">Reserved (On Hold)</option>
                <option value="Sold">Sold (Completed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Price (₹)</label>
              <input
                type="number"
                min="0"
                disabled={type === "Free"}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Campus Location</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            >
              <option value="North Campus">North Campus</option>
              <option value="South Campus">South Campus</option>
              <option value="Central Campus">Central Campus</option>
              <option value="East Campus">East Campus</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              href={`/listings/${id}`}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-500/25 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
