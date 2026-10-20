import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  { ignores: [".next/**", "node_modules/**", "docs/**", "prototipo/**", "drizzle/**", "dist/**", "next-env.d.ts", "eslint.config.mjs", "public/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Las fotos ya se guardan en WebP con el tamaño justo; se usan <img> comunes a propósito.
  { rules: { "@next/next/no-img-element": "off" } },
];
