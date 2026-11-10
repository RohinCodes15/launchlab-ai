/**
 * Public base URL for metadata (Open Graph, sitemap). Vercel sets
 * VERCEL_PROJECT_PRODUCTION_URL at build time; SITE_URL overrides it on other hosts.
 */
export const SITE_URL = process.env.SITE_URL
  ? process.env.SITE_URL.replace(/\/$/, "")
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const SITE_DESCRIPTION =
  "A free entrepreneurship learning app for students: shape a startup idea, test assumptions, model the money, and build a pitch. Works offline in your browser.";
