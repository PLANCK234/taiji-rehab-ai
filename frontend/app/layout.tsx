import type { Metadata, Viewport } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: { default: "太极康复研究平台", template: "%s · 太极康复研究平台" },
  description: "面向研究人员的太极拳康复分级评估与科研数据平台（合成数据演示）",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f6b5a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
