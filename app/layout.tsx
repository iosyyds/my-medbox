import type { Metadata } from "next";
import UserStatusMonitor from "../components/UserStatusMonitor";
import WechatTip from "../components/WechatTip";
import VisitTracker from "../components/VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "情侣游戏 - 情侣互动小游戏合集",
  description: "情侣互动小游戏合集，包含情侣飞行棋、真心话大冒险、情趣骰子等多种情侣游戏",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <WechatTip />
        <UserStatusMonitor />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
