"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Small helper for debouncing value changes
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function FilterBar({
  categories = [],
  models = [],
  search,
  setSearch,
  selectedCategories,
  selectedModels,
  toggleCategory,
  toggleModel,
  sort,
  setSort,
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounced = useDebounce(localSearch, 400);

  // propagate debounced value upwards
  useEffect(() => {
    setSearch(debounced);
  }, [debounced, setSearch]);

  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative max-w-lg mx-auto sm:mx-0">
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full rounded-md bg-muted/20 border border-border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "cursor-pointer select-none whitespace-nowrap",
                selectedCategories.includes(cat) &&
                  "bg-primary text-primary-foreground border-primary"
              )}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Model filter pills */}
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {models.map((m) => (
            <Badge
              key={m}
              variant="outline"
              onClick={() => toggleModel(m)}
              className={cn(
                "cursor-pointer select-none whitespace-nowrap",
                selectedModels.includes(m) &&
                  "bg-primary text-primary-foreground border-primary"
              )}
            >
              {m}
            </Badge>
          ))}
        </div>

        {/* Sort dropdown */}
        <div>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <div className="relative inline-block">
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-md bg-muted/20 border border-border py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option>Trending</option>
              <option>Newest</option>
              <option>Most Used</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}