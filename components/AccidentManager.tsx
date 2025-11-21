import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { AccidentCase } from '../types';
import { Plus, AlertTriangle, Skull, Activity, MapPin, Save, X, Eye, Trash2, Edit, Filter, CheckCircle } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'view' | 'edit';
type FilterType = 'all' | 'week' | 'month';

const AccidentManager: React.FC = () => {
  const [accidents, setAccidents] = useState<AccidentCase[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [formData, setFormData] = useState<Partial<AccidentCase>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await StorageService.getAccidents();
    setAccidents(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // --- FILTER LOGIC ---
  const filteredAccidents = useMemo(() => {
    const now = new Date();
    return accidents.filter(item => {
      const itemDate = new Date(item.date);
      
      if (filterType === 'month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      
      if (filterType === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday start
        startOfWeek.setHours(0,0,0,0);
        return itemDate >= startOfWeek;
      }
      
      return true;
    });
  }, [accidents, filterType]);

  // --- ACTIONS ---

  const handleAddNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      fatalities: 0,
      injuries: 0,
      estimatedDamage: 0,
      alcoholLevel: 0,
      status: 'Đang điều tra',
      handlingUnit: 'Đội CSTT',
      result: ''
    });
    setViewMode('create');
  };

  const handleViewDetail = (item: AccidentCase) => {
    setFormData({ ...item });
    setViewMode('view');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any bubbling
    setViewMode('edit');
  };

  const handleDelete = async () => {
    if (!formData.id) {
      alert("Lỗi: Không tìm thấy ID vụ việc.");
      return;
    }
    
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa vụ việc này không? Hành động này không thể hoàn tác.');
    if (confirmDelete) {
      await StorageService.deleteAccident(formData.id);
      setFormData({}); // Clear form data
      setViewMode('list'); // Switch to list view FIRST
      await loadData(); // Then reload data
      // alert("Đã xóa thành công.");
    }
  };

  const handleClose = () => {
    setViewMode('list');
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location || !formData.content) return;

    const newCase = {
      ...formData,
      id: formData.id || Date.now().toString(),
    } as AccidentCase;

    await StorageService.saveAccident(newCase);
    await loadData();
    setViewMode('view'); // Switch back to view mode after saving instead of list to confirm changes
    setFormData(newCase);
  };

  // Stats for current view
  const totalCases = filteredAccidents.length;
  const totalDead = filteredAccidents.reduce((sum, i) => sum + (i.fatalities || 0), 0);
  const totalInjured = filteredAccidents.reduce((sum, i) => sum + (i.injuries || 0), 0);
  const totalDamage = filteredAccidents.reduce((sum, i) => sum + (i.estimatedDamage || 0), 0);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="text-red-600" /> Quản Lý Tai Nạn Giao Thông
        </h1>
        <button 
          onClick={handleAddNew}
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 shadow w-fit"
        >
          <Plus className="w-4 h-4" /> Nhập vụ việc mới
        </button>
      </div>

      {/* Filters & Stats Bar */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setFilterType('all')}
             className={`px-3 py-1 text-sm rounded-md transition ${filterType === 'all' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Tất cả
           </button>
           <button 
             onClick={() => setFilterType('month')}
             className={`px-3 py-1 text-sm rounded-md transition ${filterType === 'month' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Tháng này
           </button>
           <button 
             onClick={() => setFilterType('week')}
             className={`px-3 py-1 text-sm rounded-md transition ${filterType === 'week' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Tuần này
           </button>
        </div>

        <div className="flex gap-4 text-sm">
           <div className="flex items-center gap-1">
              <span className="text-slate-500">Số vụ:</span>
              <span className="font-bold text-slate-800">{totalCases}</span>
           </div>
           <div className="flex items-center gap-1">
              <Skull className="w-4 h-4 text-red-500" />
              <span className="font-bold text-red-600">{totalDead}</span>
           </div>
           <div className="flex items-center gap-1">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-600">{totalInjured}</span>
           </div>
           <div className="hidden md:flex items-center gap-1">
              <span className="text-slate-500">Thiệt hại:</span>
              <span className="font-bold text-slate-800">{(totalDamage/1000000).toFixed(1)} Tr</span>
           </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Thời gian & Địa điểm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nội dung</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Hậu quả</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-sm">
              {filteredAccidents.map(item => (
                <tr 
                  key={item.id} 
                  className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  onClick={() => handleViewDetail(item)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{item.date}</div>
                    <div className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate" title={item.content}>{item.content}</div>
                    {item.alcoholLevel > 0 && <span className="text-xs text-red-600 font-semibold">Cồn: {item.alcoholLevel} mg/L</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-3">
                      {item.fatalities > 0 && (
                         <span className="flex items-center gap-1 text-red-600 font-bold" title="Số người chết">
                           <Skull className="w-4 h-4" /> {item.fatalities}
                         </span>
                      )}
                      {item.injuries > 0 && (
                         <span className="flex items-center gap-1 text-orange-500 font-bold" title="Số người bị thương">
                           <Activity className="w-4 h-4" /> {item.injuries}
                         </span>
                      )}
                      {item.fatalities === 0 && item.injuries === 0 && <span className="text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'Đã xử lý' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-full">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAccidents.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không tìm thấy dữ liệu phù hợp</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Modal */}
      {viewMode !== 'list' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className={`${viewMode === 'view' ? 'bg-slate-800' : 'bg-red-600'} text-white p-4 flex justify-between items-center flex-shrink-0`}>
              <h3 className="font-bold text-lg">
                {viewMode === 'create' && 'Nhập vụ việc mới'}
                {viewMode === 'edit' && 'Chỉnh sửa hồ sơ'}
                {viewMode === 'view' && 'Chi tiết hồ sơ vụ việc'}
              </h3>
              <button onClick={handleClose} className="hover:bg-white/20 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>
            
            {/* Modal Body - Form */}
            <div className="overflow-y-auto p-6">
              <form id="accidentForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section 1: Basic Info */}
                <div className="md:col-span-2 bg-slate-50 p-4 rounded border border-slate-200">
                   <h4 className="text-sm font-bold text-slate-700 mb-3 border-b pb-1">1. Thông tin chung</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Ngày xảy ra</label>
                        <input 
                          type="date" 
                          disabled={viewMode === 'view'}
                          required
                          className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-600"
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Địa điểm</label>
                        <input 
                          type="text" 
                          disabled={viewMode === 'view'}
                          required
                          placeholder="Ví dụ: Ngã 4 Trần Phú - Điện Biên"
                          className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-600"
                          value={formData.location || ''}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Nội dung vụ việc</label>
                        <textarea 
                          disabled={viewMode === 'view'}
                          required
                          rows={3}
                          className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-600"
                          value={formData.content || ''}
                          onChange={e => setFormData({...formData, content: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                {/* Section 2: Consequences */}
                <div className="md:col-span-2 bg-red-50 p-4 rounded border border-red-100">
                   <h4 className="text-sm font-bold text-red-800 mb-3 border-b border-red-200 pb-1">2. Hậu quả & Thiệt hại</h4>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500">Số người chết</label>
                        <input type="number" min="0" disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.fatalities} onChange={e => setFormData({...formData, fatalities: parseInt(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500">Số người bị thương</label>
                        <input type="number" min="0" disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.injuries} onChange={e => setFormData({...formData, injuries: parseInt(e.target.value)})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500">Thiệt hại ước tính (VNĐ)</label>
                        <input type="number" min="0" disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.estimatedDamage} onChange={e => setFormData({...formData, estimatedDamage: parseInt(e.target.value)})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500">Nồng độ cồn (mg/L)</label>
                        <input type="number" step="0.01" min="0" disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.alcoholLevel} onChange={e => setFormData({...formData, alcoholLevel: parseFloat(e.target.value)})} />
                      </div>
                   </div>
                </div>

                {/* Section 3: Processing Status & Result (New Field) */}
                <div className="md:col-span-2 bg-blue-50 p-4 rounded border border-blue-100">
                   <h4 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-200 pb-1">3. Kết quả xử lý</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Đơn vị thụ lý</label>
                        <input type="text" disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.handlingUnit || ''} onChange={e => setFormData({...formData, handlingUnit: e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Trạng thái hồ sơ</label>
                        <select disabled={viewMode === 'view'} className="w-full border p-2 rounded disabled:bg-slate-100" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                          <option value="Đang điều tra">Đang điều tra</option>
                          <option value="Đã xử lý">Đã xử lý</option>
                          <option value="Chuyển cơ quan khác">Chuyển cơ quan khác</option>
                          <option value="Tạm đình chỉ">Tạm đình chỉ</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Kết quả giải quyết</label>
                         <textarea 
                            disabled={viewMode === 'view'}
                            rows={3}
                            placeholder="Ghi rõ kết quả: Đã khởi tố, đã phạt hành chính (số tiền), hòa giải..."
                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-600 border-blue-200"
                            value={formData.result || ''}
                            onChange={e => setFormData({...formData, result: e.target.value})}
                         />
                      </div>
                   </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 flex-shrink-0">
               {viewMode === 'view' ? (
                 <>
                   <button 
                      type="button" 
                      onClick={handleDelete} 
                      className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-2 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" /> Xóa hồ sơ
                   </button>
                   <button 
                      type="button" 
                      onClick={handleEdit} 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 shadow transition-colors"
                   >
                     <Edit className="w-4 h-4" /> Sửa thông tin
                   </button>
                   <button 
                      type="button" 
                      onClick={handleClose} 
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                   >
                     Thoát
                   </button>
                 </>
               ) : (
                 <>
                   <button 
                      type="button" 
                      onClick={() => {
                         if (viewMode === 'edit') {
                             setViewMode('view'); 
                             setFormData(accidents.find(a => a.id === formData.id) || {});
                         } else {
                             handleClose();
                         }
                      }} 
                      className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded transition-colors"
                   >
                     Hủy bỏ
                   </button>
                   <button 
                      type="submit" 
                      form="accidentForm" 
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 shadow transition-colors font-bold"
                   >
                     <Save className="w-4 h-4" /> Lưu hồ sơ
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccidentManager;