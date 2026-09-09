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
import { recognizeMedicine, preloadOCR } from '@/lib/ocr';

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
  const [currentFilter, setCurrentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('expire');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
  const [recognizedText, setRecognizedText] = useState('');
  const [recognizeError, setRecognizeError] = useState('');
  const [matchedMedicine, setMatchedMedicine] = useState(null);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [recognizeQuality, setRecognizeQuality] = useState(0);
  const [editingRecognizedText, setEditingRecognizedText] = useState(false);
  const [recognizedTextDraft, setRecognizedTextDraft] = useState('');
  const [importing, setImporting] = useState(false);

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
      setTimeout(() => preloadOCR(), 1500);
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
    if (currentFilter === 'valid') result = result.filter((m) => getExpireStatus(m.expireDate).status === 'good');
    else if (currentFilter === 'expiring') result = result.filter((m) => getExpireStatus(m.expireDate).status === 'expiring');
    else if (currentFilter === 'expired') result = result.filter((m) => getExpireStatus(m.expireDate).status === 'expired');
    else if (currentFilter === 'otc') result = result.filter((m) => m.type === 'otc');
    else if (currentFilter === 'rx') result = result.filter((m) => m.type === 'rx');

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
  }, [medicines, debouncedSearch, currentFilter, sortBy]);

  const resetForm = () => {
    setFormData({ name: '', type: 'otc', expireDate: '', effect: '', usage: '', taboo: '', factory: '', tags: '', note: '', image: null, imageFeature: null });
    setEditingMed(null);
  };

  const openAddModal = () => {
    resetForm(); setRecognizedText(''); setRecognizeError(''); setRecognizing(false);
    setMatchedMedicine(null); setExtractedInfo(null); setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false); setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus('');
    setRecognizedText(''); setRecognizeError(''); setMatchedMedicine(null); setExtractedInfo(null);
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
      showToast('正在处理图片…');
      const compressed = await compressImage(file);
      const feature = await computeImageHash(compressed);
      setFormData((prev) => ({ ...prev, image: compressed, imageFeature: feature }));
      showToast('图片上传成功，正在识别…', 'success');
      setRecognizing(true); setRecognizeProgress(0); setRecognizeStatus('开始识别');
      setRecognizedText(''); setRecognizeError(''); setMatchedMedicine(null); setExtractedInfo(null); setRecognizeQuality(0);
      try {
        const result = await recognizeMedicine(compressed, (progress, status) => {
          setRecognizeProgress(Math.round(progress * 100)); setRecognizeStatus(status);
        });
        setRecognizedText(result.text);
        setRecognizeQuality(result.quality || 0);
        if (result.medicine) {
          setMatchedMedicine(result.medicine);
          showToast(`识别成功：${result.medicine.name}，点击一键填充`, 'success');
        } else {
          const { extractInfoFromText } = await import('@/lib/medicineDB');
          const extracted = extractInfoFromText(result.text);
          if (extracted && (extracted.name || extracted.effect)) {
            setExtractedInfo(extracted);
            showToast('识别完成，点击一键填充', '');
          } else {
            showToast('识别结果不清晰，建议手动填写或编辑识别文字', '');
          }
        }
      } catch (err) {
        setRecognizeError(err.message || '识别失败'); showToast('识别失败，可手动填写', 'error');
      } finally { setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus(''); }
    } catch (err) { showToast(err.message || '图片处理失败', 'error'); }
    e.target.value = '';
  };

  const handleReRecognize = async () => {
    if (!formData.image || recognizing) return;
    setRecognizing(true); setRecognizeProgress(0); setRecognizeStatus('开始识别');
    setRecognizedText(''); setRecognizeError(''); setMatchedMedicine(null); setExtractedInfo(null); setRecognizeQuality(0);
    try {
      const result = await recognizeMedicine(formData.image, (progress, status) => {
        setRecognizeProgress(Math.round(progress * 100)); setRecognizeStatus(status);
      });
      setRecognizedText(result.text);
      setRecognizeQuality(result.quality || 0);
      if (result.medicine) { setMatchedMedicine(result.medicine); showToast('识别成功', 'success'); }
      else {
        const { extractInfoFromText } = await import('@/lib/medicineDB');
        const extracted = extractInfoFromText(result.text);
        if (extracted && (extracted.name || extracted.effect)) setExtractedInfo(extracted);
        else showToast('识别结果不清晰，建议手动填写', '');
      }
    } catch (err) { setRecognizeError(err.message || '识别失败'); showToast('识别失败', 'error'); }
    finally { setRecognizing(false); setRecognizeProgress(0); setRecognizeStatus(''); }
  };

  const handleFillFromRecognition = () => {
    if (matchedMedicine) {
      const med = matchedMedicine;
      setFormData((prev) => ({
        ...prev, name: prev.name || med.name, type: med.type || prev.type,
        effect: prev.effect || med.effect || '', usage: prev.usage || med.usage || '',
        taboo: prev.taboo || med.taboo || '', factory: prev.factory || med.factory || '',
        tags: prev.tags || (med.tags ? med.tags.join(', ') : ''), note: prev.note || '',
      }));
      showToast(`已填充：${med.name}`, 'success');
    } else if (extractedInfo && (extractedInfo.name || extractedInfo.effect)) {
      setFormData((prev) => ({
        ...prev, name: prev.name || extractedInfo.name || '', type: extractedInfo.type || prev.type,
        effect: prev.effect || extractedInfo.effect || '', usage: prev.usage || extractedInfo.usage || '',
        taboo: prev.taboo || extractedInfo.taboo || '', factory: prev.factory || extractedInfo.factory || '',
        tags: prev.tags || (extractedInfo.tags && extractedInfo.tags.length > 0 ? extractedInfo.tags.join(', ') : ''),
        note: prev.note || extractedInfo.note || '',
      }));
      showToast('已填充识别信息', 'success');
    } else showToast('识别结果不清晰，请手动填写或编辑识别文字', 'error');
  };

  // 开始编辑识别文字
  const handleStartEditRecognizedText = () => {
    setRecognizedTextDraft(recognizedText);
    setEditingRecognizedText(true);
  };

  // 保存编辑后的识别文字，重新匹配药品
  const handleSaveRecognizedText = async () => {
    const text = recognizedTextDraft.trim();
    if (!text) { showToast('识别文字不能为空', 'error'); return; }
    setRecognizedText(text);
    setEditingRecognizedText(false);
    setMatchedMedicine(null);
    setExtractedInfo(null);
    try {
      const { matchMedicineFromText, extractInfoFromText } = await import('@/lib/medicineDB');
      const medicine = matchMedicineFromText(text);
      if (medicine) {
        setMatchedMedicine(medicine);
        showToast(`已匹配：${medicine.name}，点击一键填充`, 'success');
      } else {
        const extracted = extractInfoFromText(text);
        if (extracted && (extracted.name || extracted.effect)) {
          setExtractedInfo(extracted);
          showToast('已更新识别信息，点击一键填充', '');
        } else {
          showToast('未匹配到药品，可手动填写', '');
        }
      }
    } catch (e) {
      showToast('匹配失败，请手动填写', 'error');
    }
  };

  // 取消编辑识别文字
  const handleCancelEditRecognizedText = () => {
    setEditingRecognizedText(false);
    setRecognizedTextDraft('');
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

  const filters = [
    { key: 'all', label: '全部' }, { key: 'valid', label: '在有效期内' },
    { key: 'expiring', label: '即将过期' }, { key: 'expired', label: '已过期' },
    { key: 'otc', label: '非处方药' }, { key: 'rx', label: '处方药' },
  ];
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
    <main>
      <header className="header">
        <div className="header-inner">
          <div className="header-top">
            <div className="logo">
              <div className="logo-icon"><PillIcon size={24} /></div>
              <div><div className="logo-text">我的药盒</div><div className="logo-sub">个人药品记录 · 随时查药</div></div>
            </div>
            <div className="stats">
              <div className="stat-item"><div className="stat-num">{medicines.length}</div><div className="stat-label">药品</div></div>
              <div className="stat-item stat-item-danger"><div className="stat-num stat-num-danger">{expiredCount}</div><div className="stat-label">过期</div></div>
              <div className="header-actions">
                <button className="logout-btn" onClick={() => setShowSettingsModal(true)} title="设置与管理">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button className="logout-btn" onClick={handleLogout} title="退出登录"><ShieldIcon size={16} /></button>
              </div>
            </div>
          </div>
          <div className="search-bar">
            <div className="search-input-wrap">
              <SearchIcon size={18} />
              <input type="text" className="search-input" placeholder="搜索药名、功效、症状…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" />
              {searchQuery && (<button className="search-clear" onClick={() => setSearchQuery('')} title="清除"><CloseIcon size={14} /></button>)}
            </div>
            <div className="search-actions">
              <button className="btn-ai" onClick={() => { setAiInput(searchQuery); setAiResults([]); setShowAiModal(true); }}><SparklesIcon size={15} /><span>AI关键词</span></button>
              <button className="btn-camera-search" onClick={() => { setCameraResults([]); setShowCameraModal(true); }}><CameraIcon size={18} /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        {filters.map((f) => (<button key={f.key} className={`filter-chip ${currentFilter === f.key ? 'active' : ''}`} onClick={() => setCurrentFilter(f.key)}>{f.label}</button>))}
        <div className="sort-select-wrap">
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {sortOptions.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
        </div>
      </div>

      <div className="container">
        {expiredCount + expiringCount > 0 && (
          <div className="expire-banner" onClick={handleDeleteExpired} style={{ cursor: 'pointer' }}>
            <WarningIcon size={22} />
            <div className="expire-banner-text">有 <strong>{expiredCount + expiringCount}</strong> 种药品已过期或即将过期，点击清理过期药品</div>
          </div>
        )}
        <div className="section-title"><h2>我的药品</h2><span>共 {filteredMedicines.length} 种</span></div>
        {filteredMedicines.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><PillIcon size={36} /></div>
            <h3>{searchQuery || currentFilter !== 'all' ? '没有找到匹配的药品' : '还没有记录药品'}</h3>
            <p>{searchQuery || currentFilter !== 'all' ? '试试其他关键词或筛选条件' : '点击右下角 + 号，拍照或上传药品图片开始记录'}</p>
          </div>
        ) : (
          <div className="med-grid">
            {filteredMedicines.map((med, index) => {
              const exp = getExpireStatus(med.expireDate);
              return (
                <div key={med.id} className="med-card" style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }} onClick={() => { setDetailMed(med); setShowDetailModal(true); }}>
                  <div className="med-card-img">
                    {med.image ? (<img src={med.image} alt={med.name} loading="lazy" />) : (<div className="placeholder"><PillIcon size={48} /><span>暂无图片</span></div>)}
                    {exp.status !== 'unknown' && <span className={`med-badge ${exp.class}`}>{exp.label}</span>}
                  </div>
                  <div className="med-card-body">
                    <div className="med-card-name">{med.name}{med.type === 'rx' && <span className="rx">Rx</span>}</div>
                    <div className="med-card-effect">{med.effect || '暂无功效描述'}</div>
                    {med.tags && med.tags.length > 0 && (<div className="med-card-tags">{med.tags.slice(0, 3).map((tag, i) => (<span key={i} className="med-tag">{tag}</span>))}</div>)}
                    <div className="med-card-meta"><span className="date"><CalendarIcon size={13} />{formatDate(med.expireDate)}</span><span className="type">{getTypeLabel(med.type)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="fab" onClick={openAddModal}><PlusIcon size={28} /></button>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="modal">
            <div className="modal-header"><h3>{editingMed ? '编辑药品' : '添加药品'}</h3><button className="modal-close" onClick={() => closeAddModal()}><CloseIcon size={20} /></button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">药品图片</label>
                {formData.image ? (
                  <div className="upload-preview">
                    <img src={formData.image} alt="预览" />
                    <button className="upload-remove" onClick={(e) => { e.stopPropagation(); setFormData((prev) => ({ ...prev, image: null, imageFeature: null })); setRecognizedText(''); }}><CloseIcon size={16} /></button>
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
                {(matchedMedicine || extractedInfo) && !recognizing && (
                  <div className="recognize-result">
                    <div className="recognize-result-header">
                      <div className="recognize-result-icon"><CheckIcon size={16} /></div>
                      <div className="recognize-result-info">
                        <div className="recognize-result-title">{matchedMedicine ? `已匹配：${matchedMedicine.name}` : '已识别药品信息'}</div>
                        <div className="recognize-result-sub">{matchedMedicine ? matchedMedicine.effect.substring(0, 40) + (matchedMedicine.effect.length > 40 ? '…' : '') : extractedInfo?.name || '点击下方按钮填充'}</div>
                      </div>
                      {recognizeQuality > 0 && recognizeQuality < 0.5 && (
                        <span className="recognize-quality-badge low">识别度低</span>
                      )}
                    </div>
                    <button className="btn-auto-fill" onClick={handleFillFromRecognition}><ZapIcon size={15} />一键填充</button>
                  </div>
                )}
                {recognizeError && !recognizing && (
                  <div className="recognize-error">
                    <div className="recognize-error-header"><WarningIcon size={14} /><span>识别失败</span></div>
                    <p className="recognize-error-text">{recognizeError}</p>
                    {formData.image && (<button className="btn-rerecognize" onClick={handleReRecognize}><ScanIcon size={14} />重新识别</button>)}
                  </div>
                )}
                {recognizedText && !recognizing && (
                  <div className="recognized-text">
                    <div className="recognized-text-header">
                      <ImageIcon size={14} />
                      <span>识别到的文字</span>
                      <div className="recognized-text-actions">
                        {!editingRecognizedText && (
                          <button className="btn-edit-text" onClick={handleStartEditRecognizedText} title="编辑识别文字">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            编辑
                          </button>
                        )}
                        {formData.image && (<button className="btn-rerecognize-small" onClick={handleReRecognize}><ScanIcon size={12} />重新识别</button>)}
                      </div>
                    </div>
                    {editingRecognizedText ? (
                      <div className="recognized-text-edit">
                        <textarea className="form-textarea recognized-textarea" value={recognizedTextDraft} onChange={(e) => setRecognizedTextDraft(e.target.value)} placeholder="编辑识别到的文字，修改后点击保存重新匹配药品" rows={4} />
                        <div className="recognized-text-edit-actions">
                          <button className="btn btn-secondary btn-sm" onClick={handleCancelEditRecognizedText}>取消</button>
                          <button className="btn btn-primary btn-sm" onClick={handleSaveRecognizedText}><CheckIcon size={14} />保存并重新匹配</button>
                        </div>
                      </div>
                    ) : (
                      <p className="recognized-text-content">{recognizedText.slice(0, 300)}{recognizedText.length > 300 ? '…' : ''}</p>
                    )}
                    {recognizeQuality > 0 && recognizeQuality < 0.5 && !editingRecognizedText && (
                      <p className="recognize-quality-hint">识别结果可能不准确，建议点击「编辑」手动修正后再填充</p>
                    )}
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
              <div className="detail-img">{detailMed.image ? (<img src={detailMed.image} alt={detailMed.name} />) : (<div className="placeholder"><PillIcon size={64} /></div>)}</div>
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

      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.message}</div>
    </main>
  );
}
