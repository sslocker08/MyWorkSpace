/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // NEXT_PUBLIC_API_URL is set to http://engine:8000 by docker-compose so the
    // proxy reaches the FastAPI service over the Compose network. Falls back to
    // localhost:8000 for running `npm run dev` directly on the host.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
