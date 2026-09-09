// 图片压缩
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 计算图像感知哈希（pHash）- 用于识图功能
export function computeImageHash(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 32;
      const smallSize = 8;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      
      // 转灰度
      const grayValues = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayValues.push(gray);
      }
      
      // 计算8x8区域的平均灰度
      const blockSize = size / smallSize;
      const blockAvg = [];
      for (let by = 0; by < smallSize; by++) {
        for (let bx = 0; bx < smallSize; bx++) {
          let sum = 0;
          for (let y = 0; y < blockSize; y++) {
            for (let x = 0; x < blockSize; x++) {
              const idx = (by * blockSize + y) * size + (bx * blockSize + x);
              sum += grayValues[idx];
            }
          }
          blockAvg.push(sum / (blockSize * blockSize));
        }
      }
      
      // 计算平均值
      const avg = blockAvg.reduce((a, b) => a + b, 0) / blockAvg.length;
      
      // 生成哈希
      const hash = blockAvg.map((v) => (v > avg ? 1 : 0)).join('');
      
      // 颜色直方图特征
      const colorHist = computeColorHistogram(imageData);
      
      resolve({ hash, colorHist });
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

// 颜色直方图特征
function computeColorHistogram(imageData) {
  const bins = 8;
  const hist = new Array(bins * bins * bins).fill(0);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = Math.floor((imageData.data[i] / 256) * bins);
    const g = Math.floor((imageData.data[i + 1] / 256) * bins);
    const b = Math.floor((imageData.data[i + 2] / 256) * bins);
    const idx = r * bins * bins + g * bins + b;
    hist[Math.min(idx, hist.length - 1)]++;
  }
  const total = hist.reduce((a, b) => a + b, 0);
  return hist.map((v) => v / total);
}

// 汉明距离
function hammingDistance(hash1, hash2) {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

// 直方图相交距离
function histogramIntersection(hist1, hist2) {
  let intersection = 0;
  for (let i = 0; i < hist1.length; i++) {
    intersection += Math.min(hist1[i], hist2[i]);
  }
  return intersection;
}

// 计算两张图片的相似度（0-1）
export function computeSimilarity(feature1, feature2) {
  if (!feature1 || !feature2) return 0;
  const hashDist = hammingDistance(feature1.hash, feature2.hash);
  const hashSim = 1 - hashDist / 64;
  const colorSim = histogramIntersection(feature1.colorHist, feature2.colorHist);
  return hashSim * 0.6 + colorSim * 0.4;
}

// 识图搜索
export function searchByImage(targetFeature, medicines, threshold = 0.5) {
  const results = medicines
    .filter((m) => m.imageFeature)
    .map((m) => ({
      medicine: m,
      similarity: computeSimilarity(targetFeature, m.imageFeature),
    }))
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
  return results;
}
