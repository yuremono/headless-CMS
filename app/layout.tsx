import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../scss/index.scss";

export const metadata: Metadata = {
  title: "Headless CMS",
  description: "Schema-driven headless CMS foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="PageRoot">{children}</body>
    </html>
  );
}
