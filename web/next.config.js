/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  output: 'export',
  // Expose remote forensic engine URL to client bundle.
  // Set NEXT_PUBLIC_FORENSIC_API_URL in Vercel environment variables.
  env: {
    NEXT_PUBLIC_FORENSIC_API_URL: process.env.NEXT_PUBLIC_FORENSIC_API_URL ?? '',
  },
}

module.exports = nextConfig
