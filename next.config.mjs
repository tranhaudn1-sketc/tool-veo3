/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "ffmpeg-static"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
