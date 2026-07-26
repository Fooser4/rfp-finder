import { RFPResult } from "./types";
import { GOOGLE_SEARCH_QUERIES, QUALIFYING_KEYWORDS, RFP_KEYWORDS } from "./config";

const GOOGLE_API_BASE = "https://www.googleapis.com/customsearch/v1";

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: { metatags?: Array<{ "og:site_name"?: string }> };
}

export async function fetchGoogleResults(): Promise<RFPResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.error("GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID not set");
    return [];
  }

  const allResults: RFPResult[] = [];

  for (const query of GOOGLE_SEARCH_QUERIES) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: "10",
        dateRestrict: "m1",
        sort: "date",
      });

      const response = await fetch(`${GOOGLE_API_BASE}?${params.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      const items: GoogleSearchResult[] = data.items || [];

      for (const item of items) {
        if (isRelevantGoogleResult(item)) {
          allResults.push(transformGoogleResult(item));
        }
      }
    } catch (error) {
      console.error(`Error in Google search:`, error);
    }
  }

  return deduplicateResults(allResults);
}

function isRelevantGoogleResult(item: GoogleSearchResult): boolean {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const rfpIndicators = ["rfp", "request for proposal", "solicitation", "bid"];
  const hasRFP = rfpIndicators.some((ind) => text.includes(ind));
  const hasKeyword = QUALIFYING_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
  return hasRFP && hasKeyword;
}

function transformGoogleResult(item: GoogleSearchResult): RFPResult {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const matchedKeywords = QUALIFYING_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));

  return {
    id: `google-${hashString(item.link)}`,
    title: item.title.replace(/\s*[\|–-]\s*(?:PDF|Download).*$/i, "").trim(),
    description: item.snippet || "No description available",
    organization: extractOrganization(item),
    source: "google",
    url: item.link,
    postedDate: new Date().toISOString().split("T")[0],
    responseDeadline: extractDeadline(item.snippet),
    budget: extractBudget(item.snippet),
    location: extractLocation(item),
    keywords: matchedKeywords,
    relevanceScore: calculateScore(item, matchedKeywords),
  };
}

function calculateScore(item: GoogleSearchResult, matchedKeywords: string[]): number {
  let score = Math.min(matchedKeywords.length * 10, 40);
  if (RFP_KEYWORDS.some((kw) => item.title.toLowerCase().includes(kw.toLowerCase()))) score += 20;
  if (item.link.includes(".gov") || item.link.includes(".edu")) score += 20;
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  if (text.includes("deadline") || text.includes("due date")) score += 10;
  if (item.link.endsWith(".pdf")) score += 10;
  return Math.min(score, 100);
}

function extractOrganization(item: GoogleSearchResult): string {
  const siteName = item.pagemap?.metatags?.[0]?.["og:site_name"];
  if (siteName) return siteName;
  try {
    const hostname = new URL(item.link).hostname.replace("www.", "");
    if (hostname.endsWith(".gov")) return hostname.replace(".gov", "").split(".").pop()?.toUpperCase() + " (Gov)";
    if (hostname.endsWith(".edu")) return hostname.replace(".edu", "").split(".").pop() + " (University)";
    return hostname;
  } catch { return "Unknown"; }
}

function extractLocation(item: GoogleSearchResult): string | null {
  const statePattern = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
  const match = item.snippet?.match(statePattern);
  return match ? match[1] : null;
}

function extractBudget(snippet: string): string | null {
  if (!snippet) return null;
  const patterns = [
    /\$[\d,]+(?:\.\d{2})?\s*(?:to|-)\s*\$[\d,]+(?:\.\d{2})?/i,
    /budget[:\s]*\$[\d,]+(?:\.\d{2})?/i,
    /(?:not to exceed|up to|maximum|estimated)\s*\$[\d,]+(?:\.\d{2})?/i,
    /\$[\d,]{4,}(?:\.\d{2})?/,
  ];
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function extractDeadline(snippet: string): string | null {
  if (!snippet) return null;
  const patterns = [
    /(?:deadline|due|closes?|submit by)[:\s]*(\w+ \d{1,2},?\s*\d{4})/i,
    /(?:deadline|due|closes?|submit by)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function deduplicateResults(results: RFPResult[]): RFPResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}
