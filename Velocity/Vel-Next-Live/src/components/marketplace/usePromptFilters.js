"use client";

import { useMemo, useState } from "react";

/**
 * usePromptFilters manages search, category/model filters and sorting.
 * @param {Array} prompts Raw prompt array coming from API
 */
export default function usePromptFilters(prompts = []) {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [sort, setSort] = useState("Trending");

  // convenient togglers
  const toggleCategory = (cat) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const toggleModel = (model) =>
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedModels([]);
  };

  const filteredPrompts = useMemo(() => {
    let result = prompts;

    // text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // categories
    if (selectedCategories.length) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    // models
    if (selectedModels.length) {
      result = result.filter((p) => selectedModels.includes(p.model));
    }

    // sorting
    const sorted = [...result];
    switch (sort) {
      case "Newest":
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "Most Used":
        sorted.sort((a, b) => b.uses - a.uses);
        break;
      case "Trending":
      default:
        sorted.sort((a, b) => b.trendingScore - a.trendingScore);
        break;
    }
    return sorted;
  }, [prompts, search, selectedCategories, selectedModels, sort]);

  return {
    search,
    setSearch,
    selectedCategories,
    selectedModels,
    sort,
    setSort,
    toggleCategory,
    toggleModel,
    clearFilters,
    filteredPrompts,
  };
}