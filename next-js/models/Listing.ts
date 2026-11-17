import mongoose, { Schema, Document } from "mongoose";

export interface IListingDoc extends Document {
  title: string;
  description: string;
  price: number;
  category: "Books" | "Electronics" | "Furniture" | "Stationery" | "Other";
  condition: "Brand New" | "Like New" | "Good" | "Fair";
  type: "For Sale" | "Free" | "Exchange";
  status: "Available" | "Reserved" | "Sold";
  images: string[];
  campus: string;
  seller: {
    id: string;
    name: string;
    email: string;
    phone: string;
    campus: string;
    contactPreference: "Email" | "Phone" | "WhatsApp" | "Campus Meeting";
    bio?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListingDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    category: {
      type: String,
      enum: ["Books", "Electronics", "Furniture", "Stationery", "Other"],
      required: true,
      default: "Books",
    },
    condition: {
      type: String,
      enum: ["Brand New", "Like New", "Good", "Fair"],
      required: true,
      default: "Good",
    },
    type: {
      type: String,
      enum: ["For Sale", "Free", "Exchange"],
      required: true,
      default: "For Sale",
    },
    status: {
      type: String,
      enum: ["Available", "Reserved", "Sold"],
      required: true,
      default: "Available",
    },
    images: { type: [String], default: [] },
    campus: { type: String, default: "North Campus" },
    seller: {
      id: { type: String, required: true, default: "student-1" },
      name: { type: String, required: true, default: "Aarav Sharma" },
      email: { type: String, required: true, default: "aarav.sharma@campus.edu" },
      phone: { type: String, default: "+91 98765 43210" },
      campus: { type: String, default: "North Campus" },
      contactPreference: {
        type: String,
        enum: ["Email", "Phone", "WhatsApp", "Campus Meeting"],
        default: "WhatsApp",
      },
      bio: { type: String, default: "Computer Science 3rd Year student." },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose overwrite model error in hot reload
export default mongoose.models.Listing || mongoose.model<IListingDoc>("Listing", ListingSchema);
