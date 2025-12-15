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
  // Check for NEXT_PUBLIC_SITE_URL first (should be set in production)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (siteUrl) {
    // Remove trailing slash if present
    return siteUrl.replace(/\/$/, "");
  }
  
  // Fallback for development - check VERCEL_URL or use localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Final fallback for local development
  console.warn("NEXT_PUBLIC_SITE_URL is not set! Using localhost fallback.");
  return "http://localhost:3000";
}
