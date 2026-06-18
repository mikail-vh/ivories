import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow reaching the dev server via the loopback IP as well as localhost, so
   * the client runtime (HMR + hydration) wires up when accessed on 127.0.0.1 —
   * needed because Spotify rejects `http://localhost` redirect URIs but accepts
   * `http://127.0.0.1`. */
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
