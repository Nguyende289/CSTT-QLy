
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Save, Cloud, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{success?: boolean, message?: string} | null>(null);

  useEffect(() => {
    setUrl(StorageService.getSyncUrl());
  }, []);

  const handleSave = () => {
    StorageService.setSyncUrl(url);
    alert("Đã lưu cấu hình!");
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    
    // Start Sync
    const result = await StorageService.pullFromCloud();
    setSyncStatus(result);
    setIsSyncing(false);
    
    if (result.success) {
       // Force reload to reflect data
       setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6 text-slate-600" /> Cài Đặt Hệ Thống
      </h1>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
         <div className="bg-green-700 text-white p-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Cloud className="w-5 h-5"/> Kết nối Google Sheets (Cloud)</h3>
            <p className="text-green-100 text-sm mt-1">Lưu trữ dữ liệu vĩnh viễn và đồng bộ hóa.</p>
         </div>

         <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded border border-blue-200 text-sm text-slate-700">
                <strong>Hướng dẫn:</strong>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                    <li>Tạo Google Sheet và Google Apps Script (Copy mã nguồn).</li>
                    <li>Deploy Script dưới dạng <strong>Web App</strong>.</li>
                    <li>Chọn quyền truy cập: <strong>Anyone (Bất kỳ ai)</strong>.</li>
                    <li>Copy URL (bắt đầu bằng <code>https://script.google.com/...</code>) dán vào dưới đây.</li>
                </ol>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Google Web App URL</label>
                <input 
                   type="text" 
                   className="w-full border p-3 rounded focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono text-slate-600"
                   placeholder="https://script.google.com/macros/s/..."
                   value={url}
                   onChange={(e) => setUrl(e.target.value)}
                />
            </div>

            <div className="flex gap-4">
                <button 
                   onClick={handleSave}
                   className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700 flex items-center gap-2"
                >
                   <Save className="w-4 h-4"/> Lưu Cấu Hình
                </button>
                <button 
                   onClick={handleSync}
                   disabled={!url || isSyncing}
                   className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                   {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Cloud className="w-4 h-4"/>}
                   {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay (Tải về)'}
                </button>
            </div>

            {syncStatus && (
                <div className={`p-4 rounded flex items-center gap-3 ${syncStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {syncStatus.success ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                    <div>
                        <p className="font-bold">{syncStatus.success ? 'Thành công' : 'Thất bại'}</p>
                        <p className="text-sm">{syncStatus.message}</p>
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Settings;
