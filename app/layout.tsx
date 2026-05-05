import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kite",
  description: "轻量项目管理系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
