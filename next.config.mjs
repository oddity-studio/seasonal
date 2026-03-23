/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};

export default nextConfig;
