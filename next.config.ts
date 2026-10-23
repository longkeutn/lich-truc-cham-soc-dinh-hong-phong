import type { NextConfig } from "next";

const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_ID ||
  'v2.2-build';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
};

export default nextConfig;
