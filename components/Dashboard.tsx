import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, FileText, CheckSquare, Users, Car, Bike, ArrowRight } from 'lucide-react';
import { VehicleRegistration } from '../types';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [accidentCount, setAccidentCount] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [registrations, setRegistrations] = useState<VehicleRegistration[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const accidents = await StorageService.getAccidents();
      const campaigns = await StorageService.getCampaigns();
      const verifications = await StorageService.getVerifications();
      const regs = await StorageService.getRegistrations();

      setAccidentCount(accidents.length);
      setActiveCampaigns(campaigns.filter(c => c.status === 'Active').length);
      setPendingVerifications(verifications.filter(v => v.status !== 'Hoàn thành').length);
      setRegistrations(regs);
    };
    loadData();
  }, []);

  // --- AGGREGATE REGISTRATION DATA FOR CURRENT MONTH ---
  const registrationMatrix = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Categories
    const cats = ['Mới', 'Sang tên', 'Thu hồi', 'Cấp đổi'];
    const matrix: Record<string, { auto: number, moto: number, fees: number }> = {};
    
    cats.forEach(c => matrix[c] = { auto: 0, moto: 0, fees: 0 });

    registrations.forEach(r => {
      const d = new Date(r.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         const type = r.type;
         if (matrix[type]) {
             if (r.vehicleType === 'Ô tô') matrix[type].auto += r.count;
             else matrix[type].moto += r.count;
             matrix[type].fees += r.revenue;
         }
      }
    });

    // Calculate totals
    let totalAuto = 0;
    let totalMoto = 0;
    let totalFees = 0;
    Object.values(matrix).forEach(v => {
        totalAuto += v.auto;
        totalMoto += v.moto;
        totalFees += v.fees;
    });

    return { matrix, totalAuto, totalMoto, totalFees };
  }, [registrations]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800">Tổng Quan Tình Hình (Tháng {new Date().getMonth() + 1})</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase font-semibold">Tai nạn (Tích lũy)</p>
            <p className="text-2xl font-bold text-slate-800">{accidentCount}</p>
          </div>
          <AlertTriangle className="text-red-500 h-8 w-8" />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase font-semibold">Chuyên đề active</p>
            <p className="text-2xl font-bold text-slate-800">{activeCampaigns}</p>
          </div>
          <Users className="text-blue-500 h-8 w-8" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase font-semibold">Xác minh chờ xử lý</p>
            <p className="text-2xl font-bold text-slate-800">{pendingVerifications}</p>
          </div>
          <FileText className="text-yellow-500 h-8 w-8" />
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase font-semibold">Lệ phí Đăng ký (Tháng)</p>
            <p className="text-xl font-bold text-slate-800">{registrationMatrix.totalFees.toLocaleString('vi-VN')}</p>
          </div>
          <CheckSquare className="text-green-500 h-8 w-8" />
        </div>
      </div>

      {/* Charts & Tables Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* VEHICLE REGISTRATION MINI-MATRIX */}
        <div className="bg-white p-6 rounded-lg shadow flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-slate-700">Đăng ký xe (Tháng này)</h3>
             <Link to="/vehicle-reg" className="text-sm text-blue-600 hover:underline flex items-center">Chi tiết <ArrowRight className="w-3 h-3 ml-1"/></Link>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse border border-slate-200">
                <thead>
                    <tr className="text-white bg-slate-700">
                        <th className="p-2 text-left border border-slate-600 w-[30%]">Loại hình</th>
                        <th className="p-2 text-center border border-slate-600 bg-blue-700 w-[25%]"><Car className="w-4 h-4 inline"/> Ô tô</th>
                        <th className="p-2 text-center border border-slate-600 bg-green-700 w-[25%]"><Bike className="w-4 h-4 inline"/> Xe máy</th>
                        <th className="p-2 text-right border border-slate-600 w-[20%]">Tổng</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(registrationMatrix.matrix).map(([type, data]: [string, any]) => (
                        <tr key={type} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2 font-semibold text-slate-700 bg-slate-50 border-r">{type}</td>
                            <td className="p-2 text-center font-bold text-blue-700 border-r">{data.auto > 0 ? data.auto : '-'}</td>
                            <td className="p-2 text-center font-bold text-green-700 border-r">{data.moto > 0 ? data.moto : '-'}</td>
                            <td className="p-2 text-right font-bold text-slate-800">{(data.auto + data.moto) > 0 ? (data.auto + data.moto) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                    <tr>
                        <td className="p-2 text-left uppercase text-xs text-slate-500">Tổng cộng</td>
                        <td className="p-2 text-center text-blue-800 text-lg">{registrationMatrix.totalAuto}</td>
                        <td className="p-2 text-center text-green-800 text-lg">{registrationMatrix.totalMoto}</td>
                        <td className="p-2 text-right text-slate-900 text-lg">{registrationMatrix.totalAuto + registrationMatrix.totalMoto} xe</td>
                    </tr>
                </tfoot>
            </table>
            <div className="mt-2 text-right text-xs text-slate-500">
                * Số liệu tính từ ngày 01/{new Date().getMonth() + 1} đến nay.
            </div>
          </div>
        </div>

        {/* Simple Bar Chart for Accidents */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Diễn biến tai nạn (6 tháng gần nhất)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'T6', count: 4 },
                  { name: 'T7', count: 3 },
                  { name: 'T8', count: 6 },
                  { name: 'T9', count: 2 },
                  { name: 'T10', count: 5 },
                  { name: 'T11', count: accidentCount },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" name="Số vụ" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;