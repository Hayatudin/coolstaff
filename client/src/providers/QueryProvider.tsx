'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache query results as fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Keep unused cache data in memory for 30 minutes
            gcTime: 1000 * 60 * 30,
            // Disable aggressive automatic refetching on window focus to save database load
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
            // Refetch on reconnect if user went offline
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
