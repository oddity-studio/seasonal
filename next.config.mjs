/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("@remotion/renderer");
    return config;
  },
};

export default nextConfig;
