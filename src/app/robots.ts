import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cocina", "/cocina-login", "/hola", "/api/"],
    },
    sitemap: "https://www.casadeleyva.com/sitemap.xml",
  };
}
