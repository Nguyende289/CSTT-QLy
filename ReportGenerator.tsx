
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { FileText, Calendar, Download, Loader2, Printer, Settings, Save, RotateCcw, Edit, RefreshCw, MessageSquare, Compass, Check } from 'lucide-react';
import { VehicleRegistration, AccidentCase } from '../types';

// --- STANDARD TEMPLATES ---
const HEADER_TEMPLATE = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-bottom: 15px; line-height: 1.3;">
  <tr>
    <td style="width: 40%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>CÔNG AN TP HÀ NỘI</strong><br />
      <strong>CÔNG AN XÃ KIỀU PHÚ</strong><br />
      <hr style="width: 30%; border: 1px solid black; margin: 5px auto;" />
    </td>
    <td style="width: 60%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
      <strong>Độc lập - Tự do - Hạnh phúc</strong><br />
      <hr style="width: 30%; border: 1px solid black; margin: 5px auto;" />
      <em>Kiều Phú, ngày ...... tháng ...... năm 202...</em>
    </td>
  </tr>
</table>
`;

const FOOTER_TEMPLATE = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-top: 30px; line-height: 1.3;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top; font-size: 12pt; font-style: italic;">
      <strong><em>Nơi nhận:</em></strong><br />
      - Đ/c Trưởng CAX (để b/c);<br />
      - Lưu: HS, CSTT.
    </td>
    <td style="width: 50%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>TỔ TRƯỞNG TỔ CSTT</strong><br />
      <br /><br /><br /><br />
      <strong>Thiếu tá Đỗ Mạnh Hùng</strong>
    </td>
  </tr>
</table>
`;

const BODY_WRAPPER = `
<div style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; margin-top: 20px;">
  <h3 style="text-align: center; font-weight: bold; margin: 0;">BÁO CÁO</h3>
  <h3 style="text-align: center; font-weight: bold; margin: 0;">KẾT QUẢ CÔNG TÁC CSTT <<Kỳ>></h3>
  <p style="text-align: center; font-style: italic; margin-bottom: 20px;">(Từ ngày <<Ngày bắt đầu>> đến ngày <<Ngày kết thúc>>)</p>
  
  <div id="ai-content">
    <<Nội dung AI>>
  </div>
</div>
`;

const DEFAULT_FULL_TEMPLATE = HEADER_TEMPLATE + BODY_WRAPPER + FOOTER_TEMPLATE;

// Default CSTT Tasks for Future Directions
const DEFAULT_DIRECTIONS = `1. Tiếp tục thực hiện nghiêm túc các kế hoạch, chuyên đề công tác của Công an cấp trên.
2. Tăng cường công tác tuần tra kiểm soát, xử lý vi phạm trật tự đô thị, trật tự công cộng, trật tự an toàn giao thông trên địa bàn.
3. Duy trì nghiêm chế độ trực ban, tiếp nhận và giải quyết tin báo tố giác tội phạm.
4. Phối hợp với các ban ngành đoàn thể làm tốt công tác tuyên truyền, vận động nhân dân chấp hành pháp luật.
5. Thực hiện tốt công tác quản lý cư trú, quản lý ngành nghề kinh doanh có điều kiện.`;

const ReportGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('Tuần');
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [futureDirections, setFutureDirections] = useState(DEFAULT_DIRECTIONS);
  
  // Template State
  const [template, setTemplate] = useState(DEFAULT_FULL_TEMPLATE);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  
  // Content State
  const [generatedHtml, setGeneratedHtml] = useState('');
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Download Overlay State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    loadSavedTemplate();
    loadSavedDirections();
  }, []);

  const loadSavedTemplate = async () => {
      const saved = await StorageService.getTemplate('auto_report_config');
      if (saved) {
          setTemplate(saved);
      }
      // Initialize with placeholder
      const initialHtml = (saved || DEFAULT_FULL_TEMPLATE)
        .replace('<<Kỳ>>', 'TUẦN')
        .replace('<<Ngày bắt đầu>>', '...')
        .replace('<<Ngày kết thúc>>', '...')
        .replace('<<Nội dung AI>>', '<p style="text-align:center; color: #999;">(Nội dung báo cáo sẽ hiển thị tại đây sau khi bấm "Tạo Báo Cáo")</p>');
      setGeneratedHtml(initialHtml);
  };

  const loadSavedDirections = async () => {
      const saved = await StorageService.getReportDirections();
      if (saved) setFutureDirections(saved);
  };

  const handleSaveDirections = async () => {
      await StorageService.saveReportDirections(futureDirections);
      alert("Đã lưu nội dung phương hướng nhiệm vụ!");
  };

  // Helper to get dates based on period selection
  const getDatesFromPeriod = (p: string) => {
      const today = new Date();
      let start = new Date();
      let end = new Date();

      if (p === 'Tuần') {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
          start = new Date(today.setDate(diff));
          end = new Date(today.setDate(diff + 6));
      } else if (p === 'Tháng') {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (p === 'Quý') {
          const quarter = Math.floor((today.getMonth() + 3) / 3);
          start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
          end = new Date(today.getFullYear(), quarter * 3, 0);
      } else if (p === 'Năm') {
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date(today.getFullYear(), 11, 31);
      }
      return { 
          startStr: start.toISOString().split('T')[0], 
          endStr: end.toISOString().split('T')[0],
          displayStart: start.toLocaleDateString('vi-VN'),
          displayEnd: end.toLocaleDateString('vi-VN')
      };
  };

  const handleGenerate = async () => {
    setLoading(true);
    
    try {
        // 1. Determine Date Range
        const { startStr, endStr, displayStart, displayEnd } = getDatesFromPeriod(period);

        // 2. Gather Data
        const allAccidents = await StorageService.getAccidents();
        const allCampaigns = await StorageService.getCampaigns();
        const allRegistrations = await StorageService.getRegistrations();
        const allResults = await StorageService.getResults();

        // 3. Filter Data STRICTLY by Date Range
        const filteredAccidents = allAccidents.filter(a => a.date >= startStr && a.date <= endStr);
        const filteredResults = allResults.filter(r => r.date >= startStr && r.date <= endStr);
        
        // For Vehicle Registration: Filter THEN Calculate
        const filteredRegistrations = allRegistrations.filter(r => r.date >= startStr && r.date <= endStr);

        // Calculate Granular Stats based on FILTERED data
        const regStats = {
            total: filteredRegistrations.length,
            motoTotal: 0, motoNew: 0, motoTransfer: 0, motoReissue: 0, motoRevoke: 0,
            autoTotal: 0, autoNew: 0, autoTransfer: 0, autoReissue: 0, autoRevoke: 0
        };

        filteredRegistrations.forEach(r => {
            if (r.vehicleType === 'Xe máy') {
                regStats.motoTotal += r.count;
                if (r.type === 'Mới') regStats.motoNew += r.count;
                else if (r.type === 'Sang tên') regStats.motoTransfer += r.count;
                else if (r.type === 'Cấp đổi') regStats.motoReissue += r.count;
                else if (r.type === 'Thu hồi') regStats.motoRevoke += r.count;
            } else {
                regStats.autoTotal += r.count;
                if (r.type === 'Mới') regStats.autoNew += r.count;
                else if (r.type === 'Sang tên') regStats.autoTransfer += r.count;
                else if (r.type === 'Cấp đổi') regStats.autoReissue += r.count;
                else if (r.type === 'Thu hồi') regStats.autoRevoke += r.count;
            }
        });

        // Prepare Accident List
        const accidentList = filteredAccidents.map(a => ({
            date: new Date(a.date).toLocaleDateString('vi-VN'),
            location: a.location,
            content: a.content,
            consequences: `Chết: ${a.fatalities}, Bị thương: ${a.injuries}`
        }));
        
        // Active Campaigns
        const activeCampaigns = allCampaigns.filter(c => c.status === 'Active').map(c => ({
            name: c.name,
            targets: c.targets.map(t => `${t.name}: ${t.current}/${t.target} ${t.unit}`).join('; ')
        }));

        // 113 Reports
        const reports113 = filteredResults.filter(r => r.category === 'Tiếp nhận tin báo');

        const contextData = {
            period: period,
            stats: {
                accidentCount: filteredAccidents.length,
                accidentsDetail: accidentList,
                activeCampaignsDetails: activeCampaigns,
                registrations: regStats,
                workResults: filteredResults.length
            },
            reports113: reports113.map(r => r.content + (r.note ? ` (${r.note})` : '')).join('; '),
            recentHighlights: filteredResults.slice(0, 15).map(r => `${r.content} (${r.category})`).join('; ')
        };

        // Call Gemini
        const aiBody = await GeminiService.generateWeeklyReport(contextData, aiSuggestions, futureDirections);
        
        // Merge with Template
        const fullReport = template
            .replace('<<Kỳ>>', period.toUpperCase())
            .replace('<<Ngày bắt đầu>>', displayStart)
            .replace('<<Ngày kết thúc>>', displayEnd)
            .replace('<<Nội dung AI>>', aiBody);

        setGeneratedHtml(fullReport);
        
        // Auto-update the editable div
        if (reportContentRef.current) {
            reportContentRef.current.innerHTML = fullReport;
        }

    } catch (error) {
        alert("Lỗi khi tạo báo cáo: " + error);
    } finally {
        setLoading(false);
    }
  };

  // --- TEMPLATE MANAGEMENT ---
  const handleSaveTemplate = async () => {
      await StorageService.saveTemplate('auto_report_config', template);
      alert("Đã lưu cấu hình mẫu báo cáo!");
      setIsEditingTemplate(false);
  };

  const handleResetTemplate = async () => {
      if(confirm("Khôi phục về mẫu mặc định của hệ thống?")) {
          setTemplate(DEFAULT_FULL_TEMPLATE);
          await StorageService.saveTemplate('auto_report_config', DEFAULT_FULL_TEMPLATE);
      }
  };

  // --- EXPORT / PRINT ---
  const handlePrint = () => {
    const content = reportContentRef.current?.innerHTML || generatedHtml;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Báo Cáo</title>
            <style>
              @page { size: A4; margin: 2cm 2cm 2cm 3cm; }
              body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
              table { border-collapse: collapse; }
              p { margin: 5px 0; text-align: justify; }
              /* Standard Admin Indentation */
              h4 { font-weight: bold; text-indent: 1.27cm; margin-top: 15px; margin-bottom: 5px; }
              ul { padding: 0; margin: 0; list-style: none; }
              li { text-indent: 1.27cm; text-align: justify; }
            </style>
          </head>
          <body>
            ${content}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- MOBILE OVERLAY DOWNLOAD ---
  const handleExportWord = () => {
    setIsDownloading(true);
    setDownloadReady(false);

    const content = reportContentRef.current?.innerHTML || generatedHtml;
    const preHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Báo Cáo Tự Động</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
        </style>
      </head>
      <body>`;
    const postHtml = "</body></html>";
    const html = preHtml + content + postHtml;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    const filename = `Bao_cao_AI_${new Date().toISOString().split('T')[0]}.doc`;
    
    downloadLink.href = url;
    downloadLink.download = filename;
    
    // Click immediately
    downloadLink.click();
    
    // Show Ready state
    setTimeout(() => {
        setDownloadReady(true);
    }, 1000);
  };

  const handleFinishDownload = () => {
      setIsDownloading(false);
      setDownloadReady(false);
      // Cleanup links
      const links = document.querySelectorAll('a[download]');
      links.forEach(link => { if(link.parentNode) link.parentNode.removeChild(link); });
  };

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in">
       <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-slate-800">Tổng Hợp Báo Cáo Tự Động (AI)</h1>
           <div className="flex gap-2">
               <button 
                  onClick={() => setIsEditingTemplate(!isEditingTemplate)} 
                  className={`px-3 py-2 rounded flex items-center gap-2 text-sm font-bold shadow ${isEditingTemplate ? 'bg-yellow-500 text-white' : 'bg-white text-slate-700 border'}`}
               >
                  <Settings className="w-4 h-4" /> {isEditingTemplate ? 'Đang sửa mẫu' : 'Sửa mẫu'}
               </button>
               {!isEditingTemplate && (
                 <>
                   <button onClick={handleExportWord} className="bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow font-bold text-sm">
                      <Download className="w-4 h-4" /> Xuất Word
                   </button>
                   <button onClick={handlePrint} className="bg-slate-700 text-white px-3 py-2 rounded flex items-center gap-2 hover:bg-slate-800 shadow font-bold text-sm">
                      <Printer className="w-4 h-4" /> In ấn
                   </button>
                 </>
               )}
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          {/* CONTROLS */}
          <div className="bg-white p-6 rounded-lg shadow h-fit border border-slate-200 flex flex-col gap-5 max-h-[calc(100vh-140px)] overflow-y-auto">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2 sticky top-0 bg-white">
                <Calendar className="w-5 h-5 text-police-600" /> Thiết lập báo cáo
             </h2>
             
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Chọn kỳ báo cáo</label>
                <select 
                  className="w-full border p-2 rounded font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="Tuần">Báo cáo Tuần</option>
                  <option value="Tháng">Báo cáo Tháng</option>
                  <option value="Quý">Báo cáo Quý</option>
                  <option value="Năm">Báo cáo Năm</option>
                </select>
             </div>

             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600"/> 2. Gợi ý cho AI (Tùy chọn)
                </label>
                <textarea 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                    rows={3}
                    placeholder="Ví dụ: Nhấn mạnh vào chuyên đề nồng độ cồn, nêu chi tiết về vụ tai nạn ngày 15/10..."
                    value={aiSuggestions}
                    onChange={(e) => setAiSuggestions(e.target.value)}
                />
             </div>
            
             <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-green-600"/> 3. Phương hướng nhiệm vụ
                    </label>
                    <button onClick={handleSaveDirections} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 flex items-center gap-1" title="Lưu để dùng lần sau">
                        <Save className="w-3 h-3"/> Lưu
                    </button>
                </div>
                <textarea 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-green-500 bg-green-50"
                    rows={6}
                    placeholder="Nhập phương hướng nhiệm vụ..."
                    value={futureDirections}
                    onChange={(e) => setFutureDirections(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1 italic">* AI sẽ tự động kết hợp nội dung này với các chuyên đề đang triển khai để tạo ra phương hướng hoàn chỉnh.</p>
             </div>

             <button 
                onClick={handleGenerate}
                disabled={loading || isEditingTemplate}
                className="w-full bg-police-600 text-white py-3 rounded-lg font-bold hover:bg-police-700 flex justify-center items-center gap-2 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-auto sticky bottom-0"
             >
                {loading ? <Loader2 className="animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                {loading ? 'AI đang viết báo cáo...' : 'Tạo Báo Cáo Ngay'}
             </button>
          </div>

          {/* PREVIEW / EDITOR */}
          <div className="md:col-span-2 bg-slate-200 rounded-lg shadow-inner p-6 overflow-y-auto flex justify-center h-[calc(100vh-140px)]">
             <div className="bg-white shadow-2xl w-[21cm] min-h-[29.7cm] p-[2cm] text-black flex flex-col shrink-0" style={{ fontFamily: "'Times New Roman', serif" }}>
                 
                 {isEditingTemplate ? (
                     <div className="flex-1 flex flex-col">
                         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                             <h4 className="font-bold text-yellow-800 text-sm">Chế độ chỉnh sửa mẫu gốc</h4>
                             <p className="text-xs text-slate-600 mt-1">Tại đây bạn sửa Header, Footer và cấu trúc chung. <br/>Giữ nguyên thẻ <code>&lt;&lt;Nội dung AI&gt;&gt;</code> để AI điền nội dung vào.</p>
                         </div>
                         <textarea 
                            className="flex-1 w-full border p-4 font-mono text-sm rounded focus:ring-2 focus:ring-yellow-400 outline-none"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                         />
                         <div className="flex justify-end gap-2 mt-4">
                             <button onClick={handleResetTemplate} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded text-sm font-bold flex items-center gap-1"><RotateCcw className="w-4 h-4"/> Reset Mặc định</button>
                             <button onClick={handleSaveTemplate} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold flex items-center gap-2"><Save className="w-4 h-4"/> Lưu Mẫu</button>
                         </div>
                     </div>
                 ) : (
                     <div className="relative h-full flex flex-col">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 text-xs text-slate-400 print:hidden flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-bl">
                            <Edit className="w-3 h-3" /> Bạn có thể sửa trực tiếp văn bản bên dưới
                        </div>
                        <div 
                            ref={reportContentRef}
                            contentEditable={true}
                            className="flex-1 outline-none focus:bg-yellow-50/20 cursor-text"
                            dangerouslySetInnerHTML={{ __html: generatedHtml }}
                            suppressContentEditableWarning={true}
                        />
                     </div>
                 )}

             </div>
          </div>
       </div>

       {/* DOWNLOADING OVERLAY */}
       {isDownloading && (
           <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white p-6 animate-fade-in">
               {!downloadReady ? (
                   <div className="text-center space-y-4">
                       <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-400"/>
                       <h3 className="text-2xl font-bold">Đang xử lý file...</h3>
                       <p className="text-slate-300">Vui lòng không tắt màn hình.</p>
                   </div>
               ) : (
                   <div className="text-center space-y-6 max-w-md">
                       <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/50">
                           <Check className="w-10 h-10 text-white" strokeWidth={4}/>
                       </div>
                       <div>
                           <h3 className="text-2xl font-bold mb-2">Đã gửi lệnh tải xuống!</h3>
                           <p className="text-slate-300 text-sm">File đang được lưu về máy. Nếu chưa thấy, hãy kiểm tra thanh thông báo.</p>
                       </div>
                       <button 
                           onClick={handleFinishDownload}
                           className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg shadow hover:bg-slate-200 transition transform active:scale-95"
                       >
                           Tiếp tục sử dụng
                       </button>
                   </div>
               )}
           </div>
       )}
    </div>
  );
};

export default ReportGenerator;
