"use client";

import PromptCard from "./PromptCard";

export default function PromptGrid({ prompts = [] }) {
  if (!prompts.length) {
    return (
      <p className="text-center text-muted-foreground py-10">
        No prompts match the current filters.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {prompts.map((p) => (
        <PromptCard key={p.id} prompt={p} />
      ))}
    </div>
  );
}