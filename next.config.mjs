/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // fal.ai ve Google Drive ciktilari icin uzak gorsel/video kaynaklarina izin ver
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
      { protocol: "https", hostname: "fal.media" },
    ],
  },
};

export default nextConfig;
