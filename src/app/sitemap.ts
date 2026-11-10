import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Project pages are private to each browser, so only the public pages are listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/dashboard", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
