import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the site URL for redirects and callbacks.
 * Uses NEXT_PUBLIC_SITE_URL environment variable.
 * This MUST be set in production to the correct domain.
 */
export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!siteUrl) {
    console.error("NEXT_PUBLIC_SITE_URL is not set! Email links will be broken.");
    // Return empty string - this will cause obvious failures rather than wrong redirects
    return "";
  }
  
  // Remove trailing slash if present
  return siteUrl.replace(/\/$/, "");
}
