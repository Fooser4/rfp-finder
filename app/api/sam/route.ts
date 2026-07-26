import { NextResponse } from "next/server";
import { fetchSamOpportunities } from "@/lib/sam-gov";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await fetchSamOpportunities();
  return NextResponse.json({ success: true, results, count: results.length });
}
