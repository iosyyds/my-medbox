// OCR文字识别工具 - 使用Tesseract.js v5 纯前端识别
// 动态加载CDN，不影响初始加载速度

let tesseractWorker = null;
let loadPromise = null;
let preloadTriggered = false;

const CDN_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const LANGS = 'chi_sim+eng';

// 动态加载Tesseract.js脚本
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }

    const script = document.createElement('script');
    script.src = CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract.js 已加载但未找到全局对象'));
      }
    };
    script.onerror = () => reject(new Error('识别引擎加载失败，请检查网络连接'));
    document.head.appendChild(script);
  });
}

// 初始化 worker
async function initWorker(Tesseract) {
  if (tesseractWorker) return tesseractWorker;

  try {
    tesseractWorker = await Tesseract.createWorker(LANGS, 1, {
      // 不设置白名单，让Tesseract自由识别所有字符
    });
    // 设置识别参数：假设为单一统一的文本块，提升识别率
    try {
      await tesseractWorker.setParameters({
        tessedit_pageseg_mode: '6', // 6 = 假设为单一统一的文本块
        preserve_interword_spaces: '1',
      });
    } catch (e) {
      // 设置参数失败不影响识别
    }
    return tesseractWorker;
  } catch (err) {
    tesseractWorker = null;
    loadPromise = null;
    throw new Error('识别引擎初始化失败：' + (err.message || err));
  }
}

// 加载 Tesseract + worker
async function loadTesseract() {
  if (tesseractWorker) return tesseractWorker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const Tesseract = await loadScript();
    return await initWorker(Tesseract);
  })();

  try {
    const worker = await loadPromise;
    return worker;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

// 预加载 OCR 引擎（在页面空闲时调用，提升首次识别速度）
export function preloadOCR() {
  if (preloadTriggered || tesseractWorker) return;
  preloadTriggered = true;

  const doPreload = () => {
    loadTesseract().catch(() => {
      preloadTriggered = false;
    });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(doPreload, { timeout: 5000 });
  } else {
    setTimeout(doPreload, 2000);
  }
}

/**
 * 预处理图片，增强文字识别效果
 * 改进：放大、增强对比度、二值化、去噪
 */
export function preprocessImage(imageData) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 放大图片：最短边至少 1200px，药品包装文字通常较小
        const minDim = Math.min(img.width, img.height);
        const scale = minDim < 1200 ? Math.max(1.2, 1200 / minDim) : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // 白色背景，处理透明PNG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 图像处理：灰度化 + 强对比度增强 + 二值化 + 去噪
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const w = canvas.width;
          const h = canvas.height;

          // 第一步：灰度化 + 强对比度增强
          const gray = new Uint8ClampedArray(w * h);
          for (let i = 0; i < data.length; i += 4) {
            const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            // 强S型对比度增强，系数1.6
            const enhanced = Math.min(255, Math.max(0, (g - 128) * 1.6 + 128));
            gray[i / 4] = enhanced;
          }

          // 第二步：计算自适应阈值（局部平均）
          // 简化版：使用全局 Otsu 阈值
          let sum = 0, sumB = 0, q1 = 0, max = 0, threshold = 128;
          const hist = new Array(256).fill(0);
          for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
          for (let i = 0; i < 256; i++) sum += i * hist[i];
          for (let i = 0; i < 256; i++) {
            q1 += hist[i];
            if (q1 === 0) continue;
            const q2 = gray.length - q1;
            if (q2 === 0) break;
            sumB += i * hist[i];
            const m1 = sumB / q1;
            const m2 = (sum - sumB) / q2;
            const between = q1 * q2 * (m1 - m2) * (m1 - m2);
            if (between > max) { max = between; threshold = i; }
          }

          // 第三步：二值化 + 中值去噪（3x3窗口）
          const binary = new Uint8ClampedArray(w * h);
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = y * w + x;
              // 简单去噪：检查3x3邻域
              let whiteCount = 0, total = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx, ny = y + dy;
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    total++;
                    if (gray[ny * w + nx] > threshold) whiteCount++;
                  }
                }
              }
              // 中值滤波：如果邻域内大部分是白色，则设为白色
              binary[idx] = (whiteCount > total / 2) ? 255 : 0;
            }
          }

          // 第四步：写回画布
          for (let i = 0; i < data.length; i += 4) {
            const v = binary[i / 4];
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // 图像处理失败，使用灰度化结果
        }

        // 高质量输出
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imageData);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageData;
  });
}

/**
 * 识别图片中的文字
 */
export async function recognizeText(imageData, onProgress) {
  try {
    if (onProgress) onProgress(0.05, '加载识别引擎');
    const worker = await loadTesseract();

    if (onProgress) onProgress(0.25, '正在识别文字');

    const result = await worker.recognize(imageData);
    const text = result?.data?.text || '';

    if (onProgress) onProgress(0.8, '识别完成');
    return text;
  } catch (err) {
    console.error('OCR识别失败:', err);
    if (tesseractWorker) {
      try { await tesseractWorker.terminate(); } catch (e) {}
      tesseractWorker = null;
      loadPromise = null;
    }
    throw new Error('文字识别失败：' + (err.message || err));
  }
}

/**
 * 清洗和验证识别结果
 * 过滤掉无意义的行，返回有意义的文本
 */
export function cleanOcrText(text) {
  if (!text) return { clean: '', quality: 0, lines: [] };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 过滤无意义的行
  const meaningfulLines = lines.filter(line => {
    // 去掉纯数字、纯符号的行
    const cleaned = line.replace(/[\d\s\-\.,;:!?'""()（）【】\[\]{}]/g, '');
    // 至少包含 1 个中文字符或 2 个英文字母
    const hasChinese = /[\u4e00-\u9fa5]/.test(line);
    const hasEnoughLetters = (line.match(/[a-zA-Z]/g) || []).length >= 2;
    return hasChinese || hasEnoughLetters;
  });

  const clean = meaningfulLines.join('\n');

  // 计算识别质量（0-1）
  let quality = 0;
  if (meaningfulLines.length > 0) quality += 0.3;
  if (clean.length > 10) quality += 0.2;
  if (clean.length > 30) quality += 0.2;
  // 中文字符比例
  const chineseCount = (clean.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (chineseCount > 5) quality += 0.3;

  return {
    clean,
    quality: Math.min(1, quality),
    lines: meaningfulLines,
    rawLines: lines,
  };
}

/**
 * 拍照识别药品完整流程
 */
export async function recognizeMedicine(imageData, onProgress) {
  // 1. 预处理
  if (onProgress) onProgress(0.02, '图片预处理');
  let processedImage = imageData;
  try {
    processedImage = await preprocessImage(imageData);
  } catch (e) {
    // 预处理失败，用原图
  }

  // 2. OCR识别
  if (onProgress) onProgress(0.1, '加载识别引擎（首次需下载语言包）');
  const rawText = await recognizeText(processedImage, (p, s) => {
    if (onProgress) onProgress(0.1 + p * 0.75, s);
  });

  // 3. 清洗识别结果
  if (onProgress) onProgress(0.85, '清洗识别结果');
  const { clean, quality, lines } = cleanOcrText(rawText);

  // 4. 匹配药品知识库（使用清洗后的文本）
  if (onProgress) onProgress(0.9, '匹配药品信息');
  const { matchMedicineFromText } = await import('./medicineDB');
  const medicine = matchMedicineFromText(clean || rawText);

  if (onProgress) onProgress(1, '识别完成');

  return {
    text: clean || rawText,
    rawText,
    medicine,
    quality,
    lines,
  };
}

/**
 * 释放 worker 资源
 */
export async function terminateOCR() {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
    } catch (e) {}
    tesseractWorker = null;
    loadPromise = null;
    preloadTriggered = false;
  }
}
