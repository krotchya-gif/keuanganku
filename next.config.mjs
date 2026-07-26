import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSerwist(nextConfig);
