import { createSerwistRoute } from "@serwist/turbopack";

const serwistRoute = createSerwistRoute({
  swSrc: "src/sw.ts",
});

export const { GET, generateStaticParams, dynamic, dynamicParams, revalidate } = serwistRoute;
