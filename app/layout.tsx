import type { Metadata } from "next";
import "./globals.css";
import "./folio.css";
export const metadata: Metadata = {
  title: "在场证明 · 私人回忆相册",
  description: "用照片与手记收藏生活。",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
