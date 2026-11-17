export type ListingCategory = "Books" | "Electronics" | "Furniture" | "Stationery" | "Other";

export type ListingType = "For Sale" | "Free" | "Exchange";

export type ListingCondition = "Brand New" | "Like New" | "Good" | "Fair";

export type ListingStatus = "Available" | "Reserved" | "Sold";

export interface SellerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  campus: string;
  contactPreference: "Email" | "Phone" | "WhatsApp" | "Campus Meeting";
  bio?: string;
  avatarUrl?: string;
  role?: "seller" | "buyer";
}

export interface IListing {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: ListingCategory;
  condition: ListingCondition;
  type: ListingType;
  status: ListingStatus;
  images: string[];
  campus: string;
  seller: SellerInfo;
  createdAt: string;
  updatedAt: string;
}

export interface IEnquiry {
  _id: string;
  listingId: string;
  listingTitle?: string;
  sellerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  message: string;
  offerPrice?: number;
  status: "Pending" | "Accepted" | "Rejected";
  sellerReply?: string;
  createdAt: string;
}
