import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Agency Command Center",
  description: "Read-only agency operations",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
