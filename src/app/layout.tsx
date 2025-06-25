import "antd/dist/reset.css";
import React from "react";

export const metadata = {
  title: "广东高考分数线动态图表",
  description: "2021-2025年广东高考录取最低分数线可视化与分数匹配"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#f5f6fa" }}>{children}</body>
    </html>
  );
}
