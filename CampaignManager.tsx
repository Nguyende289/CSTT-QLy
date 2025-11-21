import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Campaign, CampaignTarget } from '../types';
import { Target, Plus, Edit, Calendar, Save, X, Trash2, FileText, Briefcase, PenTool, History, Filter } from 'lucide-react';

const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'active' | 'week' | 'month' | 'custom'>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  
  // Selected Campaign for Daily Entry
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Create/Edit Form State
  const [formData, setFormData] = useState<Partial<Campaign>>({
     targets: []
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Temp target state for the form
  const [tempName, setTempName] = useState('');
  const [tempTarget, setTempTarget] = useState<number | string>('');
  const [tempUnit, setTempUnit] = useState('');

  // Daily Entry State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyValues, setDailyValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
    // Default custom dates to current month for initial reference
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const data = await StorageService.getCampaigns();
    setCampaigns(data);
  };

  // --- FILTER LOGIC ---
  const handleFilterChange = (type: typeof filterType) => {
      setFilterType(type);
      const today = new Date();
      if (type === 'week') {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
          const first = new Date(today.setDate(diff));
          const last = new Date(today.setDate(diff + 6));
          setStartDate(first.toISOString().split('T')[0]);
          setEndDate(last.toISOString().split('T')[0]);
      } else if (type === 'month') {
          const first = new Date(today.getFullYear(), today.getMonth(), 1);
          const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setStartDate(first.toISOString().split('T')[0]);
          setEndDate(last.toISOString().split('T')[0]);
      }
  };

  const filteredCampaigns = useMemo(() => {
      if (filterType === 'all') return campaigns;
      if (filterType === 'active') return campaigns.filter(c => c.status === 'Active');

      return campaigns.filter(c => {
          // Check for overlap between campaign duration and filter period
          const cStart = c.startDate;
          const cEnd = c.endDate;
          // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
          return (cStart <= endDate) && (cEnd >= startDate);
      });
  }, [campaigns, filterType, startDate, endDate]);


  // --- CREATE/EDIT CAMPAIGN LOGIC ---
  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        targets: [],
        status: 'Active',
        name: '',
        dispatchNumber: '',
        issuingAuthority: '',
        description: '',
    });
    setTempName('');
    setTempTarget('');
    setTempUnit('');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (campaign: Campaign) => {
      setIsEditing(true);
      setFormData({ ...campaign });
      setTempName('');
      setTempTarget('');
      setTempUnit('');
      setShowCreateModal(true);
  };

  // FIXED: Robust Add Target Logic
  const handleAddTarget = () => {
    if(!tempName || !tempTarget) {
        alert("Vui lòng nhập tên và số lượng chỉ tiêu");
        return;
    }
    const val = Number(tempTarget);
    if (val <= 0) return;

    const newT: CampaignTarget = {
        id: Date.now().toString() + Math.random().toString().slice(2, 5), // Ensure unique ID
        name: tempName,
        target: val,
        current: 0,
        unit: tempUnit || 'vụ'
    };

    // Use functional state update to ensure latest state
    setFormData(prev => ({
        ...prev,
        targets: [...(prev.targets || []), newT]
    }));

    // Clear inputs
    setTempName('');
    setTempTarget('');
    setTempUnit('');
  };

  const handleRemoveTarget = (id: string) => {
    setFormData(prev => ({
        ...prev,
        targets: prev.targets?.filter(t => t.id !== id)
    }));
  };

  const handleSaveCampaign = async () => {
    // Validation
    if (!formData.name) {
        alert("Vui lòng nhập Tên chuyên đề");
        return;
    }
    if (!formData.startDate || !formData.endDate) {
        alert("Vui lòng nhập thời gian triển khai");
        return;
    }
    
    const newCampaign = {
        ...formData,
        id: formData.id || Date.now().toString(),
        logs: formData.logs || [],
        dispatchNumber: formData.dispatchNumber || 'Đang cập nhật', // Default if empty
        issuingAuthority: formData.issuingAuthority || '',
        description: formData.description || '',
        targets: formData.targets || []
    } as Campaign;

    await StorageService.saveCampaign(newCampaign);
    await loadData();
    setShowCreateModal(false);
    setIsEditing(false);
    // alert("Đã lưu thành công!");
  };

  const handleDeleteCampaign = async (id: string) => {
      if (confirm('Bạn có chắc muốn xóa chuyên đề này?')) {
          await StorageService.deleteCampaign(id);
          loadData();
      }
  };


  // --- DAILY ENTRY LOGIC ---
  const handleOpenDaily = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEntryDate(new Date().toISOString().split('T')[0]);
    // Reset values
    const initialVals: Record<string, number> = {};
    campaign.targets.forEach(t => initialVals[t.id] = 0);
    setDailyValues(initialVals);
    setShowDailyModal(true);
  };

  const handleSaveDaily = async () => {
     if (!selectedCampaign) return;
     
     const resultsToLog = Object.entries(dailyValues)
        .filter(([_, val]) => (val as number) > 0)
        .map(([tId, val]) => ({ targetId: tId, value: val as number }));

     if (resultsToLog.length === 0) {
         alert("Chưa nhập kết quả nào > 0");
         return;
     }

     await StorageService.logCampaignDailyProgress(selectedCampaign.id, entryDate, resultsToLog);
     await loadData();
     
     // Refresh local selected campaign
     const updatedList = await StorageService.getCampaigns();
     const updatedCampaign = updatedList.find(c => c.id === selectedCampaign.id);
     if (updatedCampaign) setSelectedCampaign(updatedCampaign);
     
     // Reset
     setDailyValues(Object.keys(dailyValues).reduce((acc, key) => ({...acc, [key]: 0}), {}));
     alert("Đã cập nhật kết quả!");
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           <Briefcase className="text-blue-600" /> Theo Dõi Chuyên Đề & Sự Kiện
        </h1>
        <button 
           onClick={handleOpenCreate}
           className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow font-bold whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Tạo chuyên đề mới
        </button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg flex-wrap">
            <button onClick={() => handleFilterChange('active')} className={`px-3 py-1 text-sm rounded transition ${filterType === 'active' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500'}`}>Đang triển khai</button>
            <button onClick={() => handleFilterChange('all')} className={`px-3 py-1 text-sm rounded transition ${filterType === 'all' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500'}`}>Tất cả</button>
            <button onClick={() => handleFilterChange('week')} className={`px-3 py-1 text-sm rounded transition ${filterType === 'week' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500'}`}>Tuần này</button>
            <button onClick={() => handleFilterChange('month')} className={`px-3 py-1 text-sm rounded transition ${filterType === 'month' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500'}`}>Tháng này</button>
            <button onClick={() => setFilterType('custom')} className={`px-3 py-1 text-sm rounded transition ${filterType === 'custom' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500'}`}>Tùy chọn</button>
         </div>

         <div className="flex items-center gap-2 text-sm bg-slate-50 border px-3 py-2 rounded">
            <Filter className="w-4 h-4 text-slate-400" />
            <input type="date" className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterType('custom'); }} />
            <span className="text-slate-500">-</span>
            <input type="date" className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterType('custom'); }} />
         </div>
      </div>

      <div className="space-y-8">
        {filteredCampaigns.length === 0 && <div className="text-center text-slate-400 py-10 bg-white rounded-lg shadow-sm">Không có chuyên đề nào trong khoảng thời gian này.</div>}
        
        {filteredCampaigns.map(campaign => (
          <div key={campaign.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 relative group">
            {/* Header Section */}
            <div className="bg-slate-50 p-4 border-b flex flex-col md:flex-row justify-between md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-police-800 uppercase">{campaign.name}</h2>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${campaign.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {campaign.status === 'Active' ? 'Đang triển khai' : 'Đã kết thúc'}
                    </span>
                </div>
                <div className="text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> <strong>Công văn:</strong> {campaign.dispatchNumber} {campaign.dispatchDate && `(Ngày ${new Date(campaign.dispatchDate).toLocaleDateString('vi-VN')})`}</p>
                    <p className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400"/> <strong>Của:</strong> {campaign.issuingAuthority}</p>
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400"/> <strong>Thời gian:</strong> {new Date(campaign.startDate).toLocaleDateString('vi-VN')} - {new Date(campaign.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
                {campaign.description && (
                    <p className="text-sm text-slate-500 mt-2 italic bg-slate-100 p-2 rounded border border-slate-200">
                        " {campaign.description} "
                    </p>
                )}
              </div>
              
              <div className="flex gap-2 self-start">
                 <button onClick={() => handleOpenEdit(campaign)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded flex items-center gap-1 text-sm font-medium"><Edit className="w-4 h-4"/> Sửa</button>
                 <button onClick={() => handleDeleteCampaign(campaign.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                 <button 
                    onClick={() => handleOpenDaily(campaign)}
                    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold text-sm whitespace-nowrap"
                 >
                    <PenTool className="w-4 h-4" /> Nhập kết quả
                 </button>
              </div>
            </div>

            {/* Targets Section */}
            <div className="p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Tiến độ chỉ tiêu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaign.targets.map(target => {
                    const percent = target.target > 0 ? Math.min(100, Math.round((target.current / target.target) * 100)) : 0;
                    return (
                    <div key={target.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-police-600" /> {target.name}
                        </span>
                        </div>
                        
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-2xl font-bold text-police-700">{target.current}</span>
                            <span className="text-sm text-slate-500">/ {target.target} {target.unit}</span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
                            <div 
                                className={`h-2 rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-green-500' : 'bg-police-600'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs font-bold text-police-600 mt-1">{percent}%</div>
                    </div>
                    );
                })}
                {campaign.targets.length === 0 && <div className="col-span-3 text-center text-slate-400 italic">Chưa cập nhật chỉ tiêu</div>}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- CREATE/EDIT MODAL --- */}
      {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="bg-police-900 text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0">
                      <h3 className="font-bold">{isEditing ? 'Chỉnh Sửa Chuyên Đề' : 'Tạo Chuyên Đề / Sự Kiện Mới'}</h3>
                      <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {/* Basic Info */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700">Tên chuyên đề / Sự kiện</label>
                          <input type="text" className="w-full border p-2 rounded mt-1" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ví dụ: Cao điểm tấn công trấn áp tội phạm..." />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Số công văn</label>
                              <input type="text" className="w-full border p-2 rounded mt-1" value={formData.dispatchNumber || ''} onChange={e => setFormData({...formData, dispatchNumber: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Ngày công văn</label>
                              <input type="date" className="w-full border p-2 rounded mt-1" value={formData.dispatchDate || ''} onChange={e => setFormData({...formData, dispatchDate: e.target.value})} />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700">Cơ quan ban hành (Của)</label>
                          <input type="text" className="w-full border p-2 rounded mt-1" value={formData.issuingAuthority || ''} onChange={e => setFormData({...formData, issuingAuthority: e.target.value})} placeholder="Ví dụ: CA Huyện, UBND Tỉnh..." />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nội dung / Mô tả</label>
                          <textarea className="w-full border p-2 rounded mt-1" rows={2} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
                              <input type="date" className="w-full border p-2 rounded mt-1" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Ngày kết thúc</label>
                              <input type="date" className="w-full border p-2 rounded mt-1" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                          </div>
                      </div>

                      {/* Targets Builder */}
                      <div className="bg-slate-50 p-4 rounded border">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Danh sách chỉ tiêu</label>
                          
                          <div className="flex gap-2 mb-3 items-end">
                              <div className="flex-1">
                                  <input type="text" placeholder="Tên chỉ tiêu (VD: Nồng độ cồn)" className="w-full border p-2 rounded text-sm" value={tempName} onChange={e => setTempName(e.target.value)} />
                              </div>
                              <div className="w-20">
                                  <input type="number" placeholder="SL" className="w-full border p-2 rounded text-sm" value={tempTarget} onChange={e => setTempTarget(e.target.value)} />
                              </div>
                              <div className="w-20">
                                  <input type="text" placeholder="Đơn vị" className="w-full border p-2 rounded text-sm" value={tempUnit} onChange={e => setTempUnit(e.target.value)} />
                              </div>
                              <button onClick={handleAddTarget} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 shadow"><Plus className="w-4 h-4"/></button>
                          </div>

                          <ul className="space-y-2 max-h-40 overflow-y-auto">
                              {formData.targets?.map((t, idx) => (
                                  <li key={t.id || idx} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm text-sm">
                                      <span className="font-medium">{t.name}</span>
                                      <div className="flex items-center gap-3">
                                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">{t.target} {t.unit}</span>
                                          <button onClick={() => handleRemoveTarget(t.id)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4"/></button>
                                      </div>
                                  </li>
                              ))}
                              {(!formData.targets || formData.targets.length === 0) && <li className="text-xs text-slate-400 italic text-center py-2">Chưa có chỉ tiêu nào được thêm</li>}
                          </ul>
                      </div>
                  </div>

                  <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0 bg-white rounded-b-lg">
                      <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                      <button onClick={handleSaveCampaign} className="px-6 py-2 bg-police-600 text-white rounded hover:bg-police-700 font-bold shadow">Lưu chuyên đề</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- DAILY ENTRY MODAL --- */}
      {showDailyModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
               <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                  <div className="bg-green-700 text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0">
                      <div>
                          <h3 className="font-bold">Nhập Kết Quả Hằng Ngày</h3>
                          <p className="text-xs text-green-200 opacity-80">{selectedCampaign.name}</p>
                      </div>
                      <button onClick={() => setShowDailyModal(false)}><X className="w-5 h-5"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-slate-50 p-4 rounded border mb-6">
                          <div className="mb-4">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Chọn ngày báo cáo</label>
                              <input type="date" className="w-full border p-2 rounded font-bold text-slate-800" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                          </div>

                          <div className="space-y-3">
                              {selectedCampaign.targets.map(target => (
                                  <div key={target.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                      <div>
                                          <p className="font-bold text-slate-700 text-sm">{target.name}</p>
                                          <p className="text-xs text-slate-400">Lũy kế: {target.current}/{target.target} {target.unit}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">Thêm:</span>
                                          <input 
                                              type="number" min="0"
                                              className="w-20 border p-1.5 rounded text-center font-bold focus:ring-2 focus:ring-green-500 outline-none" 
                                              placeholder="0"
                                              value={dailyValues[target.id] || ''}
                                              onChange={(e) => setDailyValues({...dailyValues, [target.id]: parseInt(e.target.value) || 0})}
                                          />
                                          <span className="text-sm text-slate-600 w-10">{target.unit}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                             <button onClick={handleSaveDaily} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow flex items-center gap-2">
                                 <Save className="w-4 h-4" /> Cập nhật ngay
                             </button>
                          </div>
                      </div>

                      {/* HISTORY TABLE SECTION */}
                      <div className="border-t pt-4">
                         <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Lịch sử nhập liệu</h4>
                         <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th className="p-2 border-b font-semibold border-r min-w-[100px]">Ngày</th>
                                        {selectedCampaign.targets.map(t => (
                                            <th key={t.id} className="p-2 border-b font-semibold border-r whitespace-nowrap">{t.name} <span className="text-xs font-normal">({t.unit})</span></th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCampaign.logs && selectedCampaign.logs.length > 0 ? (
                                        [...selectedCampaign.logs]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((log, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 border-b last:border-b-0">
                                                <td className="p-2 border-r text-slate-800 font-medium">{new Date(log.date).toLocaleDateString('vi-VN')}</td>
                                                {selectedCampaign.targets.map(t => {
                                                    const res = log.results.find(r => r.targetId === t.id);
                                                    return (
                                                        <td key={t.id} className="p-2 border-r text-center text-slate-600">
                                                            {res ? <span className="font-bold text-blue-600">+{res.value}</span> : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={selectedCampaign.targets.length + 1} className="p-6 text-center text-slate-400 italic">
                                                Chưa có dữ liệu nhập hàng ngày
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                      </div>
                  </div>

                  <div className="p-4 border-t flex justify-end bg-slate-50 rounded-b-lg flex-shrink-0">
                      <button onClick={() => setShowDailyModal(false)} className="px-5 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-medium">Đóng</button>
                  </div>
               </div>
          </div>
      )}
    </div>
  );
};

export default CampaignManager;