"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function PromptCard({ prompt }) {
  const {
    title,
    description,
    previewUrl,
    tags = [],
    premium = false,
  } = prompt;

  return (
    <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow">
      {premium && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 z-10 flex items-center gap-1"
        >
          <Lock className="h-3 w-3" /> Premium
        </Badge>
      )}

      {/* Preview */}
      {previewUrl ? (
        <div className="relative h-40 w-full">
          <Image
            src={previewUrl}
            alt={title}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-40 w-full bg-muted" />
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm leading-tight truncate">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground overflow-hidden overflow-ellipsis whitespace-nowrap max-w-full">
          {description}
        </p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}