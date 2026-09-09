const STORAGE_KEY = 'medbox_medicines_v2';

export function loadMedicines() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveMedicines(medicines) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
  } catch (e) {
    console.error('保存失败', e);
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
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
