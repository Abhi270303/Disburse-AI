/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AI_ENDPOINT: process.env.AI_ENDPOINT,
  },
  images: {
    domains: ["pbs.twimg.com"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
