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

  // 使用 requestIdleCallback 在浏览器空闲时加载
  const doPreload = () => {
    loadTesseract().catch(() => {
      // 预加载失败静默处理，用户主动识别时会重新尝试
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
    // 失败时重置 worker
    if (tesseractWorker) {
      try { await tesseractWorker.terminate(); } catch (e) {}
      tesseractWorker = null;
      loadPromise = null;
    }
    throw new Error('文字识别失败：' + (err.message || err));
  }
}

/**
 * 预处理图片，增强文字识别效果
 */
export function preprocessImage(imageData) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 优化：最短边600px即可，不需要800px，提升速度
        const minDim = Math.min(img.width, img.height);
        const scale = minDim < 600 ? Math.max(1, 600 / minDim) : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 灰度化 + 对比度增强
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            // S型对比度增强，系数1.3（比之前1.4稍温和，速度更快）
            const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.3 + 128));
            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2] = enhanced;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // 跨域图片无法处理像素，跳过
        }

        // 质量0.85即可，平衡速度和识别率
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        resolve(imageData);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageData;
  });
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
  const text = await recognizeText(processedImage, (p, s) => {
    if (onProgress) onProgress(0.1 + p * 0.75, s);
  });

  // 3. 匹配药品知识库
  if (onProgress) onProgress(0.88, '匹配药品信息');
  const { matchMedicineFromText } = await import('./medicineDB');
  const medicine = matchMedicineFromText(text);

  if (onProgress) onProgress(1, '识别完成');

  return { text, medicine };
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
