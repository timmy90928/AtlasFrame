import type { Metadata } from "next";
import { SessionBridge } from "@/components/auth/session-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtlasFrame — Every frame has a place.",
  description: "地圖式攝影旅程社群。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body><SessionBridge />{children}</body></html>;
}
