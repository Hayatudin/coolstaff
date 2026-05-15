'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function TableSkeleton({ rows = 5, cols = 8 }: { rows?: number, cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className={cn(
                "h-4 bg-gray-200 rounded",
                j === 1 ? "w-48" : "w-20", // Make the second col (name) longer
                j === 7 ? "ml-auto" : ""   // Align last col (actions) right
              )} />
              {j === 1 && <div className="h-3 bg-gray-100 rounded w-32 mt-2" />} {/* Subtext for name */}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
