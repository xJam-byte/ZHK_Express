/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${"https://sariah-unburnt-uncoarsely.ngrok-free.dev"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
