/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side rewrite proxy: /api/* → FastAPI backend.
  // BACKEND_URL is set to the internal container URL in Docker Compose
  // (http://engine:8000) and to the Railway service URL on Cloudflare Pages.
  // The browser never sees BACKEND_URL — it always calls /api/... and the
  // Next.js Edge / dev server forwards it transparently.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Expose Prometheus metrics through the same host (optional, dev-only)
      {
        source: '/metrics',
        destination: `${backendUrl}/metrics`,
      },
    ]
  },
}

export default nextConfig
