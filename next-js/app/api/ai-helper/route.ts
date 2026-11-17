import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { action, title, category, condition, details } = await req.json();

    if (action === "suggest-category") {
      const lower = (title || "").toLowerCase();
      let suggested = "Other";

      if (
        lower.includes("book") ||
        lower.includes("calculus") ||
        lower.includes("physics") ||
        lower.includes("edition") ||
        lower.includes("novel") ||
        lower.includes("guide") ||
        lower.includes("gate") ||
        lower.includes("textbook")
      ) {
        suggested = "Books";
      } else if (
        lower.includes("calculator") ||
        lower.includes("laptop") ||
        lower.includes("keyboard") ||
        lower.includes("mouse") ||
        lower.includes("monitor") ||
        lower.includes("charger") ||
        lower.includes("headphones") ||
        lower.includes("earbuds") ||
        lower.includes("phone") ||
        lower.includes("tablet") ||
        lower.includes("ipad") ||
        lower.includes("pi")
      ) {
        suggested = "Electronics";
      } else if (
        lower.includes("chair") ||
        lower.includes("table") ||
        lower.includes("desk") ||
        lower.includes("lamp") ||
        lower.includes("mattress") ||
        lower.includes("shelf") ||
        lower.includes("rack") ||
        lower.includes("cushion")
      ) {
        suggested = "Furniture";
      } else if (
        lower.includes("pen") ||
        lower.includes("drafter") ||
        lower.includes("coat") ||
        lower.includes("notebook") ||
        lower.includes("paper") ||
        lower.includes("scale") ||
        lower.includes("files") ||
        lower.includes("binder")
      ) {
        suggested = "Stationery";
      }

      return NextResponse.json({ success: true, suggestedCategory: suggested });
    }

    if (action === "generate-description") {
      const itemName = title || "Used student item";
      const itemCat = category || "item";
      const itemCond = condition || "Good";
      const extra = details ? ` Additional notes: ${details}.` : "";

      const descriptions = [
        `Up for grabs is my ${itemName} in ${itemCond.toLowerCase()} condition. Gently used throughout the semester and taken good care of. Perfect for campus students looking for an affordable study essential without breaking the bank.${extra} Available for quick handover near campus dorms or the central library!`,
        `Selling my ${itemName} (${itemCond} condition). Everything works as expected and it is ready to use immediately. Ideal for college coursework and hostel living.${extra} Price is negotiable for serious buyers. Feel free to send an offer or enquire!`,
        `Student-to-student deal: ${itemName}. In ${itemCond.toLowerCase()} shape, served me really well this academic year. Selling because I am clearing out semester supplies.${extra} Can coordinate pickup at student center or WhatsApp me directly.`,
      ];

      const randomIndex = Math.floor(Math.random() * descriptions.length);
      return NextResponse.json({
        success: true,
        generatedDescription: descriptions[randomIndex],
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("AI Helper error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
