import './globals.css';

export const metadata = {
  title: '我的药盒 - 个人药品记录',
  description: '一款轻量化的个人药品管理工具，拍照存药、智能搜索、过期提醒，再也不用担心看到药想不起来治什么。',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d9488',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
