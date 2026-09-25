import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {"/programme-partenaire/conditions/*": ["./content/partner/conditions/CONDITIONS_PROGRAMME_2026-09-09.3.html","./content/partner/conditions/CONDITIONS_PROGRAMME_2026-09-12.1.html"],"/partner/ressources/*": ["./content/partner/activation/*.pdf","./content/partner/activation/*.zip"],"/partner/kit/*": ["./public/fonts/Inter-Regular.ttf","./public/fonts/Genos-Variable.ttf","./public/logo-full.svg"]},
  distDir: process.env.FOREAS_BUILD_DIR || ".next",
};
export default nextConfig;
