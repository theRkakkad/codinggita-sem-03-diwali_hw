import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Listing from "@/models/Listing";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category");
    const condition = searchParams.get("condition");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const campus = searchParams.get("campus");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sellerId = searchParams.get("sellerId");
    const sort = searchParams.get("sort") || "newest";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (condition && condition !== "All") {
      filter.condition = condition;
    }

    if (type && type !== "All") {
      filter.type = type;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (campus && campus !== "All") {
      filter.campus = campus;
    }

    if (sellerId) {
      filter["seller.id"] = sellerId;
    }

    if (minPrice !== null && minPrice !== "" && !isNaN(Number(minPrice))) {
      filter.price = { ...filter.price, $gte: Number(minPrice) };
    }

    if (maxPrice !== null && maxPrice !== "" && !isNaN(Number(maxPrice))) {
      filter.price = { ...filter.price, $lte: Number(maxPrice) };
    }

    // Sort options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortOptions: any = { createdAt: -1 };
    if (sort === "price-asc") {
      sortOptions = { price: 1 };
    } else if (sort === "price-desc") {
      sortOptions = { price: -1 };
    } else if (sort === "newest") {
      sortOptions = { createdAt: -1 };
    }

    const listings = await Listing.find(filter).sort(sortOptions).lean();

    return NextResponse.json({ success: true, listings });
  } catch (error) {
    console.error("Error fetching listings:", error);
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

    const {
      title,
      description,
      price,
      category,
      condition,
      type,
      status,
      campus,
      images,
      seller,
    } = body;

    if (!title || !description || category === undefined) {
      return NextResponse.json(
        { success: false, error: "Title, description, and category are required." },
        { status: 400 }
      );
    }

    // Default image if none provided
    const imageList = Array.isArray(images) && images.length > 0 ? images : [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
    ];

    const newListing = await Listing.create({
      title: title.trim(),
      description: description.trim(),
      price: type === "Free" ? 0 : Number(price) || 0,
      category,
      condition: condition || "Good",
      type: type || "For Sale",
      status: status || "Available",
      campus: campus || "North Campus",
      images: imageList,
      seller: seller || {
        id: "student-1",
        name: "Aarav Sharma",
        email: "aarav.sharma@campus.edu",
        phone: "+91 98765 43210",
        campus: "North Campus",
        contactPreference: "WhatsApp",
        bio: "3rd Year Computer Science student.",
      },
    });

    return NextResponse.json({ success: true, listing: newListing }, { status: 201 });
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
