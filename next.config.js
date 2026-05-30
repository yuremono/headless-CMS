/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/sites/:siteId/developer',
        destination: '/sites/:siteId/contents/topPage',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
