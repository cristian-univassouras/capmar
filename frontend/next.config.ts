import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  htmlLimitedBots: /.*/,
  output: "standalone",
};

export default nextConfig;
