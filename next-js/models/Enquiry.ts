import mongoose, { Schema, Document } from "mongoose";

export interface IEnquiryDoc extends Document {
  listingId: mongoose.Types.ObjectId;
  listingTitle: string;
  sellerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  message: string;
  offerPrice?: number;
  status: "Pending" | "Accepted" | "Rejected";
  sellerReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiryDoc>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    listingTitle: { type: String, required: true },
    sellerId: { type: String, required: true },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    buyerPhone: { type: String, default: "" },
    message: { type: String, required: true },
    offerPrice: { type: Number, default: null },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    sellerReply: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Enquiry || mongoose.model<IEnquiryDoc>("Enquiry", EnquirySchema);
