"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

export function PWAClient({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      {children}
    </SerwistProvider>
  );
}
