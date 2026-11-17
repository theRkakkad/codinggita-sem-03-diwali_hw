import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Listing from "@/models/Listing";
import Enquiry from "@/models/Enquiry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const listing = await Listing.findById(id).lean();
    if (!listing) {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }

    // Similar listings in same category (excluding current item)
    const similar = await Listing.find({
      _id: { $ne: id },
      category: listing.category,
      status: "Available",
    })
      .limit(3)
      .lean();

    return NextResponse.json({ success: true, listing, similar });
  } catch (error) {
    console.error("Error fetching single listing:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updated = await Listing.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, listing: updated });
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Listing.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }

    // Also remove any enquiries associated with this listing
    await Enquiry.deleteMany({ listingId: id });

    return NextResponse.json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
