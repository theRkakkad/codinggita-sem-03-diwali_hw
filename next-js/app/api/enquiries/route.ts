import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import Listing from "@/models/Listing";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const sellerId = searchParams.get("sellerId");
    const buyerEmail = searchParams.get("buyerEmail");
    const listingId = searchParams.get("listingId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (sellerId) filter.sellerId = sellerId;
    if (buyerEmail) filter.buyerEmail = buyerEmail;
    if (listingId) filter.listingId = listingId;

    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, enquiries });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { listingId, buyerName, buyerEmail, buyerPhone, message, offerPrice } = body;

    if (!listingId || !buyerName || !buyerEmail || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (listing, name, email, message)." },
        { status: 400 }
      );
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Associated listing not found" },
        { status: 404 }
      );
    }

    const newEnquiry = await Enquiry.create({
      listingId,
      listingTitle: listing.title,
      sellerId: listing.seller.id,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerPhone: buyerPhone?.trim() || "",
      message: message.trim(),
      offerPrice: offerPrice !== undefined && offerPrice !== "" ? Number(offerPrice) : null,
      status: "Pending",
      sellerReply: "",
    });

    return NextResponse.json({ success: true, enquiry: newEnquiry }, { status: 201 });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
