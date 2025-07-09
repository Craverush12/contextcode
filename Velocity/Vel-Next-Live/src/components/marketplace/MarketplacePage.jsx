"use client";

import { useEffect, useState } from "react";
import FilterBar from "./FilterBar";
import PromptGrid from "./PromptGrid";
import TrendingCarousel from "./TrendingCarousel";
import usePromptFilters from "./usePromptFilters";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplacePage() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch prompts from mock API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        setPrompts(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const {
    search,
    setSearch,
    selectedCategories,
    selectedModels,
    sort,
    setSort,
    toggleCategory,
    toggleModel,
    filteredPrompts,
  } = usePromptFilters(prompts);

  // derive lists for pills
  const categories = Array.from(new Set(prompts.map((p) => p.category)));
  const models = Array.from(new Set(prompts.map((p) => p.model)));

  const trending = [...prompts]
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      {/* FilterBar sticky at top */}
      <FilterBar
        categories={categories}
        models={models}
        search={search}
        setSearch={setSearch}
        selectedCategories={selectedCategories}
        selectedModels={selectedModels}
        toggleCategory={toggleCategory}
        toggleModel={toggleModel}
        sort={sort}
        setSort={setSort}
      />

      <main className="container mx-auto px-4 py-8 flex-1 space-y-10">
        {/* Trending Section */}
        <TrendingCarousel prompts={trending} />

        {/* Prompt Grid */}
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <PromptGrid prompts={filteredPrompts} />
        )}
      </main>
    </div>
  );
}