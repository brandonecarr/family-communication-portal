import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the site URL for redirects and callbacks.
 * Uses NEXT_PUBLIC_SITE_URL if available, otherwise falls back to window.location.origin on client.
 */
export function getSiteUrl(): string {
  // Server-side: use environment variable
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || "";
  }
  // Client-side: prefer env var, fallback to window.location.origin
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}
