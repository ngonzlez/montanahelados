import localFont from "next/font/local";

export const display = localFont({
  src: "./bagel-fat-one.woff2",
  weight: "400",
  display: "swap",
  variable: "--display",
});

export const texto = localFont({
  src: [
    { path: "./nunito-600.woff2", weight: "600" },
    { path: "./nunito-700.woff2", weight: "700" },
    { path: "./nunito-800.woff2", weight: "800" },
  ],
  display: "swap",
  variable: "--texto",
});
