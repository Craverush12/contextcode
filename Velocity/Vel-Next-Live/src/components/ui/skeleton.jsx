// for tsx

import React from 'react';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded-md ${className}`}
      {...props}
    />
  );
};

export const SkeletonCircle = ({ size = '50px', ...props }) => {
  return (
    <Skeleton
      className="rounded-full"
      style={{ width: size, height: size }}
      {...props}
    />
  );
};

export const SkeletonText = ({ noOfLines = 3, spacing = '0.5rem', ...props }) => {
  return (
    <div className="flex flex-col space-y-2" style={{ gap: spacing }}>
      {Array(noOfLines)
        .fill('')
        .map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${Math.floor(Math.random() * 50) + 50}%` }}
            {...props}
          />
        ))}
    </div>
  );
};

export default Skeleton;

// for jsx
// Since we can't use TypeScript's cn utility directly, we'll need to implement
// a simple className concatenation helper
const cn = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

// Converting the TypeScript component to JSX:
// 1. Remove type annotations
// 2. Use regular props destructuring
// 3. Keep the same core functionality
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-700", className)}
      {...props}
    />
  );
}

export { Skeleton };
