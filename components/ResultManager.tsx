
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { WorkResult, ResultCategory, Campaign, VerificationRequest, Document, DocType } from '../types';
import { Plus, X, Edit, Trash2, Save, PieChart, Flag, AlertOctagon, Briefcase, Shield, Megaphone, FileText, Printer, Settings, RotateCcw, Check, Download, FolderInput, Calendar, Filter, ArrowRight, Phone } from 'lucide-react';

// --- STANDARD REPORT TEMPLATE ---
const HEADER_ADMIN = `
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
      <em>Kiều Phú, ngày ...... tháng ...... năm ......</em>
    </td>
  </tr>
</table>
`;

const FOOTER_ADMIN = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-top: 30px; line-height: 1.3;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top; font-size: 12pt; font-style: italic;">
      <strong><em>Nơi nhận:</em></strong><br />
      - BCH CA Huyện;<br />
      - Đảng ủy, UBND Xã;<br />
      - Lưu: VT, CSTT.
    </td>
    <td style="width: 50%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>TRƯỞNG CÔNG AN XÃ</strong><br />
      <br /><br /><br /><br />
      <strong>Đại úy Nguyễn Văn A</strong>
    </td>
  </tr>
</table>
`;

// Updated CSS for strict indentation and line height
const REPORT_STYLES = `
<style>
  body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
  h3 { text-align: center; font-weight: bold; margin: 0; text-transform: uppercase; }
  h4 { 
    font-weight: bold; 
    margin-top: 15px; 
    margin-bottom: 5px; 
    margin-left: 0; 
    text-indent: 1.27cm; /* Standard tab indent for headers */
  }
  p { margin: 5px 0; text-align: justify; line-height: 1.5; }
  
  /* List Styles for Body Content */
  ul.report-list { 
    margin: 0; 
    padding: 0; 
    list-style-type: none; /* Remove default bullets */
  }
  
  ul.report-list li { 
    text-align: justify;
    margin-bottom: 5px;
    text-indent: 1.27cm; /* First line indented */
    line-height: 1.5;
    /* Second line flushes left (default block behavior), satisfying 'không bị thụ lề vào' */
  }
  
  .italic-center { text-align: center; font-style: italic; margin-bottom: 20px; }
  .intro-text { text-align: justify; text-indent: 1.27cm; }
</style>
`;

const DEFAULT_REPORT_TEMPLATE = `
${HEADER_ADMIN}
${REPORT_STYLES}
<div style="margin-top: 20px; font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5;">
  <h3>BÁO CÁO</h3>
  <h3>KẾT QUẢ CÔNG TÁC CSTT <<Kỳ>></h3>
  <p class="italic-center">(Từ ngày <<Ngày bắt đầu>> đến ngày <<Ngày kết thúc>>)</p>

  <p class="intro-text">Thực hiện chương trình, kế hoạch công tác, Công an xã Kiều Phú báo cáo kết quả công tác Cảnh sát trật tự trong kỳ như sau:</p>

  <h4>1. Công tác tham mưu</h4>
  <<Tham mưu>>

  <h4>2. Công tác đấu tranh, xử lý vi phạm và Thực hiện chỉ tiêu</h4>
  <<Chỉ tiêu>>
  <<Xử lý vi phạm>>

  <h4>3. Công tác tuần tra kiểm soát</h4>
  <<Tuần tra>>

  <h4>4. Công tác tiếp nhận và xử lý tin báo</h4>
  <<Tin báo>>

  <h4>5. Công tác bảo vệ kỳ cuộc và sự kiện</h4>
  <<Bảo vệ>>

  <h4>6. Công tác phối hợp xác minh</h4>
  <<Xác minh>>

  <h4>7. Công tác tuyên truyền, xây dựng phong trào</h4>
  <<Tuyên truyền>>

  <h4>8. Các mặt công tác khác</h4>
  <<Khác>>

  <p class="intro-text" style="margin-top: 20px;">Trên đây là báo cáo kết quả công tác Cảnh sát trật tự trong kỳ của Công an xã Kiều Phú./.</p>
</div>
${FOOTER_ADMIN}
`;

type FilterMode = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const ResultManager: React.FC = () => {
  const [results, setResults] = useState<WorkResult[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  
  // Filter State
  const [filterMode, setFilterMode] = useState<FilterMode>('this_week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayLabel, setDisplayLabel] = useState('Tuần này');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkResult>>({});

  // Report Generation State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTemplate, setReportTemplate] = useState(DEFAULT_REPORT_TEMPLATE);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [generatedReportHtml, setGeneratedReportHtml] = useState('');
  
  // Ref for Direct Editing
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadTemplate();
    handleQuickFilter('this_week'); // Default filter
  }, []);

  const loadData = async () => {
    const res = await StorageService.getResults();
    const camps = await StorageService.getCampaigns();
    const vers = await StorageService.getVerifications();
    setResults(res.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setCampaigns(camps);
    setVerifications(vers);
  };

  const loadTemplate = async () => {
    const t = await StorageService.getTemplate('result_report');
    if (t) setReportTemplate(t);
  };

  // Sync generated HTML to the editable div when modal opens
  useEffect(() => {
    if (showReportModal && reportContentRef.current) {
        reportContentRef.current.innerHTML = generatedReportHtml;
    }
  }, [showReportModal, generatedReportHtml, isEditingTemplate]);

  // --- DATE FILTER HELPERS ---
  const handleQuickFilter = (mode: FilterMode) => {
      setFilterMode(mode);
      const today = new Date();
      
      if (mode === 'this_week') {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
          const start = new Date(today.setDate(diff));
          const end = new Date(today.setDate(diff + 6));
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
          setDisplayLabel('Tuần này');
      } 
      else if (mode === 'last_week') {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7; // Monday of last week
          const start = new Date(today.setDate(diff));
          const end = new Date(today.setDate(diff + 6));
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
          setDisplayLabel('Tuần trước');
      }
      else if (mode === 'this_month') {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
          setDisplayLabel('Tháng này');
      }
      else if (mode === 'last_month') {
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const end = new Date(today.getFullYear(), today.getMonth(), 0);
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
          setDisplayLabel('Tháng trước');
      }
      else if (mode === 'custom') {
          setDisplayLabel('Tùy chọn');
          // Keep existing dates or default to today
          if(!startDate) setStartDate(new Date().toISOString().split('T')[0]);
          if(!endDate) setEndDate(new Date().toISOString().split('T')[0]);
      }
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
      setFilterMode('custom');
      setDisplayLabel('Tùy chọn');
      if (type === 'start') setStartDate(val);
      else setEndDate(val);
  };


  // --- FILTERED DATA ---
  const filteredResults = useMemo(() => {
    if (!startDate || !endDate) return results;
    return results.filter(r => r.date >= startDate && r.date <= endDate);
  }, [results, startDate, endDate]);

  const filteredVerifications = useMemo(() => {
    if (!startDate || !endDate) return verifications;
    return verifications.filter(v => v.date >= startDate && v.date <= endDate);
  }, [verifications, startDate, endDate]);

  const campaignTargets = useMemo(() => {
     // Technically campaigns span long periods, so we show active ones regardless of filter week
     // But ideally, we should show logs. For now, showing active targets is safe default.
     const active = campaigns.filter(c => c.status === 'Active');
     return active.flatMap(c => c.targets.map(t => ({
        ...t,
        campaignName: c.name
     })));
  }, [campaigns]);


  // --- FORM HANDLERS ---
  const handleAddNew = () => {
    setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Công tác tham mưu',
        quantity: 0,
        unit: '',
        content: '',
        note: ''
    });
    setShowModal(true);
  };

  const isNumericCategory = (cat?: string) => {
    return cat === 'Chỉ tiêu' || cat === 'Xử lý vi phạm';
  };

  const handleEdit = (item: WorkResult) => {
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa kết quả này?")) {
        await StorageService.deleteResult(id);
        loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content) return;

    if (!isNumericCategory(formData.category)) {
        formData.quantity = 0;
        formData.unit = '';
    }

    const newItem = {
        ...formData,
        id: formData.id || Date.now().toString(),
    } as WorkResult;

    await StorageService.saveResult(newItem);
    loadData();
    setShowModal(false);
  };

  // --- REPORT GENERATION LOGIC ---
  const generateReportContent = () => {
      // Helper to generate list items with manual dashes
      const listToHtml = (items: WorkResult[], showQty = false) => {
          if (!items || items.length === 0) return '<p class="intro-text" style="font-style: italic;">- Không có phát sinh.</p>';
          return `<ul class="report-list">` + items.map(i => {
              let text = `<li>- ${i.content}`; // Prepend dash for manual list look
              if (showQty && i.quantity) text += ` <strong>(${i.quantity} ${i.unit})</strong>`;
              if (i.note) text += `. <em>(Ghi chú: ${i.note})</em>`;
              text += '</li>';
              return text;
          }).join('') + '</ul>';
      };

      // 1. Tham mưu
      const advisory = filteredResults.filter(r => r.category === 'Công tác tham mưu');
      
      // 2. Chỉ tiêu & Vi phạm
      const targetsManual = filteredResults.filter(r => r.category === 'Chỉ tiêu');
      const violations = filteredResults.filter(r => r.category === 'Xử lý vi phạm');
      
      let targetHtml = `<ul class="report-list">`;
      // Add automated campaign targets
      campaignTargets.forEach(t => {
          targetHtml += `<li>- ${t.campaignName}: ${t.name} (Đạt: <strong>${t.current}/${t.target} ${t.unit}</strong>)</li>`;
      });
      // Add manual targets
      targetsManual.forEach(t => {
          targetHtml += `<li>- ${t.content}: <strong>${t.quantity} ${t.unit}</strong></li>`;
      });
      if (campaignTargets.length === 0 && targetsManual.length === 0) targetHtml += '<li>- Chưa cập nhật chỉ tiêu.</li>';
      targetHtml += '</ul>';

      // 3. Tuần tra
      const patrol = filteredResults.filter(r => r.category === 'Tuần tra kiểm soát');

      // 4. Bảo vệ
      const security = filteredResults.filter(r => r.category === 'Bảo vệ kỳ cuộc');

      // 4b. Tin báo
      const reports113 = filteredResults.filter(r => r.category === 'Tiếp nhận tin báo');

      // 5. Xác minh
      let verifyHtml = `<ul class="report-list">`;
      const manualVerif = filteredResults.filter(r => r.category === 'Công tác xác minh');
      manualVerif.forEach(v => verifyHtml += `<li>- ${v.content}. ${v.note ? `(${v.note})` : ''}</li>`);
      
      if (filteredVerifications.length > 0) {
         verifyHtml += `<li>- <strong>Đã tiếp nhận và xác minh ${filteredVerifications.length} yêu cầu qua hệ thống:</strong></li>`;
         filteredVerifications.forEach(v => {
             // Indent sub-items slightly more or keep standard
             verifyHtml += `<li>+ CV số ${v.dispatchNumber} ngày ${new Date(v.date).toLocaleDateString('vi-VN')}: ${v.offenderName} (${v.status})</li>`;
         });
      } else if (manualVerif.length === 0) {
         verifyHtml = '<p class="intro-text" style="font-style: italic;">- Không có phát sinh.</p>';
      }
      
      // Close UL if it was opened and not replaced by P
      if (verifyHtml.startsWith('<ul')) verifyHtml += '</ul>';

      // 6. Tuyên truyền
      const propaganda = filteredResults.filter(r => r.category === 'Tuyên truyền');

      // 7. Khác
      const other = filteredResults.filter(r => r.category === 'Kết quả khác');

      // Replacements
      let content = reportTemplate;
      const mapObj: Record<string, string> = {
          '<<Kỳ>>': displayLabel.toUpperCase(),
          '<<Ngày bắt đầu>>': new Date(startDate).toLocaleDateString('vi-VN'),
          '<<Ngày kết thúc>>': new Date(endDate).toLocaleDateString('vi-VN'),
          '<<Tham mưu>>': listToHtml(advisory),
          '<<Chỉ tiêu>>': targetHtml,
          '<<Xử lý vi phạm>>': listToHtml(violations, true),
          '<<Tuần tra>>': listToHtml(patrol),
          '<<Bảo vệ>>': listToHtml(security),
          '<<Tin báo>>': listToHtml(reports113),
          '<<Xác minh>>': verifyHtml,
          '<<Tuyên truyền>>': listToHtml(propaganda),
          '<<Khác>>': listToHtml(other)
      };

      const re = new RegExp(Object.keys(mapObj).join("|"), "gi");
      content = content.replace(re, (matched) => mapObj[matched]);

      setGeneratedReportHtml(content);
  };

  const handleOpenReport = () => {
      generateReportContent();
      setShowReportModal(true);
  };

  const handleSaveTemplate = async () => {
     await StorageService.saveTemplate('result_report', reportTemplate);
     alert("Đã lưu mẫu báo cáo mới!");
     setIsEditingTemplate(false);
     generateReportContent(); // Regenerate with new template
  };

  const handleResetTemplate = async () => {
     if(confirm("Khôi phục về mẫu mặc định?")) {
         setReportTemplate(DEFAULT_REPORT_TEMPLATE);
         await StorageService.saveTemplate('result_report', DEFAULT_REPORT_TEMPLATE);
         generateReportContent();
     }
  };

  const handlePrintReport = () => {
    const contentToPrint = reportContentRef.current?.innerHTML || generatedReportHtml;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Báo Cáo</title>
            <style>
              @page { size: A4; margin: 2cm 2cm 2cm 3cm; }
              body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
            </style>
          </head>
          <body>
            ${contentToPrint}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- FIXED MOBILE DOWNLOAD ---
  const handleExportWord = () => {
    const content = reportContentRef.current?.innerHTML || generatedReportHtml;
    
    const preHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Báo Cáo Kết Quả</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
        </style>
      </head>
      <body>`;
    const postHtml = "</body></html>";
    const html = preHtml + content + postHtml;

    // Improved Blob handling for mobile
    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword;charset=utf-8'
    });
    
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);

    const filename = `Bao_cao_${displayLabel.replace(/\s/g, '_')}.doc`;
    downloadLink.href = url;
    downloadLink.download = filename;
    
    // Delay and longer timeout
    setTimeout(() => {
        downloadLink.click();
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        }, 10000); // 10s delay for mobile filesystem handover
    }, 100);
  };

  // --- SAVE TO DOCUMENT MANAGER ---
  const handleSaveToDocs = async () => {
      if (!confirm("Lưu báo cáo này vào hệ thống Quản lý văn bản?")) return;

      const content = reportContentRef.current?.innerHTML || generatedReportHtml;
      const name = `Báo cáo ${displayLabel} - ${new Date().toLocaleDateString('vi-VN')}`;
      const title = `BÁO CÁO`;
      const about = `Kết quả công tác ${displayLabel} (${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')})`;
      
      const newDoc: Document = {
          id: Date.now().toString(),
          name: name,
          title: title,
          about: about,
          type: 'Báo cáo',
          dispatchNumber: '.../BC-CAX',
          date: new Date().toISOString().split('T')[0],
          content: '',
          htmlTemplate: content,
          status: 'Dự thảo'
      };

      await StorageService.saveDocument(newDoc);
      alert("Đã lưu thành công vào Quản lý văn bản!");
  };

  // --- RENDER SECTIONS ---
  const renderSection = (title: string, icon: React.ReactNode, data: WorkResult[], colorClass: string, extraContent?: React.ReactNode) => (
    <div className={`bg-white rounded-lg shadow border-l-4 ${colorClass} overflow-hidden mb-6`}>
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">{icon} {title}</h3>
            <span className="text-xs font-bold bg-white px-2 py-1 rounded border text-slate-500">{data.length + (extraContent ? 1 : 0)} mục</span>
        </div>
        <div className="divide-y">
            {extraContent}
            {data.map(item => (
                <div key={item.id} className="p-4 hover:bg-slate-50 flex justify-between items-start group">
                    <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm md:text-base">{item.content}</p>
                        <p className="text-xs text-slate-500 flex flex-wrap gap-2 mt-1">
                            <span>📅 {new Date(item.date).toLocaleDateString('vi-VN')}</span>
                            {item.note && <span>📝 {item.note}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 ml-2">
                        {item.quantity !== undefined && item.quantity > 0 && (
                            <div className="text-right min-w-[60px]">
                                <span className="block text-lg font-bold text-slate-700">{item.quantity}</span>
                                <span className="text-xs text-slate-400">{item.unit}</span>
                            </div>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
            ))}
            {data.length === 0 && !extraContent && <div className="p-6 text-center text-slate-400 text-sm italic">Chưa có số liệu</div>}
        </div>
    </div>
  );

  const renderOtherResults = () => {
     const other = filteredResults.filter(r => r.category === 'Kết quả khác');
     const groups: Record<string, WorkResult[]> = {};
     other.forEach(r => {
        const key = r.customCategory || 'Khác';
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
     });

     return Object.entries(groups).map(([groupName, items]) => (
        renderSection(groupName, <Briefcase className="w-5 h-5 text-purple-600"/>, items, 'border-purple-500')
     ));
  };

  // Render logic for Automatic Verifications Display
  const renderVerifications = () => {
     const manualVerifications = filteredResults.filter(r => r.category === 'Công tác xác minh');
     
     const autoContent = filteredVerifications.length > 0 ? (
         <div className="p-4 bg-indigo-50 border-b border-indigo-100">
             <h4 className="text-sm font-bold text-indigo-800 mb-2">Hệ thống tự động tổng hợp ({filteredVerifications.length} yêu cầu):</h4>
             <ul className="space-y-1 list-disc list-inside text-sm text-slate-700">
                 {filteredVerifications.map(v => (
                     <li key={v.id}>
                        CV số <strong>{v.dispatchNumber}</strong> (Ngày {v.date}): {v.offenderName} - {v.status}
                     </li>
                 ))}
             </ul>
         </div>
     ) : null;

     return renderSection('Công tác xác minh', <FileText className="w-5 h-5 text-indigo-600"/>, manualVerifications, 'border-indigo-500', autoContent);
  };

  return (
    <div className="p-6 animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <PieChart className="text-police-600" /> Quản Lý Kết Quả Công Tác
          </h1>
          <div className="flex gap-2">
            <button onClick={handleOpenReport} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700 shadow font-bold">
                <FileText className="w-4 h-4" /> Tạo Báo Cáo
            </button>
            <button onClick={handleAddNew} className="bg-police-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-police-700 shadow font-bold">
                <Plus className="w-4 h-4" /> Thêm kết quả
            </button>
          </div>
       </div>

       {/* --- NEW FILTER TOOLBAR --- */}
       <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap bg-slate-100 p-1 rounded-lg">
             <button onClick={() => handleQuickFilter('this_week')} className={`px-3 py-1.5 rounded text-sm font-bold transition ${filterMode === 'this_week' ? 'bg-white shadow text-police-700' : 'text-slate-500 hover:bg-slate-200'}`}>Tuần này</button>
             <button onClick={() => handleQuickFilter('last_week')} className={`px-3 py-1.5 rounded text-sm font-bold transition ${filterMode === 'last_week' ? 'bg-white shadow text-police-700' : 'text-slate-500 hover:bg-slate-200'}`}>Tuần trước</button>
             <div className="w-px h-5 bg-slate-300 mx-1"></div>
             <button onClick={() => handleQuickFilter('this_month')} className={`px-3 py-1.5 rounded text-sm font-bold transition ${filterMode === 'this_month' ? 'bg-white shadow text-police-700' : 'text-slate-500 hover:bg-slate-200'}`}>Tháng này</button>
             <button onClick={() => handleQuickFilter('last_month')} className={`px-3 py-1.5 rounded text-sm font-bold transition ${filterMode === 'last_month' ? 'bg-white shadow text-police-700' : 'text-slate-500 hover:bg-slate-200'}`}>Tháng trước</button>
             <div className="w-px h-5 bg-slate-300 mx-1"></div>
             <button onClick={() => handleQuickFilter('custom')} className={`px-3 py-1.5 rounded text-sm font-bold transition ${filterMode === 'custom' ? 'bg-white shadow text-police-700' : 'text-slate-500 hover:bg-slate-200'}`}>Tùy chọn</button>
          </div>

          {/* Date Display / Custom Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border px-3 py-2 rounded text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              {filterMode === 'custom' ? (
                  <>
                    <input type="date" className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]" value={startDate} onChange={(e) => handleCustomDateChange('start', e.target.value)} />
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <input type="date" className="bg-transparent font-semibold text-slate-700 outline-none w-[110px]" value={endDate} onChange={(e) => handleCustomDateChange('end', e.target.value)} />
                  </>
              ) : (
                  <span className="font-bold text-slate-700">
                      {new Date(startDate).toLocaleDateString('vi-VN')} - {new Date(endDate).toLocaleDateString('vi-VN')}
                  </span>
              )}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. CHỈ TIÊU & CHUYÊN ĐỀ */}
          <div className="bg-white rounded-lg shadow border-l-4 border-red-500 overflow-hidden mb-6 lg:col-span-2">
             <div className="p-4 border-b bg-red-50 flex justify-between items-center">
                <h3 className="font-bold text-red-800 flex items-center gap-2"><Flag className="w-5 h-5"/> Chỉ Tiêu & Chuyên Đề (Đang triển khai)</h3>
             </div>
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignTargets.map((t, idx) => (
                    <div key={`camp-${idx}`} className="bg-red-50 p-3 rounded border border-red-100">
                        <p className="text-xs text-red-500 uppercase font-bold mb-1">{t.campaignName}</p>
                        <p className="font-bold text-slate-800">{t.name}</p>
                        <div className="mt-2 flex justify-between items-end">
                            <span className="text-2xl font-bold text-red-600">{t.current}/{t.target}</span>
                            <span className="text-xs text-slate-500">{t.unit}</span>
                        </div>
                        <div className="w-full bg-red-200 h-1.5 rounded-full mt-2">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (t.current/t.target)*100)}%`}}></div>
                        </div>
                    </div>
                ))}
                {filteredResults.filter(r => r.category === 'Chỉ tiêu').map(item => (
                    <div key={item.id} className="bg-slate-50 p-3 rounded border border-slate-200 relative group">
                         <button onClick={() => handleEdit(item)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-blue-600"><Edit className="w-3 h-3"/></button>
                         <p className="text-xs text-slate-500 uppercase font-bold mb-1">Chỉ tiêu khác</p>
                         <p className="font-bold text-slate-800">{item.content}</p>
                         <div className="mt-2 flex justify-between items-end">
                            <span className="text-2xl font-bold text-slate-700">{item.quantity}</span>
                            <span className="text-xs text-slate-500">{item.unit}</span>
                         </div>
                    </div>
                ))}
             </div>
          </div>

          <div className="lg:col-span-2">
             {renderSection('Xử lý vi phạm hành chính', <AlertOctagon className="w-5 h-5 text-orange-600"/>, filteredResults.filter(r => r.category === 'Xử lý vi phạm'), 'border-orange-500')}
          </div>
          
          {/* Left Column */}
          <div>
             {renderSection('Công tác tham mưu', <Briefcase className="w-5 h-5 text-blue-600"/>, filteredResults.filter(r => r.category === 'Công tác tham mưu'), 'border-blue-500')}
             {renderSection('Bảo vệ kỳ cuộc', <Shield className="w-5 h-5 text-yellow-600"/>, filteredResults.filter(r => r.category === 'Bảo vệ kỳ cuộc'), 'border-yellow-500')}
          </div>

          {/* Right Column */}
          <div>
             {renderSection('Tuần tra kiểm soát (Nhật ký)', <Shield className="w-5 h-5 text-green-600"/>, filteredResults.filter(r => r.category === 'Tuần tra kiểm soát'), 'border-green-500')}
             {renderSection('Công tác tiếp nhận và xử lý tin báo', <Phone className="w-5 h-5 text-indigo-600"/>, filteredResults.filter(r => r.category === 'Tiếp nhận tin báo'), 'border-indigo-500')}
             {renderVerifications()}
             {renderSection('Công tác tuyên truyền', <Megaphone className="w-5 h-5 text-pink-600"/>, filteredResults.filter(r => r.category === 'Tuyên truyền'), 'border-pink-500')}
             {renderOtherResults()}
          </div>
       </div>

       {/* --- ADD/EDIT MODAL --- */}
       {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="bg-police-900 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold">{formData.id ? 'Sửa Kết Quả' : 'Thêm Kết Quả Mới'}</h3>
                    <button onClick={() => setShowModal(false)}><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Ngày</label>
                            <input type="date" required className="w-full border p-2 rounded mt-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Phân loại</label>
                            <select className="w-full border p-2 rounded mt-1" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ResultCategory})}>
                                <option value="Chỉ tiêu">Chỉ tiêu (Có số lượng)</option>
                                <option value="Xử lý vi phạm">Xử lý vi phạm (Có số lượng)</option>
                                <option value="Công tác tham mưu">Công tác tham mưu</option>
                                <option value="Tuần tra kiểm soát">Tuần tra kiểm soát</option>
                                <option value="Bảo vệ kỳ cuộc">Bảo vệ kỳ cuộc</option>
                                <option value="Tiếp nhận tin báo">Tiếp nhận tin báo</option>
                                <option value="Công tác xác minh">Công tác xác minh</option>
                                <option value="Tuyên truyền">Tuyên truyền</option>
                                <option value="Kết quả khác">Kết quả khác</option>
                            </select>
                        </div>
                    </div>

                    {formData.category === 'Kết quả khác' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Tiêu đề nhóm</label>
                            <input type="text" required className="w-full border p-2 rounded mt-1 bg-yellow-50" placeholder="Ví dụ: Huấn luyện..." value={formData.customCategory || ''} onChange={e => setFormData({...formData, customCategory: e.target.value})} />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nội dung công việc</label>
                        <textarea required rows={3} className="w-full border p-2 rounded mt-1" placeholder="Mô tả..." value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} />
                    </div>

                    {isNumericCategory(formData.category) && (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                            <div>
                                <label className="block text-sm font-bold text-slate-700">Số lượng</label>
                                <input type="number" required min="0" className="w-full border p-2 rounded mt-1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700">Đơn vị tính</label>
                                <input type="text" required className="w-full border p-2 rounded mt-1" placeholder="vụ, việc..." value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Ghi chú</label>
                        <input type="text" className="w-full border p-2 rounded mt-1" value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-police-600 text-white rounded hover:bg-police-700 font-bold flex items-center gap-2">
                            <Save className="w-4 h-4"/> Lưu lại
                        </button>
                    </div>
                </form>
            </div>
        </div>
       )}

      {/* --- REPORT GENERATION MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
             {/* Header */}
             <div className="bg-police-900 text-white p-4 flex justify-between items-center rounded-t-lg flex-shrink-0">
               <h3 className="font-bold text-lg">Tạo Báo Cáo ({displayLabel})</h3>
               <div className="flex gap-2">
                 <button onClick={() => setIsEditingTemplate(!isEditingTemplate)} className={`px-3 py-1 rounded text-sm flex items-center gap-2 ${isEditingTemplate ? 'bg-yellow-500 text-black' : 'bg-white/20 hover:bg-white/30'}`}>
                    <Settings className="w-4 h-4" /> {isEditingTemplate ? 'Sửa mẫu' : 'Sửa mẫu'}
                 </button>
                 <button onClick={handleSaveToDocs} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm flex items-center gap-2 shadow font-bold ml-2">
                    <FolderInput className="w-4 h-4" /> Lưu vào QL Văn Bản
                 </button>
                 <button onClick={handleExportWord} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm flex items-center gap-2 shadow font-bold">
                    <Download className="w-4 h-4" /> Xuất Word
                 </button>
                 <button onClick={handlePrintReport} className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded text-sm flex items-center gap-2 shadow font-bold">
                    <Printer className="w-4 h-4" /> In
                 </button>
                 <button onClick={() => setShowReportModal(false)} className="hover:bg-white/20 p-1 rounded ml-2"><X className="w-5 h-5" /></button>
               </div>
             </div>

             {/* Content Body */}
             <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto p-8 bg-slate-200 flex justify-center">
                   <div className="bg-white shadow-lg p-[2cm] w-[21cm] min-h-[29.7cm] text-black relative" style={{ fontFamily: "'Times New Roman', serif" }}>
                      {isEditingTemplate ? (
                         <div className="h-full flex flex-col">
                           <div className="bg-yellow-100 border border-yellow-300 p-3 mb-3 text-sm text-yellow-800 flex justify-between items-center rounded">
                             <div><strong>Chế độ sửa mẫu gốc:</strong> Các từ khóa như <code>&lt;&lt;Tham mưu&gt;&gt;</code> sẽ được thay thế tự động bằng danh sách dữ liệu.</div>
                             <button onClick={handleResetTemplate} className="text-red-600 hover:text-red-800 text-xs underline flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset mẫu chuẩn</button>
                           </div>
                           <textarea className="flex-1 w-full border p-4 font-mono text-sm rounded focus:ring-2 focus:ring-yellow-400 outline-none" value={reportTemplate} onChange={(e) => setReportTemplate(e.target.value)} />
                           <div className="mt-4 flex justify-end">
                              <button onClick={handleSaveTemplate} className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold"><Save className="w-4 h-4" /> Lưu Mẫu</button>
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
                                className="flex-1 outline-none focus:bg-yellow-50/30 p-2 -m-2 rounded transition-colors cursor-text"
                                suppressContentEditableWarning={true}
                            />
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultManager;
