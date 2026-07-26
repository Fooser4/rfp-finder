import { RFPResult } from "./types";
import { RFP_KEYWORDS, QUALIFYING_KEYWORDS, SAM_NAICS_CODES } from "./config";

const SAM_API_BASE = "https://api.sam.gov/opportunities/v2/search";

interface SamOpportunity {
  noticeId: string;
  title: string;
  description?: string;
  organizationName?: string;
  fullParentPathName?: string;
  postedDate: string;
  responseDeadLine?: string;
  uiLink: string;
  placeOfPerformance?: {
    city?: { name?: string };
    state?: { name?: string };
  };
  naicsCode?: string;
  type?: string;
  award?: { amount?: number | string };
  estimatedValue?: string;
}

export async function fetchSamOpportunities(): Promise<RFPResult[]> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    console.error("SAM_GOV_API_KEY not set");
    return [];
  }

  const allResults: RFPResult[] = [];

  for (const keyword of RFP_KEYWORDS) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: keyword,
        limit: "25",
        postedFrom: getDateWeeksAgo(4),
        postedTo: getTodayDate(),
        ptype: "p,o,k",
      });

      const response = await fetch(`${SAM_API_BASE}?${params.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      const opportunities: SamOpportunity[] = data.opportunitiesData || data.opportunities || [];

      for (const opp of opportunities) {
        if (isRelevantOpportunity(opp)) {
          allResults.push(transformSamResult(opp));
        }
      }
    } catch (error) {
      console.error(`Error fetching SAM.gov for "${keyword}":`, error);
    }
  }

  for (const naics of SAM_NAICS_CODES) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        ncode: naics,
        limit: "10",
        postedFrom: getDateWeeksAgo(4),
        postedTo: getTodayDate(),
        ptype: "p,o,k",
      });

      const response = await fetch(`${SAM_API_BASE}?${params.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      const opportunities: SamOpportunity[] = data.opportunitiesData || data.opportunities || [];

      for (const opp of opportunities) {
        if (isRelevantOpportunity(opp)) {
          allResults.push(transformSamResult(opp));
        }
      }
    } catch (error) {
      console.error(`Error fetching SAM.gov NAICS ${naics}:`, error);
    }
  }

  return deduplicateResults(allResults);
}

function isRelevantOpportunity(opp: SamOpportunity): boolean {
  const text = `${opp.title} ${opp.description || ""}`.toLowerCase();
  return QUALIFYING_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function transformSamResult(opp: SamOpportunity): RFPResult {
  const text = `${opp.title} ${opp.description || ""}`.toLowerCase();
  const matchedKeywords = QUALIFYING_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));

  const location = opp.placeOfPerformance
    ? [opp.placeOfPerformance.city?.name, opp.placeOfPerformance.state?.name]
        .filter(Boolean).join(", ") || null
    : null;

  return {
    id: `sam-${opp.noticeId}`,
    title: opp.title,
    description: opp.description?.substring(0, 300) || "No description available",
    organization: opp.organizationName || opp.fullParentPathName || "Federal Agency",
    source: "sam.gov",
    url: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
    postedDate: opp.postedDate,
    responseDeadline: opp.responseDeadLine || null,
    budget: extractBudget(opp),
    location,
    keywords: matchedKeywords,
    relevanceScore: calculateRelevanceScore(matchedKeywords, opp),
  };
}

function calculateRelevanceScore(matchedKeywords: string[], opp: SamOpportunity): number {
  let score = Math.min(matchedKeywords.length * 15, 60);
  const title = opp.title.toLowerCase();
  if (RFP_KEYWORDS.some((kw) => title.includes(kw.toLowerCase()))) score += 20;
  const daysOld = getDaysOld(opp.postedDate);
  if (daysOld <= 7) score += 20;
  else if (daysOld <= 14) score += 15;
  else if (daysOld <= 21) score += 10;
  else score += 5;
  return Math.min(score, 100);
}

function extractBudget(opp: SamOpportunity): string | null {
  if (opp.award?.amount) {
    const formatted = formatCurrency(Number(opp.award.amount));
    if (formatted) return formatted;
  }
  if (opp.estimatedValue) {
    const formatted = formatCurrency(Number(opp.estimatedValue));
    if (formatted) return formatted;
  }
  if (opp.description) {
    const match = opp.description.match(/\$[\d,]+(?:\.\d{2})?(?:\s*(?:to|-)\s*\$[\d,]+(?:\.\d{2})?)?/);
    if (match) return match[0];
  }
  return null;
}

function formatCurrency(amount: number): string | null {
  if (isNaN(amount) || amount === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function getDaysOld(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getDateWeeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().split("T")[0].replace(/-/g, "/");
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0].replace(/-/g, "/");
}

function deduplicateResults(results: RFPResult[]): RFPResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
