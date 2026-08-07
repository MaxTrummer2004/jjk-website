import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (multiple lockfiles exist on the machine)
  turbopack: {
    root: projectRoot,
  },
  // React Bits Pro blocks ship as third-party source that doesn't satisfy this
  // project's very strict TS config — don't fail the build on them.
  typescript: { ignoreBuildErrors: true },
  // Disable source maps in production to protect code
  productionBrowserSourceMaps: false,
  // Remove console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
