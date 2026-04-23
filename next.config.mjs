const basePath = process.env.PAGES_BASE_PATH === "true" ? "/seasonal" : "";
const isExport = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  ...(!isExport && {
    rewrites: async () => [
      {
        source: "/api/rss/:feed",
        destination: "https://www.audeobox.com/api/feeds/:feed.xml",
      },
    ],
  }),
};

export default nextConfig;
