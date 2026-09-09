# 我的药盒 - 个人药品记录网站 v2.0

一款轻量化的个人药品管理工具，帮你记录家里的常备药，再也不用担心"看到药想不起来治什么"。

基于 Next.js 14 构建，纯前端静态导出，可部署到 GitHub Pages。

## 功能特性

- 📷 **拍照存药**：拍照上传药品图片，自动压缩优化
- 🔍 **智能搜索**：按药名、功效、标签关键词搜索
- ✨ **AI 关键词**：输入症状自动生成搜索关键词
- 📸 **以图搜药**：上传图片搜索相似药品
- 🏷️ **分类管理**：OTC/处方药/保健品/外用药分类
- ⏰ **过期提醒**：自动识别过期和即将过期药品
- 🔒 **密码保护**：SHA-256 加密验证，保护隐私
- 📱 **响应式设计**：手机电脑自适应，移动端优先

## 技术栈

- Next.js 14 (App Router)
- React 18
- 纯前端静态导出 (output: 'export')
- Tesseract.js (纯前端 OCR 识别)
- localStorage 本地存储
- 全部 SVG 图标

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
# 输出在 out/ 目录，可部署到 GitHub Pages
```

## 项目结构

```
medbox-next/
├── app/
│   ├── page.js          # 主页面
│   ├── layout.js        # 布局
│   └── globals.css      # 全局样式
├── components/
│   └── Icons.jsx        # SVG 图标组件
├── lib/
│   ├── storage.js       # 本地存储
│   ├── medicineDB.js    # 药品知识库
│   ├── ocr.js           # OCR 识别
│   ├── imageUtils.js    # 图片处理
│   └── keywords.js      # 关键词生成
├── public/
│   └── CNAME            # 自定义域名
├── .github/workflows/
│   └── deploy.yml       # GitHub Actions 部署
└── package.json
```

## License

MIT

## 更新日志

- v2.1: 强化移动端防缩放防横向拖动，修复 iOS 输入框聚焦自动缩放问题
