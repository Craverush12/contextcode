"use client";

import PromptCard from "./PromptCard";

export default function TrendingCarousel({ prompts = [] }) {
  if (!prompts.length) return null;

  return (
    <section className="space-y-4 mb-8">
      <h2 className="text-lg font-semibold">Trending Prompts</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {prompts.map((p) => (
          <div key={p.id} className="min-w-[260px] flex-shrink-0">
            <PromptCard prompt={p} />
          </div>
        ))}
      </div>
    </section>
  );
}