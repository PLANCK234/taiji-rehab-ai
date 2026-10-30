import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "太极康复科研平台 · 工程状态",
  description: "仅用于合成数据开发环境的工程状态页",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
