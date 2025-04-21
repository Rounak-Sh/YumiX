import React from "react";

// Simple skeleton loader for buttons, cards, etc.
export const SkeletonLoader = ({
  size = "medium",
  center = true,
  type = "simple",
}) => {
  // Size variants
  const skeletonSizes = {
    small: "scale-75",
    medium: "scale-100",
    large: "scale-125",
  };

  // Card skeleton (image + text)
  if (type === "card") {
    return (
      <div className={`${center ? "flex justify-center" : ""}`}>
        <div className={`flex flex-row gap-2 ${skeletonSizes[size]}`}>
          <div className="animate-pulse bg-black/20 w-14 h-14 rounded-lg"></div>
          <div className="flex flex-col gap-2">
            <div className="animate-pulse bg-black/20 w-28 h-5 rounded-lg"></div>
            <div className="animate-pulse bg-black/15 w-36 h-3 rounded-lg"></div>
            <div className="animate-pulse bg-black/10 w-36 h-2 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Row skeleton (for tables)
  if (type === "row") {
    return (
      <div className={`${center ? "mx-auto" : ""} w-full`}>
        <div className={`flex items-center gap-4 ${skeletonSizes[size]}`}>
          <div className="animate-pulse bg-black/20 w-10 h-10 rounded-full"></div>
          <div className="animate-pulse bg-black/15 w-1/4 h-4 rounded-lg"></div>
          <div className="animate-pulse bg-black/15 w-1/3 h-4 rounded-lg"></div>
          <div className="animate-pulse bg-black/10 w-1/5 h-4 rounded-lg"></div>
          <div className="animate-pulse bg-black/10 w-16 h-6 rounded-lg ml-auto"></div>
        </div>
      </div>
    );
  }

  // Simple skeleton (just a bar)
  return (
    <div className={`${center ? "flex justify-center" : ""}`}>
      <div
        className={`animate-pulse bg-black/20 w-24 h-6 rounded-full ${skeletonSizes[size]}`}></div>
    </div>
  );
};

// Main page loader component
export default function Loader({ type = "default" }) {
  // For table loading
  if (type === "table") {
    return (
      <div className="space-y-4 p-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="animate-pulse bg-black/20 w-48 h-8 rounded-lg mb-2"></div>
            <div className="animate-pulse bg-black/15 w-64 h-4 rounded-lg"></div>
          </div>
          <div className="animate-pulse bg-black/20 w-32 h-10 rounded-lg"></div>
        </div>

        {/* Table header skeleton */}
        <div className="animate-pulse bg-black/25 w-[95%] h-12 rounded-xl mb-4"></div>

        {/* Table rows */}
        <div className="animate-pulse bg-black/10 w-full rounded-xl p-4">
          <div className="space-y-4">
            {[...Array(6)].map((_, index) => (
              <SkeletonLoader key={index} type="row" center={false} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // For card grid loading
  if (type === "grid") {
    return (
      <div className="space-y-6 p-4">
        {/* Header skeleton */}
        <div>
          <div className="animate-pulse bg-black/20 w-48 h-8 rounded-lg mb-2"></div>
          <div className="animate-pulse bg-black/15 w-64 h-4 rounded-lg"></div>
        </div>

        {/* Grid of cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-black/10 rounded-xl p-4 h-48">
              <div className="animate-pulse bg-black/15 w-full h-24 rounded-lg mb-3"></div>
              <div className="animate-pulse bg-black/20 w-3/4 h-5 rounded-lg mb-2"></div>
              <div className="animate-pulse bg-black/15 w-1/2 h-4 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default loading (dashboard-like)
  if (type === "dashboard") {
    return (
      <div className="space-y-8 p-4">
        {/* Header skeleton */}
        <div className="animate-pulse bg-black/20 w-48 h-8 rounded-lg"></div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-black/10 rounded-xl p-6 h-28">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="animate-pulse bg-black/15 w-20 h-4 rounded-lg"></div>
                  <div className="animate-pulse bg-black/20 w-16 h-7 rounded-lg"></div>
                </div>
                <div className="animate-pulse bg-black/15 w-12 h-12 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-black/10 rounded-xl p-4 h-64">
              <div className="animate-pulse bg-black/15 w-40 h-6 rounded-lg mb-4"></div>
              <div className="animate-pulse bg-black/15 w-full h-40 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple spinner (fallback)
  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
