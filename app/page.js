'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  PillIcon, SearchIcon, CameraIcon, PlusIcon, CloseIcon, SaveIcon, EditIcon,
  TrashIcon, CalendarIcon, WarningIcon, CheckIcon, ClockIcon, BanIcon,
  FactoryIcon, TagIcon, NoteIcon, SparklesIcon, UploadIcon, ImageIcon,
  ScanIcon, ZapIcon, ShieldIcon, HeartIcon,
} from '@/components/Icons';
import {
  loadMedicines, saveMedicines, genId, getExpireStatus, getTypeLabel,
  formatDate, getStats, exportData, importData, deleteExpired,
} from '@/lib/storage';
import { compressImage, computeImageHash, searchByImage } from '@/lib/imageUtils';
import { generateKeywords } from '@/lib/keywords';
import { recognizeMedicineWithAI, getAIConfig, saveAIConfig, isAIEnabled, getAISignupUrl } from '@/lib/aiApi';

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Home() {
  const _s1 = 'b1b5efd1a6cb804d';
  const _s2 = '54dd3d7c418a71e8';
  const _s3 = 'a4153351b7e54b8c';
  const _s4 = 'cafb3e6a746d0e69';
  const _ak = 'medbox_auth_v1';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('expire');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [editingMed, setEditingMed] = useState(null);
  const [detailMed, setDetailMed] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [aiInput, setAiInput] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [cameraResults, setCameraResults] = useState([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeProgress, setRecognizeProgress] = useState(0);
  const [recognizeStatus, setRecognizeStatus] = useState('');
  const [recognizeError, setRecognizeError] = useState('');
  const [importing, setImporting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiConfig, setAiConfig] = useState({ apiKey: '', enabled: false });
  const [aiConfigDraft, setAiConfigDraft] = useState({ apiKey: '', enabled: false });
  const [activeTab, setActiveTab] = useState('home');
  const [syncToken, setSyncToken] = useState('');
  const [syncTokenDraft, setSyncTokenDraft] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');

  const [formData, setFormData] = useState({
    name: '', type: 'otc', expireDate: '', effect: '', usage: '',
    taboo: '', factory: '', tags: '', note: '', image: null, imageFeature: null,
  });

  const fileInputRef = useRef(null);
  const cameraFileInputRef = useRef(null);
  const importFileRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 250);

  useEffect(() => {
    try {
      const auth = localStorage.getItem(_ak);
      if (auth === 'authenticated') setIsAuthenticated(true);
    } catch (e) { console.error(e); }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setMedicines(loadMedicines());
      const cfg = getAIConfig();
      setAiConfig(cfg);
      setAiConfigDraft({ apiKey: cfg.isDefault ? '' : cfg.apiKey, enabled: cfg.enabled });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const preventGesture = (e) => e.preventDefault();
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);
    const preventTouchZoom = (e) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener('touchmove', preventTouchZoom, { passive: false });
    document.addEventListener('touchstart', preventTouchZoom, { passive: false });
    let lastTouchEnd = 0;
    const preventDoubleTap = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    const preventContextMenu = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'IMG' || target.closest('.modal'))) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContextMenu);
    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
      document.removeEventListener('touchmove', preventTouchZoom);
      document.removeEventListener('touchstart', preventTouchZoom);
      document.removeEventListener('touchend', preventDoubleTap);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  const showToast = useCallback((message, type = '') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 2500);
  }, []);

  const _digest = async (v) => {
    const e = new TextEncoder();
    const d = e.encode(v);
    const hb = await crypto.subtle.digest('SHA-256', d);
    const ha = Array.from(new Uint8Array(hb));
    return ha.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) { setPasswordError('请输入密码'); return; }
    setPasswordLoading(true); setPasswordError('');
    try {
      const h = await _digest(passwordInput.trim());
      if (h === _s1 + _s2 + _s3 + _s4) {
        localStorage.setItem(_ak, 'authenticated');
        setIsAuthenticated(true); setPasswordInput('');
        showToast('登录成功', 'success');
      } else { setPasswordError('密码错误，请重试'); }
    } catch { setPasswordError('验证失败，请重试'); }
    finally { setPasswordLoading(false); }
  };

  const handleLogout = () => {
    if (!confirm('确定要退出登录吗？')) return;
    localStorage.removeItem(_ak);
    setIsAuthenticated(false); setMedicines([]);
    showToast('已退出登录');
  };

  // 打开设置时同步 AI 配置草稿
  const openSettings = () => {
    setAiConfigDraft({ ...aiConfig });
    openSettings();
  };

  // 保存 AI 配置
  const handleSaveAIConfig = () => {
    const cfg = { ...aiConfigDraft };
    // 允许留空，留空时使用内置 Key
    saveAIConfig(cfg);
    setAiConfig(cfg);
    showToast(cfg.enabled ? '智谱 AI 识别已启用' : 'AI 识别已关闭', 'success');
  };

  // ===== 数据同步功能 =====
  const SYNC_API_URL = 'https://yao1.hugv.me/api/sync.php';
  const SYNC_TOKEN_KEY = 'medbox_sync_token';
  const SYNC_TIME_KEY = 'medbox_last_sync';

  // 加载同步配置
  useEffect(() => {
    const savedToken = localStorage.getItem(SYNC_TOKEN_KEY);
    const savedTime = localStorage.getItem(SYNC_TIME_KEY);
    if (savedToken) {
      setSyncToken(savedToken);
      setSyncTokenDraft(savedToken);
    }
    if (savedTime) setLastSyncTime(savedTime);
  }, []);

  // 保存同步密钥
  const handleSaveSyncToken = () => {
    const token = syncTokenDraft.trim();
    if (!token) {
      showToast('请输入同步密钥', 'error');
      return;
    }
    localStorage.setItem(SYNC_TOKEN_KEY, token);
    setSyncToken(token);
    showToast('同步密钥已保存', 'success');
  };

  // 上传数据到服务器
  const handleSyncUpload = async () => {
    if (!syncToken) {
      showToast('请先保存同步密钥', 'error');
      return;
    }
    setSyncing(true);
    try {
      const response = await fetch(SYNC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: syncToken, medicines: medicines }),
      });
      const data = await response.json();
      if (data.success) {
        const now = new Date().toLocaleString('zh-CN');
        localStorage.setItem(SYNC_TIME_KEY, now);
        setLastSyncTime(now);
        showToast(`上传成功，共 ${data.count} 条药品`, 'success');
      } else {
        showToast('上传失败：' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showToast('上传失败：网络错误，请检查服务器', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // 从服务器拉取数据
  const handleSyncDownload = async () => {
    if (!syncToken) {
      showToast('请先保存同步密钥', 'error');
      return;
    }
    if (!confirm('拉取数据会覆盖本地当前数据，确定继续吗？')) return;
    setSyncing(true);
    try {
      const response = await fetch(`${SYNC_API_URL}?token=${encodeURIComponent(syncToken)}`);
      const data = await response.json();
      if (data.success) {
        if (data.medicines && data.medicines.length > 0) {
          saveMedicines(data.medicines);
          setMedicines(data.medicines);
          const now = new Date().toLocaleString('zh-CN');
          localStorage.setItem(SYNC_TIME_KEY, now);
          setLastSyncTime(now);
          showToast(`拉取成功，共 ${data.medicines.length} 条药品`, 'success');
        } else {
          showToast('服务器暂无数据', '');
        }
      } else {
        showToast('拉取失败：' + (data.error || '未知错误'), 'error');
      }
    } catch (err) {
      showToast('拉取失败：网络错误，请检查服务器', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => getStats(medicines), [medicines]);
  const expiredCount = stats.expired;
  const expiringCount = stats.expiring;

  const filteredMedicines = useMemo(() => {
    let result = [...medicines];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((m) => {
        const searchText = [m.name, m.effect, m.usage, m.taboo, m.factory, m.note, (m.tags || []).join(' ')].join(' ').toLowerCase();
        return searchText.includes(q);
      });
    }

    const order = { expired: 0, expiring: 1, unknown: 2, good: 3 };
    if (sortBy === 'expire') {
      result.sort((a, b) => {
        const sa = getExpireStatus(a.expireDate), sb = getExpireStatus(b.expireDate);
        const sd = (order[sa.status] || 3) - (order[sb.status] || 3);
        if (sd !== 0) return sd;
        const da = a.expireDate ? new Date(a.expireDate).getTime() : Infinity;
        const db = b.expireDate ? new Date(b.expireDate).getTime() : Infinity;
        return da - db;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return result;
  }, [medicines, debouncedSearch, sortBy]);

  const resetForm = () => {
    setFormData({ name: '', type: 'otc', expireDate: '', effect: '', usage: '', taboo: '', factory: '', tags: '', note: '', image: null, imageFeature: null });
    setEditingMed(null);
  };

  const openAddModal = () => {
    resetForm(); setRecognizeError(''); setRecognizing(false); setAiResult(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false); setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus('');
    setRecognizeError(''); setAiResult(null);
  };

  const openEditModal = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name || '', type: med.type || 'otc', expireDate: med.expireDate || '',
      effect: med.effect || '', usage: med.usage || '', taboo: med.taboo || '',
      factory: med.factory || '', tags: (med.tags || []).join(', '), note: med.note || '',
      image: med.image || null, imageFeature: med.imageFeature || null,
    });
    setShowDetailModal(false); setShowAddModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (!isAIEnabled()) {
        showToast('请先在设置中启用智谱 AI 并填写 API Key', 'error');
        setShowAddModal(true);
        e.target.value = '';
        return;
      }
      showToast('正在处理图片…');
      const compressed = await compressImage(file);
      const feature = await computeImageHash(compressed);
      setFormData((prev) => ({ ...prev, image: compressed, imageFeature: feature }));
      setRecognizing(true); setRecognizeProgress(0); setRecognizeStatus('开始识别');
      setRecognizeError(''); setAiResult(null);
      try {
        showToast('智谱 AI 识别中，请稍候…', 'success');
        const aiData = await recognizeMedicineWithAI(compressed, (status) => {
          setRecognizeStatus(status || '智谱 AI 识别中…');
          setRecognizeProgress(50);
        });
        setRecognizeProgress(100);
        if (aiData && aiData.name && aiData.name !== '无法识别') {
          setAiResult(aiData);
          showToast(`智谱 AI 识别成功：${aiData.name}，点击一键填充`, 'success');
        } else {
          setRecognizeError('智谱 AI 未能识别出药品信息，请换一张更清晰的图片重试，或手动填写');
          showToast('识别失败，请重试或手动填写', 'error');
        }
      } catch (err) {
        setRecognizeError(err.message || '智谱 AI 识别失败');
        showToast('识别失败：' + (err.message || '请检查 API Key'), 'error');
      } finally { setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus(''); }
    } catch (err) { showToast(err.message || '图片处理失败', 'error'); }
    e.target.value = '';
  };

  const handleReRecognize = async () => {
    if (!formData.image || recognizing) return;
    if (!isAIEnabled()) {
      showToast('请先在设置中启用智谱 AI', 'error');
      return;
    }
    setRecognizing(true); setRecognizeProgress(0); setRecognizeStatus('开始识别');
    setRecognizeError(''); setAiResult(null);
    try {
      const aiData = await recognizeMedicineWithAI(formData.image, (status) => {
        setRecognizeStatus(status || '智谱 AI 识别中…');
        setRecognizeProgress(50);
      });
      setRecognizeProgress(100);
      if (aiData && aiData.name && aiData.name !== '无法识别') {
        setAiResult(aiData);
        showToast(`智谱 AI 识别成功：${aiData.name}`, 'success');
      } else {
        setRecognizeError('智谱 AI 未能识别出药品信息，请换一张更清晰的图片重试');
        showToast('识别失败，请重试', 'error');
      }
    } catch (err) {
      setRecognizeError(err.message || '智谱 AI 识别失败');
      showToast('识别失败：' + (err.message || '请检查 API Key'), 'error');
    } finally { setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus(''); }
  };

  const handleFillFromRecognition = () => {
    if (aiResult && aiResult.name) {
      const ai = aiResult;
      setFormData((prev) => ({
        ...prev,
        name: prev.name || ai.name || '',
        type: ai.type ? (ai.type.toLowerCase().includes('处方') ? 'rx' : ai.type.toLowerCase().includes('保健') ? 'health' : ai.type.toLowerCase().includes('外用') ? 'external' : 'otc') : prev.type,
        effect: prev.effect || ai.effect || '',
        usage: prev.usage || ai.usage || '',
        taboo: prev.taboo || ai.taboo || '',
        factory: prev.factory || ai.factory || '',
        expireDate: prev.expireDate || ai.expireDate || '',
        tags: prev.tags || (ai.tags && ai.tags.length > 0 ? ai.tags.join(', ') : ''),
        note: prev.note || ai.note || '',
      }));
      showToast(`智谱 AI 识别已填充：${ai.name}`, 'success');
    } else {
      showToast('暂无识别结果，请先拍照识别', 'error');
    }
  };
  const handleSaveMed = () => {
    if (!formData.name.trim()) { showToast('请填写药品名称', 'error'); return; }
    const med = {
      id: editingMed ? editingMed.id : genId(), name: formData.name.trim(), type: formData.type,
      expireDate: formData.expireDate, effect: formData.effect.trim(), usage: formData.usage.trim(),
      taboo: formData.taboo.trim(), factory: formData.factory.trim(),
      tags: formData.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      note: formData.note.trim(), image: formData.image, imageFeature: formData.imageFeature,
      createdAt: editingMed ? editingMed.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    let newMedicines;
    if (editingMed) { newMedicines = medicines.map((m) => (m.id === editingMed.id ? med : m)); showToast('已更新', 'success'); }
    else { newMedicines = [med, ...medicines]; showToast('添加成功', 'success'); }
    setMedicines(newMedicines);
    if (!saveMedicines(newMedicines)) showToast('保存失败，存储空间可能不足', 'error');
    closeAddModal(); resetForm();
  };

  const handleDeleteMed = (med) => {
    if (!confirm('确定要删除这个药品吗？')) return;
    const newMedicines = medicines.filter((m) => m.id !== med.id);
    setMedicines(newMedicines); saveMedicines(newMedicines);
    setShowDetailModal(false); showToast('已删除', 'success');
  };

  const handleDeleteExpired = () => {
    if (expiredCount === 0) { showToast('没有过期药品', ''); return; }
    if (!confirm(`确定删除 ${expiredCount} 个过期药品吗？`)) return;
    const { remaining, deletedCount } = deleteExpired(medicines);
    setMedicines(remaining); saveMedicines(remaining);
    showToast(`已删除 ${deletedCount} 个过期药品`, 'success');
  };

  const handleExport = () => {
    if (medicines.length === 0) { showToast('没有数据可导出', 'error'); return; }
    exportData(medicines); showToast('数据已导出', 'success');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importData(file, medicines);
      setMedicines(result.medicines); saveMedicines(result.medicines);
      showToast(`导入成功：新增${result.imported}条，跳过${result.skipped}条`, 'success');
      setShowSettingsModal(false);
    } catch (err) { showToast(err.message || '导入失败', 'error'); }
    finally { setImporting(false); }
    e.target.value = '';
  };

  const handleAiGenerate = () => {
    if (!aiInput.trim()) { showToast('请输入药品名称或症状', 'error'); return; }
    setAiLoading(true); setAiResults([]);
    setTimeout(() => { setAiResults(generateKeywords(aiInput.trim())); setAiLoading(false); }, 600);
  };

  const useKeyword = (keyword) => { setSearchQuery(keyword); setShowAiModal(false); showToast(`已搜索：${keyword}`, 'success'); };

  const handleCameraSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCameraLoading(true); setCameraResults([]);
    try {
      const compressed = await compressImage(file, 600, 0.6);
      const feature = await computeImageHash(compressed);
      const results = searchByImage(feature, medicines, 0.4);
      setCameraResults(results);
      if (results.length === 0) showToast('未找到相似药品', 'error');
    } catch (err) { showToast(err.message || '识别失败', 'error'); }
    setCameraLoading(false); e.target.value = '';
  };

  const viewFromCameraResult = (med) => { setDetailMed(med); setShowCameraModal(false); setShowDetailModal(true); };

  const sortOptions = [
    { key: 'expire', label: '按过期时间' }, { key: 'name', label: '按名称' }, { key: 'date', label: '按添加时间' },
  ];

  if (checkingAuth) {
    return (<main><div className="auth-loading"><div className="spinner"></div><p>正在加载…</p></div></main>);
  }

  if (!isAuthenticated) {
    return (
      <main>
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-icon"><ShieldIcon size={48} /></div>
            <h1 className="auth-title">我的药盒</h1>
            <p className="auth-sub">请输入密码访问</p>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-input-wrap">
                <input type="password" className="auth-input" placeholder="请输入密码" value={passwordInput} maxLength={20}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }} autoFocus inputMode="numeric" />
              </div>
              {passwordError && <p className="auth-error">{passwordError}</p>}
              <button type="submit" className="auth-btn" disabled={passwordLoading}>{passwordLoading ? '验证中…' : '进入'}</button>
            </form>
            <p className="auth-hint">数据仅保存在本地浏览器</p>
          </div>
        </div>
        <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.message}</div>
      </main>
    );
  }

  return (
    <main className="app-main">
      {/* 顶部状态栏 */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-left">
            <div className="app-logo"><PillIcon size={22} /></div>
            <div className="app-header-text">
              <h1 className="app-title">{activeTab === 'home' ? '我的药盒' : activeTab === 'search' ? '搜索药品' : '设置'}</h1>
              <p className="app-subtitle">{activeTab === 'home' ? `${medicines.length} 种药品 · ${expiredCount} 种过期` : activeTab === 'search' ? '名称 / 功效 / 症状 / 图片' : '数据管理 · AI识别 · 账号'}</p>
            </div>
          </div>
          <div className="app-header-right">
            {activeTab === 'home' && (
              <div className="app-stats-mini">
                <div className="app-stat-mini"><span className="app-stat-num">{medicines.length}</span><span className="app-stat-label">药品</span></div>
                <div className="app-stat-mini danger"><span className="app-stat-num">{expiredCount}</span><span className="app-stat-label">过期</span></div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="app-content">
        {/* ===== 首页 - 药品列表 ===== */}
        {activeTab === 'home' && (
          <div className="tab-content">
            {/* 搜索栏 */}
            <div className="app-search-bar">
              <div className="app-search-input-wrap">
                <SearchIcon size={18} />
                <input type="text" className="app-search-input" placeholder="搜索药名、功效、症状…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" />
                {searchQuery && (<button className="app-search-clear" onClick={() => setSearchQuery('')}><CloseIcon size={14} /></button>)}
              </div>
              <button className="app-search-ai" onClick={() => { setAiInput(searchQuery); setAiResults([]); setShowAiModal(true); }} title="AI关键词"><SparklesIcon size={18} /></button>
            </div>

            {/* 过期提醒 */}
            {expiredCount + expiringCount > 0 && (
              <div className="app-expire-banner" onClick={handleDeleteExpired}>
                <div className="app-expire-icon"><WarningIcon size={18} /></div>
                <div className="app-expire-text"><strong>{expiredCount + expiringCount}</strong> 种药品已过期或即将过期，点击清理</div>
                <div className="app-expire-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
              </div>
            )}

            {/* 药品列表 */}
            <div className="app-section-header">
              <h2 className="app-section-title">全部药品</h2>
              <span className="app-section-count">{filteredMedicines.length} 种</span>
            </div>

            {filteredMedicines.length === 0 ? (
              <div className="app-empty">
                <div className="app-empty-icon"><PillIcon size={40} /></div>
                <h3>{searchQuery ? '没有找到匹配的药品' : '还没有记录药品'}</h3>
                <p>{searchQuery ? '试试其他关键词' : '点击下方添加按钮，拍照记录你的第一种药品'}</p>
              </div>
            ) : (
              <div className="app-med-list">
                {filteredMedicines.map((med, index) => {
                  const exp = getExpireStatus(med.expireDate);
                  return (
                    <div key={med.id} className="app-med-card" style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }} onClick={() => { setDetailMed(med); setShowDetailModal(true); }}>
                      <div className="app-med-img">
                        {med.image ? (<img src={med.image} alt={med.name} loading="lazy" />) : (<div className="app-med-img-placeholder"><PillIcon size={32} /></div>)}
                        {exp.status !== 'unknown' && <span className={`app-med-badge ${exp.class}`}>{exp.label}</span>}
                      </div>
                      <div className="app-med-info">
                        <div className="app-med-name-row">
                          <span className="app-med-name">{med.name}</span>
                          {med.type === 'rx' && <span className="app-med-rx">Rx</span>}
                        </div>
                        <p className="app-med-effect">{med.effect || '暂无功效描述'}</p>
                        <div className="app-med-footer">
                          <span className="app-med-date"><CalendarIcon size={12} />{formatDate(med.expireDate)}</span>
                          <span className="app-med-type">{getTypeLabel(med.type)}</span>
                        </div>
                      </div>
                      <div className="app-med-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== 搜索 Tab ===== */}
        {activeTab === 'search' && (
          <div className="tab-content">
            <div className="search-tab-section">
              <h3 className="search-tab-title">智能搜索</h3>
              <div className="search-tab-cards">
                <div className="search-tab-card" onClick={() => { setAiInput(''); setAiResults([]); setShowAiModal(true); }}>
                  <div className="search-tab-card-icon purple"><SparklesIcon size={24} /></div>
                  <div className="search-tab-card-text">
                    <h4>AI 关键词</h4>
                    <p>输入症状，AI 生成搜索关键词</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div className="search-tab-card" onClick={() => { setCameraResults([]); setShowCameraModal(true); }}>
                  <div className="search-tab-card-icon teal"><CameraIcon size={24} /></div>
                  <div className="search-tab-card-text">
                    <h4>以图搜药</h4>
                    <p>拍照搜索已记录的相似药品</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>
            <div className="search-tab-section">
              <h3 className="search-tab-title">热门搜索</h3>
              <div className="search-hot-tags">
                {['感冒', '退烧', '止痛', '肠胃', '消炎', '维生素', '过敏', '咳嗽', '头痛', '消化不良'].map((tag, i) => (
                  <button key={i} className="search-hot-tag" onClick={() => { setSearchQuery(tag); setActiveTab('home'); }}>{tag}</button>
                ))}
              </div>
            </div>
            {cameraLoading && (<div className="ai-loading"><div className="spinner"></div><p>正在以图搜药…</p></div>)}
          </div>
        )}

        {/* ===== 设置 Tab ===== */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            {/* 数据统计 */}
            <div className="settings-group">
              <h3 className="settings-group-title">数据统计</h3>
              <div className="settings-stats-grid">
                <div className="settings-stat-card"><div className="settings-stat-num">{stats.total}</div><div className="settings-stat-label">药品总数</div></div>
                <div className="settings-stat-card danger"><div className="settings-stat-num">{stats.expired}</div><div className="settings-stat-label">已过期</div></div>
                <div className="settings-stat-card warning"><div className="settings-stat-num">{stats.expiring}</div><div className="settings-stat-label">即将过期</div></div>
                <div className="settings-stat-card"><div className="settings-stat-num">{stats.totalImageSizeMB}</div><div className="settings-stat-label">图片(MB)</div></div>
              </div>
            </div>

            {/* AI 识别 */}
            <div className="settings-group">
              <h3 className="settings-group-title">AI 药品识别（智谱 GLM-4V）</h3>
              <div className="settings-ai-card">
                <div className="settings-ai-header">
                  <div className="settings-ai-status">
                    <span className={`settings-ai-dot ${aiConfig.enabled ? 'active' : ''}`}></span>
                    <span className="settings-ai-status-text">{aiConfig.enabled ? '已启用 · 智谱 GLM-4V' : '未启用'}</span>
                  </div>
                  <label className="settings-switch">
                    <input type="checkbox" checked={aiConfigDraft.enabled} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, enabled: e.target.checked }))} />
                    <span className="settings-switch-slider"></span>
                  </label>
                </div>
                {aiConfigDraft.enabled && (
                  <div className="settings-ai-body">
                    <div className="form-group">
                      <label className="form-label">智谱 API Key（已内置，可自定义）</label>
                      <input type="password" className="form-input" placeholder="留空使用内置 Key，或输入自定义 Key" value={aiConfigDraft.apiKey} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, apiKey: e.target.value }))} />
                      <p className="form-hint">已内置默认 Key，所有设备打开即可用；如需使用自己的 Key，<a href={getAISignupUrl()} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>点此免费申请</a></p>
                    </div>
                    <button className="btn btn-primary btn-block btn-sm" onClick={handleSaveAIConfig} style={{ marginTop: 8 }}>保存设置</button>
                  </div>
                )}
                {!aiConfigDraft.enabled && (<p className="settings-ai-hint">AI 已内置默认 Key，启用后拍照将直接调用智谱 GLM-4V 识别药品信息（名称、功效、用法、保质期等），所有设备通用。</p>)}
              </div>
            </div>

            {/* 数据同步 */}
            <div className="settings-group">
              <h3 className="settings-group-title">云端数据同步</h3>
              <div className="settings-ai-card">
                <div className="settings-ai-header">
                  <div className="settings-ai-status">
                    <span className={`settings-ai-dot ${syncToken ? 'active' : ''}`}></span>
                    <span className="settings-ai-status-text">{syncToken ? '已配置同步密钥' : '未配置'}</span>
                  </div>
                  {lastSyncTime && <span style={{ fontSize: 11, color: 'var(--text-light)' }}>上次同步：{lastSyncTime}</span>}
                </div>
                <div className="settings-ai-body">
                  <div className="form-group">
                    <label className="form-label">同步密钥（所有设备用同一个密钥才能同步）</label>
                    <input type="text" className="form-input" placeholder="如：my-medbox-2024" value={syncTokenDraft} onChange={(e) => setSyncTokenDraft(e.target.value)} />
                    <p className="form-hint">自己设置一个密钥，手机和电脑用同一个密钥，就能跨设备同步药品数据</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleSaveSyncToken} disabled={syncing}>保存密钥</button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSyncUpload} disabled={syncing || !syncToken}>
                      {syncing ? '同步中…' : '↑ 上传到云端'}
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, background: 'var(--purple-gradient)' }} onClick={handleSyncDownload} disabled={syncing || !syncToken}>
                      {syncing ? '同步中…' : '↓ 从云端拉取'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 数据管理 */}
            <div className="settings-group">
              <h3 className="settings-group-title">数据管理</h3>
              <div className="settings-list">
                <button className="settings-list-item" onClick={handleExport}>
                  <div className="settings-list-icon teal"><UploadIcon size={18} /></div>
                  <div className="settings-list-text"><h4>导出数据备份</h4><p>导出所有药品数据为 JSON 文件</p></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <button className="settings-list-item" onClick={() => importFileRef.current?.click()} disabled={importing}>
                  <div className="settings-list-icon blue"><ImageIcon size={18} /></div>
                  <div className="settings-list-text"><h4>{importing ? '导入中…' : '导入数据备份'}</h4><p>从 JSON 文件恢复药品数据</p></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
                <button className="settings-list-item danger" onClick={handleDeleteExpired}>
                  <div className="settings-list-icon red"><TrashIcon size={18} /></div>
                  <div className="settings-list-text"><h4>清理过期药品</h4><p>删除所有已过期的药品（{expiredCount} 种）</p></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>

            {/* 账号 */}
            <div className="settings-group">
              <h3 className="settings-group-title">账号</h3>
              <div className="settings-list">
                <button className="settings-list-item danger" onClick={handleLogout}>
                  <div className="settings-list-icon red"><ShieldIcon size={18} /></div>
                  <div className="settings-list-text"><h4>退出登录</h4><p>需要重新输入密码才能访问</p></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            <p className="settings-footer-hint">数据保存在本地浏览器，清除浏览器数据会丢失，请定期导出备份。</p>
          </div>
        )}
      </div>

      {/* 底部 Tab 导航 */}
      <nav className="app-tabbar">
        <div className="app-tabbar-inner">
          <button className={`app-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <div className="app-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><path d="M19 21H5"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/></svg></div>
            <span className="app-tab-label">药盒</span>
          </button>
          <button className={`app-tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
            <div className="app-tab-icon"><SearchIcon size={22} /></div>
            <span className="app-tab-label">搜索</span>
          </button>
          <button className="app-tab-add" onClick={openAddModal}>
            <span className="app-tab-add-text">添加</span>
          </button>
          <button className={`app-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <div className="app-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
            <span className="app-tab-label">设置</span>
          </button>
        </div>
      </nav>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="modal">
            <div className="modal-header"><h3>{editingMed ? '编辑药品' : '添加药品'}</h3><button className="modal-close" onClick={() => closeAddModal()}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">药品图片</label>
                {formData.image ? (
                  <div className="upload-preview" onClick={() => { setPreviewImage(formData.image); setShowImagePreview(true); }}>
                    <img src={formData.image} alt="预览" />
                    <button className="upload-remove" onClick={(e) => { e.stopPropagation(); setFormData((prev) => ({ ...prev, image: null, imageFeature: null })); setAiResult(null); setRecognizeError(''); }}><CloseIcon size={16} /></button>
                  </div>
                ) : (
                  <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                    <div className="upload-area-icon"><CameraIcon size={24} /></div>
                    <p><strong>点击拍照</strong> 或选择图片上传</p>
                    <p className="hint">拍照后自动识别药品名称、功效、用法等信息</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload} />
                {recognizing && (
                  <div className="recognize-progress">
                    <div className="recognize-progress-header"><ScanIcon size={16} /><span>{recognizeStatus || '正在识别…'}</span><span className="recognize-progress-num">{recognizeProgress}%</span></div>
                    <div className="recognize-progress-bar"><div className="recognize-progress-fill" style={{ width: `${recognizeProgress}%` }}></div></div>
                    <p className="recognize-hint">AI正在识别药盒文字并匹配药品信息…</p>
                  </div>
                )}
                {aiResult && !recognizing && (
                  <div className="recognize-result ai-result">
                    <div className="recognize-result-header">
                      <div className="recognize-result-icon ai-icon"><SparklesIcon size={16} /></div>
                      <div className="recognize-result-info">
                        <div className="recognize-result-title">AI 识别：{aiResult.name}</div>
                        <div className="recognize-result-sub">{aiResult.effect ? aiResult.effect.substring(0, 50) + (aiResult.effect.length > 50 ? '…' : '') : '点击下方按钮自动填充全部信息'}</div>
                      </div>
                      <span className="recognize-quality-badge ai-badge">AI</span>
                    </div>
                    {aiResult.tags && aiResult.tags.length > 0 && (
                      <div className="ai-result-tags">{aiResult.tags.slice(0, 4).map((t, i) => (<span key={i} className="med-tag">{t}</span>))}</div>
                    )}
                    <button className="btn-auto-fill" onClick={handleFillFromRecognition}><ZapIcon size={15} />AI 一键填充全部信息</button>
                  </div>
                )}
                {recognizeError && !recognizing && (
                  <div className="recognize-error">
                    <div className="recognize-error-header"><WarningIcon size={14} /><span>识别失败</span></div>
                    <p className="recognize-error-text">{recognizeError}</p>
                    {formData.image && (<button className="btn-rerecognize" onClick={handleReRecognize}><ScanIcon size={14} />重新识别</button>)}
                  </div>
                )}
              </div>
              <div className="form-group"><label className="form-label">药品名称 <span className="required">*</span></label><input type="text" className="form-input" placeholder="如：布洛芬缓释胶囊" value={formData.name} maxLength={50} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">药品类型</label><select className="form-select" value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}><option value="otc">非处方药（OTC）</option><option value="rx">处方药（Rx）</option><option value="health">保健品</option><option value="external">外用药</option><option value="other">其他</option></select></div>
                <div className="form-group"><label className="form-label">保质期至</label><input type="date" className="form-input" value={formData.expireDate} onChange={(e) => setFormData((prev) => ({ ...prev, expireDate: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">主要功效 / 适用症状</label><textarea className="form-textarea" placeholder="如：用于缓解轻至中度疼痛…" value={formData.effect} maxLength={500} onChange={(e) => setFormData((prev) => ({ ...prev, effect: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">用法用量</label><textarea className="form-textarea" placeholder="如：口服。成人一次1粒，一日2次" value={formData.usage} maxLength={300} onChange={(e) => setFormData((prev) => ({ ...prev, usage: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">禁忌人群</label><input type="text" className="form-input" placeholder="如：孕妇、哺乳期妇女禁用" value={formData.taboo} maxLength={100} onChange={(e) => setFormData((prev) => ({ ...prev, taboo: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">生产厂家</label><input type="text" className="form-input" placeholder="如：中美天津史克制药" value={formData.factory} maxLength={100} onChange={(e) => setFormData((prev) => ({ ...prev, factory: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">搜索标签（逗号分隔）</label><input type="text" className="form-input" placeholder="如：止痛,退烧,感冒,头痛" value={formData.tags} maxLength={150} onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))} /><p className="form-hint">用于快速搜索，可填写症状、功效等关键词</p></div>
              <div className="form-group"><label className="form-label">备注</label><textarea className="form-textarea" placeholder="其他需要记录的信息" value={formData.note} maxLength={500} onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => closeAddModal()}>取消</button><button className="btn btn-primary" onClick={handleSaveMed}><SaveIcon size={17} />保存药品</button></div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetailModal && detailMed && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>药品详情</h3><button className="modal-close" onClick={() => setShowDetailModal(false)}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="detail-img" onClick={() => { if (detailMed.image) { setPreviewImage(detailMed.image); setShowImagePreview(true); } }}>{detailMed.image ? (<img src={detailMed.image} alt={detailMed.name} />) : (<div className="placeholder"><PillIcon size={64} /></div>)}</div>
              <div className="detail-name">{detailMed.name}</div>
              <div className="detail-sub"><span>{getTypeLabel(detailMed.type)}</span><span>·</span><span className={`status-${getExpireStatus(detailMed.expireDate).status}`}>{getExpireStatus(detailMed.expireDate).label}{getExpireStatus(detailMed.expireDate).days !== null && `（${getExpireStatus(detailMed.expireDate).days >= 0 ? '还剩' : '已过'} ${Math.abs(getExpireStatus(detailMed.expireDate).days)} 天）`}</span></div>
              {detailMed.effect && (<div className="detail-section"><div className="detail-section-title"><CheckIcon size={15} />主要功效 / 适用症状</div><div className="detail-section-content">{detailMed.effect}</div></div>)}
              {detailMed.usage && (<div className="detail-section"><div className="detail-section-title"><ClockIcon size={15} />用法用量</div><div className="detail-section-content">{detailMed.usage}</div></div>)}
              <div className="form-row">
                {detailMed.taboo && (<div className="detail-section"><div className="detail-section-title"><BanIcon size={15} />禁忌人群</div><div className="detail-section-content">{detailMed.taboo}</div></div>)}
                {detailMed.factory && (<div className="detail-section"><div className="detail-section-title"><FactoryIcon size={15} />生产厂家</div><div className="detail-section-content">{detailMed.factory}</div></div>)}
              </div>
              {detailMed.expireDate && (<div className="detail-section"><div className="detail-section-title"><CalendarIcon size={15} />保质期</div><div className="detail-section-content">{formatDate(detailMed.expireDate)}</div></div>)}
              {detailMed.tags && detailMed.tags.length > 0 && (<div className="detail-section"><div className="detail-section-title"><TagIcon size={15} />搜索标签</div><div className="detail-tags">{detailMed.tags.map((tag, i) => (<span key={i} className="med-tag">{tag}</span>))}</div></div>)}
              {detailMed.note && (<div className="detail-section"><div className="detail-section-title"><NoteIcon size={15} />备注</div><div className="detail-section-content">{detailMed.note}</div></div>)}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => openEditModal(detailMed)}><EditIcon size={17} />编辑</button><button className="btn btn-danger" onClick={() => handleDeleteMed(detailMed)}><TrashIcon size={17} />删除</button></div>
          </div>
        </div>
      )}

      {/* 设置弹窗 */}
      {showSettingsModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>设置与管理</h3><button className="modal-close" onClick={() => setShowSettingsModal(false)}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="settings-section">
                <div className="settings-section-title">数据统计</div>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-card-num">{stats.total}</div><div className="stat-card-label">药品总数</div></div>
                  <div className="stat-card"><div className="stat-card-num" style={{ color: '#ef4444' }}>{stats.expired}</div><div className="stat-card-label">已过期</div></div>
                  <div className="stat-card"><div className="stat-card-num" style={{ color: '#f59e0b' }}>{stats.expiring}</div><div className="stat-card-label">即将过期</div></div>
                  <div className="stat-card"><div className="stat-card-num">{stats.totalImageSizeMB}</div><div className="stat-card-label">图片(MB)</div></div>
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">数据管理</div>
                <div className="settings-actions">
                  <button className="settings-action-btn" onClick={handleExport}><UploadIcon size={18} /><span>导出数据备份</span></button>
                  <button className="settings-action-btn" onClick={() => importFileRef.current?.click()} disabled={importing}><ImageIcon size={18} /><span>{importing ? '导入中…' : '导入数据备份'}</span></button>
                  <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
                  <button className="settings-action-btn danger" onClick={handleDeleteExpired}><TrashIcon size={18} /><span>清理过期药品（{expiredCount}）</span></button>
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">账号</div>
                <button className="settings-action-btn" onClick={handleLogout}><ShieldIcon size={18} /><span>退出登录</span></button>
              </div>
              <p className="settings-hint">数据保存在本地浏览器，清除浏览器数据会丢失，请定期导出备份。</p>
            </div>
          </div>
        </div>
      )}

      {/* AI关键词弹窗 */}
      {showAiModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowAiModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>AI 智能关键词</h3><button className="modal-close" onClick={() => setShowAiModal(false)}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">输入药品名称或症状描述</label><input type="text" className="form-input" placeholder="如：布洛芬 / 头痛发烧 / 胃不舒服" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()} /></div>
              <button className="btn btn-primary btn-block" onClick={handleAiGenerate} style={{ marginBottom: 16 }}><SparklesIcon size={17} />生成搜索关键词</button>
              {aiLoading && (<div className="ai-loading"><div className="spinner"></div><p>AI 正在分析并生成关键词…</p></div>)}
              {aiResults.length > 0 && (<div className="keyword-list">{aiResults.map((kw, i) => (<div key={i} className="keyword-item" onClick={() => useKeyword(kw.main)}><div className="kw-icon"><ZapIcon size={16} /></div><div className="kw-text"><div className="kw-main">{kw.main}</div><div className="kw-sub">{kw.sub}</div></div><div className="kw-use">使用</div></div>))}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* 图片搜药弹窗 */}
      {showCameraModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowCameraModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>图片搜药</h3><button className="modal-close" onClick={() => setShowCameraModal(false)}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="upload-area" onClick={() => cameraFileInputRef.current?.click()}><div className="upload-area-icon"><ScanIcon size={24} /></div><p><strong>拍照</strong> 或上传药品图片搜索</p><p className="hint">在已记录药品中匹配相似图片</p></div>
              <input ref={cameraFileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraSearch} />
              {cameraLoading && (<div className="ai-loading" style={{ marginTop: 20 }}><div className="spinner"></div><p>正在识别图片并匹配药品…</p></div>)}
              {cameraResults.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>找到 {cameraResults.length} 个相似药品：</p>
                  {cameraResults.map((result, i) => (
                    <div key={i} className="search-result-item" onClick={() => viewFromCameraResult(result.medicine)}>
                      <div className="search-result-img">{result.medicine.image ? (<img src={result.medicine.image} alt={result.medicine.name} />) : (<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PillIcon size={28} /></div>)}</div>
                      <div className="search-result-info">
                        <div className="search-result-name">{result.medicine.name}</div>
                        <div className="search-result-effect">{result.medicine.effect || '暂无功效描述'}</div>
                        <div className="search-result-similarity">相似度 {Math.round(result.similarity * 100)}%</div>
                        <div className="similarity-bar"><div className="similarity-bar-fill" style={{ width: `${Math.round(result.similarity * 100)}%` }}></div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {showImagePreview && (
        <div className="image-preview-overlay show" onClick={() => setShowImagePreview(false)}>
          <button className="image-preview-close" onClick={() => setShowImagePreview(false)}><CloseIcon size={24} /></button>
          <img src={previewImage} alt="预览大图" className="image-preview-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.message}</div>
    </main>
  );
}
