import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const samKey = process.env.SAM_GOV_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const searchId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // Test SAM.gov
  let samStatus = "unknown";
  let samData: any = null;
  try {
    const params = new URLSearchParams({
      api_key: samKey || "",
      q: "branding",
      limit: "5",
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
      searchIdSet: !!searchId,
    },
    sam: { status: samStatus, resultCount: samData?.opportunitiesData?.length || samData?.totalRecords || 0, raw: samData },
    google: { status: googleStatus, resultCount: googleData?.items?.length || 0, error: googleData?.error || null },
  });
}
