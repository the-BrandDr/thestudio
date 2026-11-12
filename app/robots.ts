import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/portfolio",
          "/portfolio/*",
          "/services",
          "/pricing",
          "/about",
          "/contact",
          "/icon",
          "/apple-icon",
          "/opengraph-image",
          "/twitter-image",
        ],
        disallow: ["/admin", "/admin/*", "/login", "/api/*"],
      },
    ],
    sitemap: "https://studioslavie.com/sitemap.xml",
    host: "https://studioslavie.com",
  };
}
