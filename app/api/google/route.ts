import { NextResponse } from "next/server";
import { fetchGoogleResults } from "@/lib/google-search";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await fetchGoogleResults();
  return NextResponse.json({ success: true, results, count: results.length });
}
