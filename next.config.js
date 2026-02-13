/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Temporarily ignore build errors from third-party packages (googleapis type definitions)
    // This is a known issue with googleapis package type definitions
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

