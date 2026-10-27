import type { MetadataRoute } from "next";

const BASE = "https://www.casadeleyva.com";

// Public, indexable pages only. /cocina, /cocina-login and /hola are noindex.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/menu", priority: 0.9, changeFrequency: "monthly" },
  { path: "/fiestas", priority: 0.8, changeFrequency: "weekly" },
  { path: "/taco-tuesday", priority: 0.8, changeFrequency: "monthly" },
  { path: "/brunch", priority: 0.8, changeFrequency: "monthly" },
  { path: "/catering", priority: 0.8, changeFrequency: "monthly" },
  { path: "/catering/taco", priority: 0.6, changeFrequency: "monthly" },
  { path: "/catering/social", priority: 0.6, changeFrequency: "monthly" },
  { path: "/catering/tradicion", priority: 0.6, changeFrequency: "monthly" },
  { path: "/catering/leyva-grand", priority: 0.6, changeFrequency: "monthly" },
  { path: "/rewards", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
