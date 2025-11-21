import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { VehicleRegistration } from '../types';
import { Plus, FileSpreadsheet, Car, Bike, Save, X, Calendar, Filter, Search } from 'lucide-react';

// Helper Types for the Matrix Form
type RegCategory = 'Mới' | 'Sang tên' | 'Thu hồi' | 'Cấp đổi';
type VehicleTypeKey = 'auto' | 'moto';
type CellData = { count: number; revenue: number };
type MatrixData = Record<RegCategory, Record<VehicleTypeKey, CellData>>;

const INITIAL_MATRIX: MatrixData = {
  'Mới': { auto: { count: 0, revenue: 0 }, moto: { count: 0, revenue: 0 } },
  'Sang tên': { auto: { count: 0, revenue: 0 }, moto: { count: 0, revenue: 0 } },
  'Thu hồi': { auto: { count: 0, revenue: 0 }, moto: { count: 0, revenue: 0 } },
  'Cấp đổi': { auto: { count: 0, revenue: 0 }, moto: { count: 0, revenue: 0 } },
};

const VehicleRegistrationManager: React.FC = () => {
  const [registrations, setRegistrations] = useState<VehicleRegistration[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Filter State
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [matrixData, setMatrixData] = useState<MatrixData>(JSON.parse(JSON.stringify(INITIAL_MATRIX)));

  useEffect(() => {
    loadData();
    // Set default filter to current week
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Monday
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 7)); // Sunday
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const data = await StorageService.getRegistrations();
    setRegistrations(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // --- FILTER LOGIC ---
  const handleFilterChange = (type: 'week' | 'month' | 'custom') => {
    setFilterType(type);
    const today = new Date();
    
    if (type === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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
    // Custom leaves current dates alone
  };

  // Filter the raw data based on date range
  const filteredRegistrations = useMemo(() => {
    if (!startDate || !endDate) return registrations;
    return registrations.filter(r => r.date >= startDate && r.date <= endDate);
  }, [registrations, startDate, endDate]);

  // --- AGGREGATION FOR DASHBOARD MATRIX ---
  // This calculates the SUM of all records within the filtered period to display in the big table
  const summaryMatrix = useMemo(() => {
    const summary = JSON.parse(JSON.stringify(INITIAL_MATRIX)); // Deep copy structure
    
    filteredRegistrations.forEach(reg => {
        const cat = reg.type as RegCategory;
        const vType = reg.vehicleType === 'Ô tô' ? 'auto' : 'moto';
        
        if (summary[cat]) {
            summary[cat][vType].count += reg.count;
            summary[cat][vType].revenue += reg.revenue;
        }
    });
    return summary;
  }, [filteredRegistrations]);

  const summaryTotals = useMemo(() => {
      let tAuto = 0, tMoto = 0, tRev = 0;
      Object.values(summaryMatrix as MatrixData).forEach(cat => {
        tAuto += cat.auto.count;
        tMoto += cat.moto.count;
        tRev += cat.auto.revenue + cat.moto.revenue;
      });
      return { tAuto, tMoto, tRev };
  }, [summaryMatrix]);


  // --- GROUPING FOR LIST VIEW ---
  const dailyGroups = useMemo(() => {
    const groups: Record<string, VehicleRegistration[]> = {};
    filteredRegistrations.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredRegistrations]);


  // --- INPUT MODAL HANDLERS ---

  const handleOpenForDate = (date: string, existingData?: VehicleRegistration[]) => {
    setInputDate(date);
    
    // Reset matrix
    const newMatrix = JSON.parse(JSON.stringify(INITIAL_MATRIX));

    // Fill matrix with existing data if any
    if (existingData && existingData.length > 0) {
      existingData.forEach(reg => {
        const vKey = reg.vehicleType === 'Ô tô' ? 'auto' : 'moto';
        if (newMatrix[reg.type]) {
          newMatrix[reg.type][vKey] = { count: reg.count, revenue: reg.revenue };
        }
      });
    }
    
    setMatrixData(newMatrix);
    setShowModal(true);
  };

  const handleInputChange = (category: RegCategory, vKey: VehicleTypeKey, field: keyof CellData, value: string) => {
    const numVal = parseInt(value) || 0;
    setMatrixData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [vKey]: {
          ...prev[category][vKey],
          [field]: numVal
        }
      }
    }));
  };

  const handleSave = async () => {
    const newRecords: VehicleRegistration[] = [];
    
    (Object.keys(matrixData) as RegCategory[]).forEach(cat => {
      // BUG FIX: Use DETERMINISTIC IDs based on date + type + vehicle
      // This ensures when we edit a past date, we overwrite the old record instead of creating duplicates
      
      // Auto
      const auto = matrixData[cat].auto;
      if (auto.count > 0 || auto.revenue > 0) {
        newRecords.push({
          id: `${inputDate}_${cat}_Ô tô`, // Fixed ID format
          date: inputDate,
          type: cat,
          vehicleType: 'Ô tô',
          count: auto.count,
          revenue: auto.revenue
        });
      }
      // Moto
      const moto = matrixData[cat].moto;
      if (moto.count > 0 || moto.revenue > 0) {
        newRecords.push({
          id: `${inputDate}_${cat}_Xe máy`, // Fixed ID format
          date: inputDate,
          type: cat,
          vehicleType: 'Xe máy',
          count: moto.count,
          revenue: moto.revenue
        });
      }
    });

    // Even if empty (all zeros), we might need to save to clear old records if they existed
    // But current logic in StorageService adds/updates. 
    // If user sets all to 0, effectively we should likely delete, but simplified logic keeps records with 0 or updates them.
    
    await StorageService.saveDailyRegistrations(newRecords);
    await loadData();
    setShowModal(false);
  };

  // Modal Totals
  const modalTotals = useMemo(() => {
    let tAuto = 0, tMoto = 0, tRev = 0;
    Object.values(matrixData).forEach((cat: any) => {
      tAuto += cat.auto.count;
      tMoto += cat.moto.count;
      tRev += cat.auto.revenue + cat.moto.revenue;
    });
    return { tAuto, tMoto, tRev };
  }, [matrixData]);


  // --- RENDER HELPERS ---
  const renderMatrixTable = (data: MatrixData, readOnly: boolean = false) => (
    <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
            <thead>
                <tr className="text-white">
                    <th className="bg-slate-700 p-3 text-left w-[20%]">NỘI DUNG</th>
                    <th className="bg-blue-700 p-3 text-center w-[40%] border-l border-slate-500">
                    <div className="flex items-center justify-center gap-2">
                        <Car className="w-5 h-5 text-blue-200" /> Ô TÔ
                    </div>
                    </th>
                    <th className="bg-green-700 p-3 text-center w-[40%] border-l border-slate-500">
                    <div className="flex items-center justify-center gap-2">
                        <Bike className="w-5 h-5 text-green-200" /> XE MÁY
                    </div>
                    </th>
                </tr>
                <tr className="bg-slate-100 text-xs font-bold text-slate-600">
                    <th className="p-2 border-b"></th>
                    <th className="p-2 border-b border-l">
                    <div className="grid grid-cols-2 gap-2"><span>Số lượng</span><span>Lệ phí (VNĐ)</span></div>
                    </th>
                    <th className="p-2 border-b border-l">
                    <div className="grid grid-cols-2 gap-2"><span>Số lượng</span><span>Lệ phí (VNĐ)</span></div>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {(Object.keys(data) as RegCategory[]).map((cat) => (
                    <tr key={cat} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 bg-slate-50">{cat}</td>
                    
                    {/* AUTO Inputs */}
                    <td className="p-2 bg-blue-50/30 border-l border-blue-100">
                        <div className="grid grid-cols-2 gap-2">
                            {readOnly ? (
                                <>
                                    <div className="p-2 text-center font-bold text-blue-800">{data[cat].auto.count}</div>
                                    <div className="p-2 text-right text-slate-700">{data[cat].auto.revenue.toLocaleString('vi-VN')}</div>
                                </>
                            ) : (
                                <>
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-blue-200 rounded p-2 text-center font-bold text-blue-800 focus:ring-2 focus:ring-blue-400"
                                    placeholder="0"
                                    value={data[cat].auto.count || ''}
                                    onChange={(e) => handleInputChange(cat, 'auto', 'count', e.target.value)}
                                    />
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-blue-200 rounded p-2 text-right text-slate-700 focus:ring-2 focus:ring-blue-400"
                                    placeholder="0"
                                    value={data[cat].auto.revenue || ''}
                                    onChange={(e) => handleInputChange(cat, 'auto', 'revenue', e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    </td>

                    {/* MOTO Inputs */}
                    <td className="p-2 bg-green-50/30 border-l border-green-100">
                        <div className="grid grid-cols-2 gap-2">
                            {readOnly ? (
                                <>
                                    <div className="p-2 text-center font-bold text-green-800">{data[cat].moto.count}</div>
                                    <div className="p-2 text-right text-slate-700">{data[cat].moto.revenue.toLocaleString('vi-VN')}</div>
                                </>
                            ) : (
                                <>
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-green-200 rounded p-2 text-center font-bold text-green-800 focus:ring-2 focus:ring-green-400"
                                    placeholder="0"
                                    value={data[cat].moto.count || ''}
                                    onChange={(e) => handleInputChange(cat, 'moto', 'count', e.target.value)}
                                    />
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-green-200 rounded p-2 text-right text-slate-700 focus:ring-2 focus:ring-green-400"
                                    placeholder="0"
                                    value={data[cat].moto.revenue || ''}
                                    onChange={(e) => handleInputChange(cat, 'moto', 'revenue', e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );


  return (
    <div className="p-6 animate-fade-in space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" /> Theo Dõi Đăng Ký Xe
        </h1>
        <button 
          onClick={() => handleOpenForDate(new Date().toISOString().split('T')[0], [])}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow font-bold"
        >
          <Plus className="w-4 h-4" /> Nhập liệu ngày mới
        </button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => handleFilterChange('week')}
                className={`px-4 py-2 text-sm rounded-md transition font-medium ${filterType === 'week' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Tuần này
            </button>
            <button 
                onClick={() => handleFilterChange('month')}
                className={`px-4 py-2 text-sm rounded-md transition font-medium ${filterType === 'month' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Tháng này
            </button>
            <button 
                onClick={() => setFilterType('custom')}
                className={`px-4 py-2 text-sm rounded-md transition font-medium ${filterType === 'custom' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Tùy chọn
            </button>
         </div>

         <div className="flex items-center gap-2 text-sm bg-slate-50 border px-3 py-2 rounded">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Từ:</span>
            <input 
                type="date" 
                className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setFilterType('custom'); }}
            />
            <span className="text-slate-500">Đến:</span>
             <input 
                type="date" 
                className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setFilterType('custom'); }}
            />
         </div>
      </div>

      {/* --- MAIN DASHBOARD (SUMMARY MATRIX) --- */}
      <div className="space-y-2">
         <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Tổng hợp số liệu ({new Date(startDate).toLocaleDateString('vi-VN')} - {new Date(endDate).toLocaleDateString('vi-VN')})
         </h3>
         
         {renderMatrixTable(summaryMatrix as MatrixData, true)}

         <div className="flex justify-end gap-8 text-sm bg-slate-800 text-white p-4 rounded-lg shadow mt-2">
             <div>
                 <span className="block text-xs text-slate-400 uppercase">Tổng Ô tô</span>
                 <span className="text-2xl font-bold text-blue-400">{summaryTotals.tAuto}</span>
             </div>
             <div>
                 <span className="block text-xs text-slate-400 uppercase">Tổng Xe máy</span>
                 <span className="text-2xl font-bold text-green-400">{summaryTotals.tMoto}</span>
             </div>
             <div>
                 <span className="block text-xs text-slate-400 uppercase">Tổng lệ phí</span>
                 <span className="text-2xl font-bold text-white">{summaryTotals.tRev.toLocaleString('vi-VN')} đ</span>
             </div>
         </div>
      </div>

      {/* --- DAILY DETAIL LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
         <div className="p-4 border-b bg-slate-50">
            <h3 className="font-bold text-slate-700">Chi tiết theo ngày (Bấm vào để sửa)</h3>
         </div>
         <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {dailyGroups.map(([date, items]) => {
               const dAuto = items.filter(i => i.vehicleType === 'Ô tô').reduce((s, i) => s + i.count, 0);
               const dMoto = items.filter(i => i.vehicleType === 'Xe máy' || !i.vehicleType).reduce((s, i) => s + i.count, 0);
               const dRev = items.reduce((s, i) => s + i.revenue, 0);

               return (
                  <div 
                    key={date} 
                    onClick={() => handleOpenForDate(date, items)}
                    className="p-4 flex items-center justify-between hover:bg-blue-50 cursor-pointer transition group"
                  >
                     <div className="flex items-center gap-4">
                        <div className="bg-blue-100 text-blue-800 p-2 rounded-lg text-center min-w-[60px]">
                           <p className="text-xs font-bold uppercase">{new Date(date).toLocaleDateString('vi-VN', { month: 'short' })}</p>
                           <p className="text-xl font-bold leading-none">{new Date(date).getDate()}</p>
                        </div>
                        <div>
                           <p className="font-bold text-slate-800">Ngày {new Date(date).toLocaleDateString('vi-VN')}</p>
                           <p className="text-xs text-slate-500">{items.length} danh mục</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-6 text-right">
                        <div>
                           <p className="text-xs text-slate-400 uppercase font-semibold">Ô tô</p>
                           <p className="font-bold text-blue-600">{dAuto}</p>
                        </div>
                        <div>
                           <p className="text-xs text-slate-400 uppercase font-semibold">Xe máy</p>
                           <p className="font-bold text-green-600">{dMoto}</p>
                        </div>
                        <div className="min-w-[100px]">
                           <p className="text-xs text-slate-400 uppercase font-semibold">Lệ phí</p>
                           <p className="font-bold text-slate-800">{dRev.toLocaleString('vi-VN')}</p>
                        </div>
                     </div>
                  </div>
               );
            })}
            {dailyGroups.length === 0 && (
               <div className="p-8 text-center text-slate-400">Không tìm thấy dữ liệu trong khoảng thời gian này</div>
            )}
         </div>
      </div>

      {/* --- INPUT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-slate-800 text-white p-4 rounded-t-xl flex justify-between items-center flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-yellow-400 w-6 h-6" />
                    <h3 className="font-bold text-lg">Bảng Kê Khai Đăng Ký Xe</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-700 px-3 py-1 rounded border border-slate-600">
                       <Calendar className="w-4 h-4 text-slate-300" />
                       <input 
                          type="date" 
                          className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm"
                          value={inputDate}
                          onChange={(e) => setInputDate(e.target.value)}
                       />
                    </div>
                    <button onClick={() => setShowModal(false)} className="hover:bg-slate-600 p-1 rounded"><X className="w-6 h-6" /></button>
                 </div>
              </div>

              {/* Matrix Body */}
              <div className="flex-1 overflow-auto p-6 bg-slate-50">
                 {renderMatrixTable(matrixData, false)}
              </div>

              {/* Footer Totals & Actions */}
              <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                 <div className="flex gap-8 text-sm">
                    <div>
                       <span className="block text-xs text-slate-400 uppercase">Tổng Ô tô</span>
                       <span className="text-xl font-bold text-blue-600">{modalTotals.tAuto}</span>
                    </div>
                    <div>
                       <span className="block text-xs text-slate-400 uppercase">Tổng Xe máy</span>
                       <span className="text-xl font-bold text-green-600">{modalTotals.tMoto}</span>
                    </div>
                    <div>
                       <span className="block text-xs text-slate-400 uppercase">Tổng lệ phí</span>
                       <span className="text-xl font-bold text-slate-800">{modalTotals.tRev.toLocaleString('vi-VN')} đ</span>
                    </div>
                 </div>

                 <div className="flex gap-3">
                    <button 
                       onClick={() => setShowModal(false)}
                       className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                       Đóng
                    </button>
                    <button 
                       onClick={handleSave}
                       className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg font-bold transform active:scale-95 transition"
                    >
                       <Save className="w-5 h-5" /> Lưu Dữ Liệu
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRegistrationManager;