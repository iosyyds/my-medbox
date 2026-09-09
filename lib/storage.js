const STORAGE_KEY = 'medbox_medicines_v2';
const MAX_STORAGE_WARNING = 4 * 1024 * 1024; // 4MB 警告阈值

export function loadMedicines() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // 数据迁移：确保每条记录有必要字段
    return parsed.map((m) => ({
      id: m.id || `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: m.name || '未命名药品',
      type: m.type || 'other',
      expireDate: m.expireDate || '',
      effect: m.effect || '',
      usage: m.usage || '',
      taboo: m.taboo || '',
      factory: m.factory || '',
      tags: Array.isArray(m.tags) ? m.tags : [],
      note: m.note || '',
      image: m.image || null,
      imageFeature: m.imageFeature || null,
      createdAt: m.createdAt || new Date().toISOString(),
      updatedAt: m.updatedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.error('读取药品数据失败:', e);
    return [];
  }
}

export function saveMedicines(medicines) {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.stringify(medicines);
    // 检查存储大小
    if (data.length > MAX_STORAGE_WARNING) {
      console.warn(`药品数据已超过 ${(MAX_STORAGE_WARNING / 1024 / 1024).toFixed(1)}MB，建议清理图片或导出备份`);
    }
    localStorage.setItem(STORAGE_KEY, data);
    return true;
  } catch (e) {
    console.error('保存失败，可能是存储空间不足:', e);
    return false;
  }
}

export function genId() {
  return 'med_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function getExpireStatus(expireDate) {
  if (!expireDate) return { status: 'unknown', label: '未设置', class: '', days: null };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expireDate);
  // 处理无效日期
  if (isNaN(exp.getTime())) return { status: 'unknown', label: '日期无效', class: '', days: null };
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'expired', label: '已过期', class: 'expired', days: diffDays };
  if (diffDays <= 30) return { status: 'expiring', label: '即将过期', class: 'expiring', days: diffDays };
  return { status: 'good', label: '在有效期内', class: 'good', days: diffDays };
}

export function getTypeLabel(type) {
  const map = {
    otc: '非处方药',
    rx: '处方药',
    health: '保健品',
    external: '外用药',
    other: '其他',
  };
  return map[type] || '其他';
}

export function formatDate(dateStr) {
  if (!dateStr) return '未设置';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '日期无效';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 数据统计
export function getStats(medicines) {
  let expired = 0, expiring = 0, good = 0, unknown = 0;
  let totalImageSize = 0;
  medicines.forEach((m) => {
    const status = getExpireStatus(m.expireDate).status;
    if (status === 'expired') expired++;
    else if (status === 'expiring') expiring++;
    else if (status === 'good') good++;
    else unknown++;
    if (m.image) totalImageSize += m.image.length;
  });
  return {
    total: medicines.length,
    expired,
    expiring,
    good,
    unknown,
    totalImageSize,
    totalImageSizeMB: (totalImageSize / 1024 / 1024).toFixed(2),
  };
}

// 导出数据为 JSON 文件
export function exportData(medicines) {
  const exportObj = {
    version: '2.0',
    exportTime: new Date().toISOString(),
    count: medicines.length,
    medicines: medicines.map((m) => ({
      ...m,
      imageFeature: undefined, // 不导出图片特征，减小文件体积
    })),
  };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `我的药盒备份_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 导入数据
export function importData(file, existingMedicines) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let imported = [];
        if (Array.isArray(data)) {
          imported = data;
        } else if (data.medicines && Array.isArray(data.medicines)) {
          imported = data.medicines;
        } else {
          reject(new Error('文件格式不正确'));
          return;
        }

        // 验证并清洗导入数据
        const validMedicines = imported
          .filter((m) => m && m.name)
          .map((m) => ({
            id: m.id || genId(),
            name: String(m.name).trim(),
            type: m.type || 'other',
            expireDate: m.expireDate || '',
            effect: m.effect || '',
            usage: m.usage || '',
            taboo: m.taboo || '',
            factory: m.factory || '',
            tags: Array.isArray(m.tags) ? m.tags : [],
            note: m.note || '',
            image: m.image || null,
            imageFeature: null, // 导入后需要重新计算图片特征
            createdAt: m.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

        // 合并：跳过已存在的 ID
        const existingIds = new Set(existingMedicines.map((m) => m.id));
        const newMedicines = validMedicines.filter((m) => !existingIds.has(m.id));
        const merged = [...existingMedicines, ...newMedicines];

        resolve({
          total: validMedicines.length,
          imported: newMedicines.length,
          skipped: validMedicines.length - newMedicines.length,
          medicines: merged,
        });
      } catch (err) {
        reject(new Error('文件解析失败：' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

// 批量删除过期药品
export function deleteExpired(medicines) {
  const remaining = medicines.filter((m) => getExpireStatus(m.expireDate).status !== 'expired');
  const deletedCount = medicines.length - remaining.length;
  return { remaining, deletedCount };
}

// 清理图片（减小存储空间）
export function clearImages(medicines) {
  return medicines.map((m) => ({
    ...m,
    image: null,
    imageFeature: null,
  }));
}
