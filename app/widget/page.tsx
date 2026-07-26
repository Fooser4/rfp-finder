"use client";

import { useState } from "react";
import { RFPResult, APIResponse } from "@/lib/types";

export default function WidgetPage() {
  const [results, setResults] = useState<RFPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const response = await fetch("/api/rfps");
      const data: APIResponse = await response.json();
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || "Failed to load RFPs");
      }
    } catch (err) {
      setError("Unable to connect. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 font-sans">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
          Design &amp; Branding RFPs
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Government, City, State &amp; University opportunities
        </p>
      </header>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Searching..." : "Search for RFPs"}
      </button>

      {loading && (
        <div className="mt-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasSearched && (
        <div className="mt-6">
          {error ? (
            <p className="text-center text-red-400 text-sm py-6">{error}</p>
          ) : results.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">
              No RFPs found at this time. Check back soon.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((rfp, index) => (
                <li key={rfp.id} className="py-4">
                  <a href={rfp.url} target="_blank" rel="noopener noreferrer" className="block group">
                    <div className="flex gap-3">
                      <span className="text-xs text-gray-300 font-mono mt-0.5 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {rfp.title}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rfp.organization}
                          {rfp.location && ` \u00B7 ${rfp.location}`}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-gray-600">Budget:</span>{" "}
                            {rfp.budget || "Not listed"}
                          </span>
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-gray-600">Due:</span>{" "}
                            {rfp.responseDeadline ? (
                              <span className="text-red-500">{rfp.responseDeadline}</span>
                            ) : (
                              "Not listed"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {results.length > 0 && (
            <p className="text-center text-[10px] text-gray-300 mt-6">
              Sources: SAM.gov &amp; Google Custom Search
            </p>
          )}
        </div>
      )}
    </div>
  );
}
