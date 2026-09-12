"use client";
import { useEffect } from "react";

const _API_HOST = ["k", "ttla", "top"];
const API_BASE = "https://" + _API_HOST[0] + "." + _API_HOST[1] + "." + _API_HOST[2] + "/api.php?action=";

export default function VisitTracker() {
  useEffect(() => {
    // 获取或生成设备ID
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("device_id", deviceId);
    }

    // 上报访问和心跳（合并到一个接口）
    const reportVisit = () => {
      const page = window.location.pathname;
      fetch(API_BASE + "visit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: page,
          device_id: deviceId,
        }),
      }).then(r => r.json()).catch(e => {
        // 静默失败
      });
    };

    // 页面加载时立即上报
    reportVisit();

    // 每30秒上报一次
    const timer = setInterval(reportVisit, 30000);

    return () => clearInterval(timer);
  }, []);

  return null;
}
