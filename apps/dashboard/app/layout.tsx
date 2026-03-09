import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompuShare Provider Dashboard",
  description:
    "Provider dashboard alpha shell backed by live control-plane data.",
};

export default function RootLayout(input: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{input.children}</body>
    </html>
  );
}
