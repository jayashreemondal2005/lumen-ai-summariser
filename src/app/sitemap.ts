import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { HELP_ARTICLES } from "@/lib/help-center";
import { LEGAL_DOCS } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date("2026-11-18");
  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/help`, lastModified: now, priority: 0.7 },
    { url: `${base}/support`, lastModified: now, priority: 0.5 },
    ...HELP_ARTICLES.map((a) => ({ url: `${base}/help/${a.slug}`, lastModified: now, priority: 0.5 })),
    ...LEGAL_DOCS.map((d) => ({ url: `${base}/legal/${d.slug}`, lastModified: now, priority: 0.3 })),
  ];
}
