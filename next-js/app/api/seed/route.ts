import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Listing from "@/models/Listing";
import Enquiry from "@/models/Enquiry";

export async function POST() {
  try {
    await connectDB();

    // Clear existing
    await Listing.deleteMany({});
    await Enquiry.deleteMany({});

    const sampleListings = [
      {
        title: "Calculus: Early Transcendentals (8th Edition) - James Stewart",
        description: "Standard engineering mathematics textbook. Clean pages with minimal pencil markings on exercise problems. Hardcover, very well kept. Essential for 1st & 2nd sem engineering students.",
        price: 450,
        category: "Books",
        condition: "Good",
        type: "For Sale",
        status: "Available",
        campus: "North Campus",
        images: [
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-1",
          name: "Aarav Sharma",
          email: "aarav.sharma@campus.edu",
          phone: "+91 98765 43210",
          campus: "North Campus",
          contactPreference: "WhatsApp",
          bio: "3rd Year Computer Science student. Clearing out books after sem exams.",
        },
      },
      {
        title: "Casio FX-991EX ClassWiz Scientific Calculator",
        description: "Original Casio FX-991EX ClassWiz with natural textbook display and 552 functions. Used for 2 semesters, screen is spotless and solar backup works perfectly. Allowed in university examinations.",
        price: 850,
        category: "Electronics",
        condition: "Like New",
        type: "For Sale",
        status: "Available",
        campus: "South Campus",
        images: [
          "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-2",
          name: "Priya Patel",
          email: "priya.patel@campus.edu",
          phone: "+91 98111 22334",
          campus: "South Campus",
          contactPreference: "Campus Meeting",
          bio: "2nd Year Electronics student at Main Engineering block.",
        },
      },
      {
        title: "Ergonomic Mesh Study Chair with Headrest",
        description: "Super comfortable breathable mesh chair with adjustable height and tilt lock. Purchased 8 months ago for hostel room. Moving to a furnished PG so need to sell quickly.",
        price: 1400,
        category: "Furniture",
        condition: "Good",
        type: "For Sale",
        status: "Available",
        campus: "North Campus",
        images: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-3",
          name: "Rohan Verma",
          email: "rohan.verma@campus.edu",
          phone: "+91 97234 56789",
          campus: "North Campus",
          contactPreference: "Phone",
          bio: "Final year Mechanical student. Can deliver within Boys Hostel block 4.",
        },
      },
      {
        title: "Chemistry Lab Coat (Size M) + Safety Eye Goggles",
        description: "White 100% cotton lab coat required for 1st year chemistry lab. Clean and washed, no acid burns. Includes anti-fog safety goggles. Giving away for free to any junior!",
        price: 0,
        category: "Stationery",
        condition: "Good",
        type: "Free",
        status: "Available",
        campus: "Central Campus",
        images: [
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-1",
          name: "Aarav Sharma",
          email: "aarav.sharma@campus.edu",
          phone: "+91 98765 43210",
          campus: "Central Campus",
          contactPreference: "WhatsApp",
          bio: "3rd Year Computer Science student.",
        },
      },
      {
        title: "Logitech K380 Multi-Device Bluetooth Keyboard",
        description: "Compact wireless keyboard that connects to laptop, tablet, and phone simultaneously with easy-switch buttons. Navy blue colour. Kept in pouch, great battery life. Open to exchange for a USB-C hub.",
        price: 1300,
        category: "Electronics",
        condition: "Like New",
        type: "Exchange",
        status: "Available",
        campus: "East Campus",
        images: [
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-4",
          name: "Ananya Iyer",
          email: "ananya.iyer@campus.edu",
          phone: "+91 99887 76655",
          campus: "East Campus",
          contactPreference: "Email",
          bio: "Design & CS double major. Love mechanical keyboards and gadgets.",
        },
      },
      {
        title: "Foldable Wooden Bed Desk / Laptop Stand with Cup Holder",
        description: "Sturdy foldable table for studying on bed or dorm floor. Has dedicated tablet groove and cup holder. Folds completely flat to slide under bed.",
        price: 350,
        category: "Furniture",
        condition: "Good",
        type: "For Sale",
        status: "Reserved",
        campus: "North Campus",
        images: [
          "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-2",
          name: "Priya Patel",
          email: "priya.patel@campus.edu",
          phone: "+91 98111 22334",
          campus: "North Campus",
          contactPreference: "WhatsApp",
          bio: "2nd Year Electronics student.",
        },
      },
      {
        title: "Engineering Drawing Board (A2 Size) + Mini Drafter Set",
        description: "Complete engineering graphics package: Pine wood drawing board, Omega mini-drafter with clamps, roller scale, set squares, and drafting clips. Used for single graphics sem.",
        price: 600,
        category: "Stationery",
        condition: "Good",
        type: "For Sale",
        status: "Available",
        campus: "South Campus",
        images: [
          "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-3",
          name: "Rohan Verma",
          email: "rohan.verma@campus.edu",
          phone: "+91 97234 56789",
          campus: "South Campus",
          contactPreference: "Campus Meeting",
          bio: "Final year Mechanical student.",
        },
      },
      {
        title: "Preeti Electric Kettle 1.2L for Hostel Room",
        description: "Stainless steel rapid boil electric kettle with auto-cutoff. Perfect for tea, coffee, boiling eggs, or late night Maggi noodles during exam week. Fully functional.",
        price: 450,
        category: "Other",
        condition: "Good",
        type: "For Sale",
        status: "Sold",
        campus: "North Campus",
        images: [
          "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
        ],
        seller: {
          id: "student-1",
          name: "Aarav Sharma",
          email: "aarav.sharma@campus.edu",
          phone: "+91 98765 43210",
          campus: "North Campus",
          contactPreference: "WhatsApp",
          bio: "3rd Year Computer Science student.",
        },
      },
    ];

    const createdListings = await Listing.insertMany(sampleListings);

    // Create sample enquiries for demo users so both Seller and Buyer dashboards have rich data right away
    const calculusItem = createdListings[0];
    const casioItem = createdListings[1];
    const chairItem = createdListings[2];
    const keyboardItem = createdListings[4];

    const sampleEnquiries = [
      {
        listingId: calculusItem._id,
        listingTitle: calculusItem.title,
        sellerId: calculusItem.seller.id,
        buyerName: "Kabir Mehta",
        buyerEmail: "kabir.m@campus.edu",
        buyerPhone: "+91 98450 11223",
        message: "Hi Aarav! Is Stewart Calculus still available? Can we meet at the Central Library today around 4 PM?",
        offerPrice: 400,
        status: "Pending",
        sellerReply: "",
      },
      {
        listingId: calculusItem._id,
        listingTitle: calculusItem.title,
        sellerId: calculusItem.seller.id,
        buyerName: "Simran Kaur",
        buyerEmail: "simran.k@campus.edu",
        buyerPhone: "+91 97123 44556",
        message: "Would you take 380? I can pick it up from your hostel directly.",
        offerPrice: 380,
        status: "Accepted",
        sellerReply: "Sure Simran, 380 works! Message me on WhatsApp to coordinate pickup.",
      },
      {
        listingId: casioItem._id,
        listingTitle: casioItem.title,
        sellerId: casioItem.seller.id,
        buyerName: "Priya Patel",
        buyerEmail: "priya.patel@campus.edu",
        buyerPhone: "+91 98111 22334",
        message: "Hi! I need this scientific calculator for midterms next week. Can you do ₹750? Can meet at South Campus cafeteria.",
        offerPrice: 750,
        status: "Accepted",
        sellerReply: "Done Priya! ₹750 is good. Let's meet tomorrow 1:30 PM outside South Campus Student Center.",
      },
      {
        listingId: chairItem._id,
        listingTitle: chairItem.title,
        sellerId: chairItem.seller.id,
        buyerName: "Priya Patel",
        buyerEmail: "priya.patel@campus.edu",
        buyerPhone: "+91 98111 22334",
        message: "Interested in the study chair! Does the hydraulic height adjustment work smoothly?",
        offerPrice: 1200,
        status: "Pending",
        sellerReply: "",
      },
      {
        listingId: keyboardItem._id,
        listingTitle: keyboardItem.title,
        sellerId: keyboardItem.seller.id,
        buyerName: "Rohan Verma",
        buyerEmail: "rohan.verma@campus.edu",
        buyerPhone: "+91 97234 56789",
        message: "Would you do ₹1,100 for the Logitech keyboard? I can pick it up from Boys Hostel 4 anytime tonight.",
        offerPrice: 1100,
        status: "Pending",
        sellerReply: "",
      },
    ];

    await Enquiry.insertMany(sampleEnquiries);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with realistic student marketplace data!",
      count: createdListings.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
