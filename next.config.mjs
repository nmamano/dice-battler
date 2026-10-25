/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static files only (out/): the shared VPS serves them from its Caddy, with no Next server.
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
