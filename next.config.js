/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: process.env.STATIC_ASSET_PREFIX || ""
};

module.exports = nextConfig;
