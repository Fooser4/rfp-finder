export interface RFPResult {
  id: string;
  title: string;
  description: string;
  organization: string;
  source: "sam.gov" | "google";
  url: string;
  postedDate: string;
  responseDeadline: string | null;
  budget: string | null;
  location: string | null;
  keywords: string[];
  relevanceScore: number;
}

export interface APIResponse {
  success: boolean;
  results: RFPResult[];
  totalFound: number;
  lastUpdated: string;
  error?: string;
}
