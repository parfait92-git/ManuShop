import type { NextConfig } from "next";

import { OPTIMIZABLE_IMAGE_HOSTS } from "./src/lib/imageHosts";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: OPTIMIZABLE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
