import { NextResponse } from "next/server";
import { fetchSamOpportunities } from "@/lib/sam-gov";
import { fetchGoogleResults } from "@/lib/google-search";
import { RFPResult, APIResponse } from "@/lib/types";
import { MAX_RESULTS } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [samResults, googleResults] = await Promise.all([
      fetchSamOpportunities(),
      fetchGoogleResults(),
    ]);

    let allResults: RFPResult[] = [...samResults, ...googleResults];
    allResults = deduplicateAcrossSources(allResults);
    allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topResults = allResults.slice(0, MAX_RESULTS);

    const response: APIResponse = {
      success: true,
      results: topResults,
      totalFound: allResults.length,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      results: [],
      totalFound: 0,
      lastUpdated: new Date().toISOString(),
      error: "Failed to fetch RFP data.",
    }, { status: 500 });
  }
}

function deduplicateAcrossSources(results: RFPResult[]): RFPResult[] {
  const unique: RFPResult[] = [];
  const titles: string[] = [];
  for (const result of results) {
    const normalized = result.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    let isDuplicate = false;
    for (let i = 0; i < titles.length; i++) {
      if (titles[i].includes(normalized) || normalized.includes(titles[i])) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      titles.push(normalized);
      unique.push(result);
    }
  }
  return unique;
}
