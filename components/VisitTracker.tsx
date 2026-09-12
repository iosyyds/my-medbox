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

    // 获取当前页面路径
    const page = window.location.pathname;

    // 上报访问记录
    const reportVisit = () => {
      fetch(API_BASE + "visit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: page,
          device_id: deviceId,
        }),
      }).catch(() => {});
    };

    // 页面加载时上报
    reportVisit();

    // 每30秒心跳一次，更新在线状态
    const heartbeat = setInterval(() => {
      fetch(API_BASE + "online/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
        }),
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(heartbeat);
  }, []);

  return null;
}
