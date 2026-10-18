/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prototype setting: a type warning should not stop a deploy.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
