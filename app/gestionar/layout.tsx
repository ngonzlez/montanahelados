import type { Metadata } from "next";
import "./panel.css";

export const metadata: Metadata = { title: "Panel · Montana Helados", robots: { index: false, follow: false } };

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return children;
}
