'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PillIcon, SearchIcon, CameraIcon, PlusIcon, CloseIcon, SaveIcon,
  EditIcon, TrashIcon, CalendarIcon, WarningIcon, CheckIcon, ClockIcon,
  BanIcon, FactoryIcon, TagIcon, NoteIcon, SparklesIcon, UploadIcon,
  ImageIcon, ScanIcon, ZapIcon, ShieldIcon, HeartIcon,
} from '@/components/Icons';
import {
  loadMedicines, saveMedicines, genId, getExpireStatus, getTypeLabel, formatDate,
} from '@/lib/storage';
import { compressImage, computeImageHash, searchByImage } from '@/lib/imageUtils';
import { generateKeywords } from '@/lib/keywords';

export default function Home() {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [detailMed, setDetailMed] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [aiInput, setAiInput] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [cameraResults, setCameraResults] = useState([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: 'otc', expireDate: '', effect: '', usage: '',
    taboo: '', factory: '', tags: '', note: '', image: null, imageFeature: null,
  });

  const fileInputRef = useRef(null);
  const cameraFileInputRef = useRef(null);

  useEffect(() => { setMedicines(loadMedicines()); }, []);

  const showToast = useCallback((message, type = '') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 2500);
  }, []);

  const filteredMedicines = medicines
    .filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchText = [m.name, m.effect, m.usage, m.taboo, m.factory, m.note, (m.tags || []).join(' ')].join(' ').toLowerCase();
        if (!searchText.includes(q)) return false;
      }
      if (currentFilter === 'valid') return getExpireStatus(m.expireDate).status === 'good';
      if (currentFilter === 'expiring') return getExpireStatus(m.expireDate).status === 'expiring';
      if (currentFilter === 'expired') return getExpireStatus(m.expireDate).status === 'expired';
      if (currentFilter === 'otc') return m.type === 'otc';
      if (currentFilter === 'rx') return m.type === 'rx';
      return true;
    })
    .sort((a, b) => {
      const order = { expired: 0, expiring: 1, unknown: 2, good: 3 };
      const sa = getExpireStatus(a.expireDate);
      const sb = getExpireStatus(b.expireDate);
      return (order[sa.status] || 3) - (order[sb.status] || 3);
    });

  const expiredCount = medicines.filter((m) => getExpireStatus(m.expireDate).status === 'expired').length;
  const expiringCount = medicines.filter((m) => getExpireStatus(m.expireDate).status === 'expiring').length;

  const resetForm = () => {
    setFormData({ name: '', type: 'otc', expireDate: '', effect: '', usage: '', taboo: '', factory: '', tags: '', note: '', image: null, imageFeature: null });
    setEditingMed(null);
  };

  const openAddModal = () => { resetForm(); setShowAddModal(true); };

  const openEditModal = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name || '', type: med.type || 'otc', expireDate: med.expireDate || '',
      effect: med.effect || '', usage: med.usage || '', taboo: med.taboo || '',
      factory: med.factory || '', tags: (med.tags || []).join(', '), note: med.note || '',
      image: med.image || null, imageFeature: med.imageFeature || null,
    });
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('正在处理图片…');
      const compressed = await compressImage(file);
      const feature = await computeImageHash(compressed);
      setFormData((prev) => ({ ...prev, image: compressed, imageFeature: feature }));
      showToast('图片上传成功', 'success');
    } catch (err) {
      showToast('图片处理失败，请重试', 'error');
    }
    e.target.value = '';
  };

  const handleSaveMed = () => {
    if (!formData.name.trim()) { showToast('请填写药品名称', 'error'); return; }
    const med = {
      id: editingMed ? editingMed.id : genId(),
      name: formData.name.trim(), type: formData.type, expireDate: formData.expireDate,
      effect: formData.effect.trim(), usage: formData.usage.trim(), taboo: formData.taboo.trim(),
      factory: formData.factory.trim(), tags: formData.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      note: formData.note.trim(), image: formData.image, imageFeature: formData.imageFeature,
      createdAt: editingMed ? editingMed.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    let newMedicines;
    if (editingMed) {
      newMedicines = medicines.map((m) => (m.id === editingMed.id ? med : m));
      showToast('药品信息已更新', 'success');
    } else {
      newMedicines = [med, ...medicines];
      showToast('药品添加成功', 'success');
    }
    setMedicines(newMedicines);
    saveMedicines(newMedicines);
    setShowAddModal(false);
    resetForm();
  };

  const handleDeleteMed = (med) => {
    if (!confirm('确定要删除这个药品记录吗？')) return;
    const newMedicines = medicines.filter((m) => m.id !== med.id);
    setMedicines(newMedicines);
    saveMedicines(newMedicines);
    setShowDetailModal(false);
    showToast('药品已删除', 'success');
  };

  const handleAiGenerate = () => {
    if (!aiInput.trim()) { showToast('请输入药品名称或症状', 'error'); return; }
    setAiLoading(true);
    setAiResults([]);
    setTimeout(() => {
      const results = generateKeywords(aiInput.trim());
      setAiResults(results);
      setAiLoading(false);
    }, 800);
  };

  const useKeyword = (keyword) => {
    setSearchQuery(keyword);
    setShowAiModal(false);
    showToast(`已搜索：${keyword}`, 'success');
  };

  const handleCameraSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCameraLoading(true);
    setCameraResults([]);
    try {
      const compressed = await compressImage(file, 600, 0.6);
      const feature = await computeImageHash(compressed);
      const results = searchByImage(feature, medicines, 0.4);
      setCameraResults(results);
      if (results.length === 0) { showToast('未找到相似药品，可先添加记录', 'error'); }
    } catch (err) {
      showToast('图片识别失败，请重试', 'error');
    }
    setCameraLoading(false);
    e.target.value = '';
  };

  const viewFromCameraResult = (med) => {
    setDetailMed(med);
    setShowCameraModal(false);
    setShowDetailModal(true);
  };

  const filters = [
    { key: 'all', label: '全部' }, { key: 'valid', label: '在有效期内' },
    { key: 'expiring', label: '即将过期' }, { key: 'expired', label: '已过期' },
    { key: 'otc', label: '非处方药' }, { key: 'rx', label: '处方药' },
  ];

  return (
    <main>
      <header className="header">
        <div className="header-inner">
          <div className="header-top">
            <div className="logo">
              <div className="logo-icon"><PillIcon size={24} /></div>
              <div>
                <div className="logo-text">我的药盒</div>
                <div className="logo-sub">个人药品记录 · 随时查药</div>
              </div>
            </div>
            <div className="stats">
              <div className="stat-item"><div className="stat-num">{medicines.length}</div><div className="stat-label">药品</div></div>
              <div className="stat-item"><div className="stat-num" style={{ color: '#fecaca' }}>{expiredCount}</div><div className="stat-label">过期</div></div>
            </div>
          </div>
          <div className="search-bar">
            <div className="search-input-wrap">
              <SearchIcon size={18} />
              <input type="text" className="search-input" placeholder="搜索药名、功效、症状…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" />
            </div>
            <div className="search-actions">
              <button className="btn-ai" onClick={() => { setAiInput(searchQuery); setAiResults([]); setShowAiModal(true); }}>
                <SparklesIcon size={15} /><span>AI关键词</span>
              </button>
              <button className="btn-camera-search" onClick={() => { setCameraResults([]); setShowCameraModal(true); }}>
                <CameraIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        {filters.map((f) => (
          <button key={f.key} className={`filter-chip ${currentFilter === f.key ? 'active' : ''}`} onClick={() => setCurrentFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      <div className="container">
        {expiredCount + expiringCount > 0 && (
          <div className="expire-banner">
            <WarningIcon size={22} />
            <div className="expire-banner-text">有 <strong>{expiredCount + expiringCount}</strong> 种药品已过期或即将过期，请及时清理</div>
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
            {filteredMedicines.map((med) => {
              const exp = getExpireStatus(med.expireDate);
              return (
                <div key={med.id} className="med-card" onClick={() => { setDetailMed(med); setShowDetailModal(true); }}>
                  <div className="med-card-img">
                    {med.image ? <img src={med.image} alt={med.name} loading="lazy" /> : (
                      <div className="placeholder"><PillIcon size={48} /><span>暂无图片</span></div>
                    )}
                    {exp.status !== 'unknown' && <span className={`med-badge ${exp.class}`}>{exp.label}</span>}
                  </div>
                  <div className="med-card-body">
                    <div className="med-card-name">{med.name}{med.type === 'rx' && <span className="rx">Rx</span>}</div>
                    <div className="med-card-effect">{med.effect || '暂无功效描述'}</div>
                    {med.tags && med.tags.length > 0 && (
                      <div className="med-card-tags">{med.tags.slice(0, 3).map((tag, i) => <span key={i} className="med-tag">{tag}</span>)}</div>
                    )}
                    <div className="med-card-meta">
                      <span className="date"><CalendarIcon size={13} />{formatDate(med.expireDate)}</span>
                      <span className="type">{getTypeLabel(med.type)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="fab" onClick={openAddModal}><PlusIcon size={28} /></button>

      {showAddModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMed ? '编辑药品' : '添加药品'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><CloseIcon size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">药品图片</label>
                {formData.image ? (
                  <div className="upload-preview">
                    <img src={formData.image} alt="预览" />
                    <button className="upload-remove" onClick={(e) => { e.stopPropagation(); setFormData((prev) => ({ ...prev, image: null, imageFeature: null })); }}><CloseIcon size={16} /></button>
                  </div>
                ) : (
                  <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                    <div className="upload-area-icon"><CameraIcon size={24} /></div>
                    <p><strong>点击拍照</strong> 或选择图片上传</p>
                    <p className="hint">支持药盒、说明书照片，自动压缩优化</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
              <div className="form-group">
                <label className="form-label">药品名称 <span className="required">*</span></label>
                <input type="text" className="form-input" placeholder="如：布洛芬缓释胶囊" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">药品类型</label>
                  <select className="form-select" value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}>
                    <option value="otc">非处方药（OTC）</option>
                    <option value="rx">处方药（Rx）</option>
                    <option value="health">保健品</option>
                    <option value="external">外用药</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">保质期至</label>
                  <input type="date" className="form-input" value={formData.expireDate} onChange={(e) => setFormData((prev) => ({ ...prev, expireDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">主要功效 / 适用症状</label>
                <textarea className="form-textarea" placeholder="如：用于缓解轻至中度疼痛，如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经；也用于普通感冒或流行性感冒引起的发热" value={formData.effect} onChange={(e) => setFormData((prev) => ({ ...prev, effect: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">用法用量</label>
                <textarea className="form-textarea" placeholder="如：口服。成人一次1粒，一日2次（早晚各一次）" value={formData.usage} onChange={(e) => setFormData((prev) => ({ ...prev, usage: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">禁忌人群</label>
                  <input type="text" className="form-input" placeholder="如：孕妇、哺乳期妇女禁用" value={formData.taboo} onChange={(e) => setFormData((prev) => ({ ...prev, taboo: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">生产厂家</label>
                  <input type="text" className="form-input" placeholder="如：中美天津史克制药" value={formData.factory} onChange={(e) => setFormData((prev) => ({ ...prev, factory: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">搜索标签（逗号分隔）</label>
                <input type="text" className="form-input" placeholder="如：止痛,退烧,感冒,头痛,发热" value={formData.tags} onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))} />
                <p className="form-hint">用于快速搜索，可填写症状、功效等关键词</p>
              </div>
              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea className="form-textarea" placeholder="其他需要记录的信息" value={formData.note} onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveMed}><SaveIcon size={17} />保存药品</button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && detailMed && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>药品详情</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><CloseIcon size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-img">
                {detailMed.image ? <img src={detailMed.image} alt={detailMed.name} /> : <div className="placeholder"><PillIcon size={64} /></div>}
              </div>
              <div className="detail-name">{detailMed.name}</div>
              <div className="detail-sub">
                <span>{getTypeLabel(detailMed.type)}</span><span>·</span>
                <span className={`status-${getExpireStatus(detailMed.expireDate).status}`}>
                  {getExpireStatus(detailMed.expireDate).label}
                  {getExpireStatus(detailMed.expireDate).days !== null && `（${getExpireStatus(detailMed.expireDate).days >= 0 ? '还剩' : '已过'} ${Math.abs(getExpireStatus(detailMed.expireDate).days)} 天）`}
                </span>
              </div>
              {detailMed.effect && (
                <div className="detail-section">
                  <div className="detail-section-title"><CheckIcon size={15} />主要功效 / 适用症状</div>
                  <div className="detail-section-content">{detailMed.effect}</div>
                </div>
              )}
              {detailMed.usage && (
                <div className="detail-section">
                  <div className="detail-section-title"><ClockIcon size={15} />用法用量</div>
                  <div className="detail-section-content">{detailMed.usage}</div>
                </div>
              )}
              <div className="form-row">
                {detailMed.taboo && (
                  <div className="detail-section">
                    <div className="detail-section-title"><BanIcon size={15} />禁忌人群</div>
                    <div className="detail-section-content">{detailMed.taboo}</div>
                  </div>
                )}
                {detailMed.factory && (
                  <div className="detail-section">
                    <div className="detail-section-title"><FactoryIcon size={15} />生产厂家</div>
                    <div className="detail-section-content">{detailMed.factory}</div>
                  </div>
                )}
              </div>
              {detailMed.expireDate && (
                <div className="detail-section">
                  <div className="detail-section-title"><CalendarIcon size={15} />保质期</div>
                  <div className="detail-section-content">{formatDate(detailMed.expireDate)}</div>
                </div>
              )}
              {detailMed.tags && detailMed.tags.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title"><TagIcon size={15} />搜索标签</div>
                  <div className="detail-tags">{detailMed.tags.map((tag, i) => <span key={i} className="med-tag">{tag}</span>)}</div>
                </div>
              )}
              {detailMed.note && (
                <div className="detail-section">
                  <div className="detail-section-title"><NoteIcon size={15} />备注</div>
                  <div className="detail-section-content">{detailMed.note}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => openEditModal(detailMed)}><EditIcon size={17} />编辑</button>
              <button className="btn btn-danger" onClick={() => handleDeleteMed(detailMed)}><TrashIcon size={17} />删除</button>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowAiModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>AI 智能关键词</h3>
              <button className="modal-close" onClick={() => setShowAiModal(false)}><CloseIcon size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">输入药品名称或症状描述</label>
                <input type="text" className="form-input" placeholder="如：布洛芬 / 头痛发烧 / 胃不舒服" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()} />
              </div>
              <button className="btn btn-primary btn-block" onClick={handleAiGenerate} style={{ marginBottom: 16 }}><SparklesIcon size={17} />生成搜索关键词</button>
              {aiLoading && (
                <div className="ai-loading"><div className="spinner"></div><p>AI 正在分析并生成关键词…</p></div>
              )}
              {aiResults.length > 0 && (
                <div className="keyword-list">
                  {aiResults.map((kw, i) => (
                    <div key={i} className="keyword-item" onClick={() => useKeyword(kw.main)}>
                      <div className="kw-icon"><ZapIcon size={16} /></div>
                      <div className="kw-text"><div className="kw-main">{kw.main}</div><div className="kw-sub">{kw.sub}</div></div>
                      <div className="kw-use">使用</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCameraModal && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowCameraModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>图片搜药</h3>
              <button className="modal-close" onClick={() => setShowCameraModal(false)}><CloseIcon size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="upload-area" onClick={() => cameraFileInputRef.current?.click()}>
                <div className="upload-area-icon"><ScanIcon size={24} /></div>
                <p><strong>拍照</strong> 或上传药品图片搜索</p>
                <p className="hint">智能识别，在已记录药品中匹配相似图片</p>
              </div>
              <input ref={cameraFileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraSearch} />
              {cameraLoading && (
                <div className="ai-loading" style={{ marginTop: 20 }}><div className="spinner"></div><p>正在识别图片并匹配药品…</p></div>
              )}
              {cameraResults.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>找到 {cameraResults.length} 个相似药品：</p>
                  {cameraResults.map((result, i) => (
                    <div key={i} className="search-result-item" onClick={() => viewFromCameraResult(result.medicine)}>
                      <div className="search-result-img">
                        {result.medicine.image ? <img src={result.medicine.image} alt={result.medicine.name} /> : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PillIcon size={28} /></div>
                        )}
                      </div>
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
