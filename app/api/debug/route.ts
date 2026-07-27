import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const samKey = process.env.SAM_GOV_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const searchId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // Test SAM.gov with date params
  let samStatus = "unknown";
  let samData: any = null;
  try {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0].replace(/-/g, "/");
    const params = new URLSearchParams({
      api_key: samKey || "",
      q: "design",
      limit: "10",
      postedFrom: fourWeeksAgo,
      postedTo: today,
      ptype: "p,o,k",
    });
    const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params.toString()}`);
    samStatus = `${res.status} ${res.statusText}`;
    samData = await res.json();
  } catch (e: any) {
    samStatus = `Error: ${e.message}`;
  }

  // Test Google
  let googleStatus = "unknown";
  let googleData: any = null;
  try {
    const params = new URLSearchParams({
      key: googleKey || "",
      cx: searchId || "",
      q: "RFP branding",
      num: "3",
    });
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    googleStatus = `${res.status} ${res.statusText}`;
    googleData = await res.json();
  } catch (e: any) {
    googleStatus = `Error: ${e.message}`;
  }

  return NextResponse.json({
    envCheck: {
      samKeySet: !!samKey,
      samKeyPrefix: samKey?.substring(0, 8) || "NOT SET",
      googleKeySet: !!googleKey,
      googleKeyPrefix: googleKey?.substring(0, 10) || "NOT SET",
      searchIdSet: !!searchId,
      searchIdValue: searchId || "NOT SET",
    },
    sam: {
      status: samStatus,
      totalRecords: samData?.totalRecords || 0,
      resultCount: samData?.opportunitiesData?.length || 0,
      firstFewTitles: samData?.opportunitiesData?.slice(0, 3).map((o: any) => o.title) || [],
    },
    google: {
      status: googleStatus,
      resultCount: googleData?.items?.length || 0,
      error: googleData?.error || null,
    },
  });
}
