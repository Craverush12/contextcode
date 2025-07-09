

import { Skeleton } from "./ui/skeleton";
import SkeletonNavbar from "./SkeletonNavbar";

// SkeletonStyleOption represents a loading state for individual style option cards
// Each card contains three skeleton elements representing an icon, title, and description
function SkeletonStyleOption() {
  return (
    <div className="p-4 rounded-lg bg-gray-800 border-2 border-transparent">
      <Skeleton className="h-6 w-6 mb-3" />
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

// SkeletonPromptInput creates a full-page loading state for the prompt input interface
// It includes a navbar, main content area, and multiple style options
function SkeletonPromptInput() {
  return (
    <div className="relative min-h-screen z-10 pointer-events-auto bg-black">
      {/* Animated radial gradient background */}
      <div className="absolute h-full w-full inset-0 bg-[radial-gradient(circle_at_center,_#008ACB_0%,_transparent_40%)] opacity-30 animate-gradient-move" />

      {/* Navigation bar loading state */}
      <SkeletonNavbar />

      {/* Main content container */}
      <div className="flex items-center justify-center px-4 pt-40">
        <main className="container mx-auto px-4 max-w-3xl z-40">
          {/* Header title loading state */}
          <Skeleton className="h-10 w-64 mx-auto mb-8 bg-gray-800" />

          {/* Main prompt input area loading state */}
          <Skeleton className="w-full h-32 rounded-lg mb-6 bg-gray-800" />
          <Skeleton className="h-10 w-64 mx-auto mb-6 bg-gray-800" />

          {/* Grid of style options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[...Array(4)].map((_, index) => (
              <SkeletonStyleOption key={index} />
            ))}
          </div>

          {/* Gradient info box loading state */}
          <div className="mb-4 bg-gradient-to-r from-gray-700 to-blue-950 rounded-lg p-6">
            <Skeleton className="h-4 w-3/4 mx-auto bg-white bg-opacity-50 rounded" />
          </div>

          {/* Bottom CTA button loading state */}
          <div className="text-center">
            <Skeleton className="h-12 w-40 mx-auto rounded-full bg-gray-800" />
          </div>
        </main>
      </div>
    </div>
  );
}

export default SkeletonPromptInput;
