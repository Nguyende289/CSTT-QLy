
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { VerificationRequest, WorkStatus } from '../types';
import { Upload, FileText, Loader2, Plus, Edit, Save, Printer, FileOutput, Settings, RotateCcw, Calendar } from 'lucide-react';

// --- STANDARD ADMINISTRATIVE TEMPLATES (HTML) ---
const HEADER_TEMPLATE = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-bottom: 15px; line-height: 1.3;">
  <tr>
    <td style="width: 40%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>CÔNG AN TP HÀ NỘI</strong><br />
      <strong>CÔNG AN XÃ KIỀU PHÚ</strong><br />
      <hr style="width: 30%; border: 1px solid black; margin: 5px auto;" />
      Số: ....../CV-CAX
    </td>
    <td style="width: 60%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
      <strong>Độc lập - Tự do - Hạnh phúc</strong><br />
      <hr style="width: 30%; border: 1px solid black; margin: 5px auto;" />
      <em>Kiều Phú, ngày <<Ngày>> tháng <<Tháng>> năm <<Năm>></em>
    </td>
  </tr>
</table>
`;

const FOOTER_TEMPLATE = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-top: 30px; line-height: 1.3;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top; font-size: 12pt; font-style: italic;">
      <strong><em>Nơi nhận:</em></strong><br />
      - Như trên;<br />
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

const TEMPLATE_1_NORMAL = `
${HEADER_TEMPLATE}
<div style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5;">
  <h3 style="text-align: center; font-weight: bold; margin: 20px 0;">PHÚC ĐÁP KẾT QUẢ XÁC MINH</h3>
  
  <p style="text-align: center; margin-bottom: 20px;">Kính gửi: ........................................................................</p>

  <p style="text-indent: 1.27cm; text-align: justify;">Thực hiện Công văn số <strong><<Số công văn>></strong> ngày <strong><<Ngày yêu cầu>></strong> về việc xác minh đối tượng vi phạm hành chính.</p>
  
  <p style="text-indent: 1.27cm; text-align: justify;">Công an xã Kiều Phú đã tiến hành tra cứu tàng thư hồ sơ cư trú và xác minh thực tế đối với:</p>
  
  <p style="margin-left: 1.27cm;">- Họ và tên: <strong><<Họ tên>></strong></p>
  <p style="margin-left: 1.27cm;">- Năm sinh: <strong><<Năm sinh>></strong></p>
  <p style="margin-left: 1.27cm;">- CCCD/CMND số: <strong><<CCCD>></strong></p>
  <p style="margin-left: 1.27cm;">- HKTT: <strong><<Hộ khẩu>></strong></p>
  <p style="margin-left: 1.27cm;">- Nội dung liên quan: <strong><<Nội dung vi phạm>></strong></p>

  <p style="text-indent: 1.27cm; font-weight: bold; margin-top: 15px;">Kết quả xác minh:</p>
  <p style="text-indent: 1.27cm; text-align: justify;"><<Kết quả xác minh>></p>

  <p style="text-indent: 1.27cm; text-align: justify; margin-top: 15px;">Công an xã Kiều Phú trao đổi để Quý cơ quan biết và phối hợp xử lý theo quy định của pháp luật./.</p>
</div>
${FOOTER_TEMPLATE}
`;

const TEMPLATE_2_STUDENT = `
${HEADER_TEMPLATE}
<div style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5;">
  <h3 style="text-align: center; font-weight: bold; margin: 20px 0;">THÔNG BÁO<br/>Về việc học sinh vi phạm trật tự an toàn giao thông</h3>
  
  <p style="text-align: center; margin-bottom: 20px;">Kính gửi: Ban Giám hiệu Trường ...........................................</p>

  <p style="text-indent: 1.27cm; text-align: justify;">Thực hiện chỉ đạo về việc tăng cường công tác bảo đảm trật tự an toàn giao thông cho lứa tuổi học sinh.</p>
  
  <p style="text-indent: 1.27cm; text-align: justify;">Qua công tác tuần tra kiểm soát/xác minh theo công văn số <strong><<Số công văn>></strong>, Công an xã Kiều Phú ghi nhận trường hợp học sinh vi phạm như sau:</p>
  
  <p style="margin-left: 1.27cm;">- Họ và tên: <strong><<Họ tên>></strong> (Sinh năm: <<Năm sinh>>)</p>
  <p style="margin-left: 1.27cm;">- Hiện trú tại: <strong><<Hộ khẩu>></strong></p>
  <p style="margin-left: 1.27cm;">- Hành vi vi phạm: <strong><<Nội dung vi phạm>></strong></p>

  <p style="text-indent: 1.27cm; font-weight: bold; margin-top: 15px;">Kết quả làm việc/xác minh:</p>
  <p style="text-indent: 1.27cm; text-align: justify;"><<Kết quả xác minh>></p>

  <p style="text-indent: 1.27cm; text-align: justify; margin-top: 15px;">Công an xã thông báo để nhà trường có biện pháp phối hợp giáo dục, quản lý và xử lý theo quy định của ngành giáo dục./.</p>
</div>
${FOOTER_TEMPLATE}
`;

const VerificationManager: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Partial<VerificationRequest> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Document Generation State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState<'mau1' | 'mau2'>('mau1');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  
  // Date states for doc generation
  const today = new Date();
  const [docDay, setDocDay] = useState(today.getDate().toString().padStart(2, '0'));
  const [docMonth, setDocMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));
  const [docYear, setDocYear] = useState(today.getFullYear().toString());

  const [template1, setTemplate1] = useState(TEMPLATE_1_NORMAL);
  const [template2, setTemplate2] = useState(TEMPLATE_2_STUDENT);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    loadSavedTemplates();
  }, []);

  const loadSavedTemplates = async () => {
    const t1 = await StorageService.getTemplate('mau1');
    const t2 = await StorageService.getTemplate('mau2');
    if (t1) setTemplate1(t1);
    if (t2) setTemplate2(t2);
  };

  useEffect(() => {
    if (showDocModal && selectedReq) {
        generateDoc();
    }
  }, [docType, showDocModal, selectedReq, template1, template2, docDay, docMonth, docYear]);

  const refreshData = async () => {
    const data = await StorageService.getVerifications();
    setRequests(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      
      try {
        const extractedData = await GeminiService.extractVerificationInfo(base64Content);
        const newRequest: VerificationRequest = {
          id: Date.now().toString(),
          dispatchNumber: extractedData.dispatchNumber || '...',
          date: extractedData.date || new Date().toISOString().split('T')[0],
          offenderName: extractedData.offenderName || '...',
          idCard: extractedData.idCard || '...',
          yob: extractedData.yob || '...',
          address: extractedData.address || '...',
          violationContent: extractedData.violationContent || '...',
          status: WorkStatus.TODO,
        };

        await StorageService.saveVerification(newRequest);
        await refreshData();
        setSelectedReq(newRequest);
        setIsEditing(false);
      } catch (err) {
        alert('Lỗi khi quét văn bản. Vui lòng thử lại.');
      } finally {
        setIsScanning(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualAdd = () => {
    const newReq: Partial<VerificationRequest> = {
      id: '',
      dispatchNumber: '',
      date: new Date().toISOString().split('T')[0],
      offenderName: '',
      idCard: '',
      yob: '',
      address: '',
      violationContent: '',
      verificationResult: '',
      status: WorkStatus.TODO
    };
    setSelectedReq(newReq);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedReq || !selectedReq.dispatchNumber || !selectedReq.offenderName) {
      alert("Vui lòng nhập ít nhất Số công văn và Tên đối tượng.");
      return;
    }

    const toSave = {
      ...selectedReq,
      id: selectedReq.id || Date.now().toString(),
    } as VerificationRequest;

    await StorageService.saveVerification(toSave);
    await refreshData();
    setSelectedReq(toSave);
    setIsEditing(false);
    alert('Đã lưu hồ sơ thành công.');
  };
  
  const handleSaveTemplate = async () => {
    const contentToSave = docType === 'mau1' ? template1 : template2;
    await StorageService.saveTemplate(docType, contentToSave);
    alert(`Đã lưu ${docType === 'mau1' ? 'Mẫu 1' : 'Mẫu 2'} thành công!`);
    setIsEditingTemplate(false);
  };

  const handleResetTemplate = async () => {
    if (window.confirm("Bạn có chắc muốn khôi phục về mẫu mặc định ban đầu?")) {
        if (docType === 'mau1') {
            setTemplate1(TEMPLATE_1_NORMAL);
            await StorageService.saveTemplate('mau1', TEMPLATE_1_NORMAL);
        } else {
            setTemplate2(TEMPLATE_2_STUDENT);
            await StorageService.saveTemplate('mau2', TEMPLATE_2_STUDENT);
        }
    }
  };

  // --- DOCUMENT GENERATION LOGIC ---
  const generateDoc = () => {
    if (!selectedReq) return;
    
    let rawTemplate = docType === 'mau1' ? template1 : template2;
    
    const mapObj: Record<string, string> = {
      '<<Số công văn>>': selectedReq.dispatchNumber || '..........',
      '<<Ngày yêu cầu>>': selectedReq.date ? new Date(selectedReq.date).toLocaleDateString('vi-VN') : '..........',
      '<<Họ tên>>': selectedReq.offenderName?.toUpperCase() || '....................',
      '<<Năm sinh>>': selectedReq.yob || '....',
      '<<CCCD>>': selectedReq.idCard || '....................',
      '<<Hộ khẩu>>': selectedReq.address || '........................................',
      '<<Nội dung vi phạm>>': selectedReq.violationContent || '....................',
      '<<Kết quả xác minh>>': selectedReq.verificationResult || '(Chưa cập nhật kết quả xác minh)',
      '<<Ngày>>': docDay,
      '<<Tháng>>': docMonth,
      '<<Năm>>': docYear,
    };

    let content = rawTemplate;
    const re = new RegExp(Object.keys(mapObj).join("|"), "gi");
    content = content.replace(re, (matched) => mapObj[matched]);

    setGeneratedHtml(content);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In văn bản</title>
            <style>
              @page { size: A4; margin: 2cm 2cm 2cm 3cm; }
              body { font-family: "Times New Roman", serif; margin: 0; padding: 0; line-height: 1.5; font-size: 14pt; }
            </style>
          </head>
          <body>
            ${generatedHtml}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Phối Hợp Xác Minh</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleManualAdd}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition"
          >
            <Plus className="h-4 w-4"/> Nhập thủ công
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
          >
            {isScanning ? <Loader2 className="animate-spin h-4 w-4"/> : <Upload className="h-4 w-4"/>}
            {isScanning ? 'Đang quét AI...' : 'Quét văn bản (OCR)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-y-auto h-[calc(100vh-140px)]">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h3 className="font-semibold text-slate-700">Danh sách yêu cầu</h3>
          </div>
          <ul className="divide-y">
            {requests.map(req => (
              <li 
                key={req.id} 
                onClick={() => { setSelectedReq(req); setIsEditing(false); }}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition ${selectedReq?.id === req.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-800">CV: {req.dispatchNumber}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${req.status === WorkStatus.DONE ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{req.offenderName}</p>
                <p className="text-xs text-slate-400">{req.date}</p>
              </li>
            ))}
            {requests.length === 0 && <li className="p-8 text-center text-slate-400 text-sm">Chưa có yêu cầu nào.</li>}
          </ul>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-y-auto h-[calc(100vh-140px)] pr-2">
          {selectedReq ? (
            <div className="bg-white p-6 rounded-lg shadow flex-shrink-0">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                   <h3 className="text-lg font-bold">
                     {isEditing ? (selectedReq.id ? 'Chỉnh sửa hồ sơ' : 'Nhập hồ sơ mới') : 'Chi tiết yêu cầu'}
                   </h3>
                   <div className="flex gap-2">
                     {!isEditing && selectedReq.id && (
                       <button 
                          onClick={() => setShowDocModal(true)} 
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 shadow"
                       >
                         <FileOutput className="w-4 h-4" /> Tạo Văn Bản
                       </button>
                     )}
                     {!isEditing && (
                       <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:bg-blue-50 p-2 rounded flex items-center gap-2">
                         <Edit className="w-4 h-4" /> Sửa
                       </button>
                     )}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-slate-500 font-semibold">Số công văn</label>
                     <input type="text" className="w-full border p-2 rounded mt-1" value={selectedReq.dispatchNumber} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, dispatchNumber: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-xs text-slate-500 font-semibold">Ngày yêu cầu</label>
                     <input type="date" className="w-full border p-2 rounded mt-1" value={selectedReq.date} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, date: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-xs text-slate-500 font-semibold">Họ tên đối tượng</label>
                     <input type="text" className="w-full border p-2 rounded mt-1 font-medium" value={selectedReq.offenderName} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, offenderName: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div>
                         <label className="block text-xs text-slate-500 font-semibold">Năm sinh</label>
                         <input type="text" className="w-full border p-2 rounded mt-1" value={selectedReq.yob} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, yob: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-xs text-slate-500 font-semibold">CCCD/CMND</label>
                         <input type="text" className="w-full border p-2 rounded mt-1" value={selectedReq.idCard} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, idCard: e.target.value})} />
                      </div>
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs text-slate-500 font-semibold">Hộ khẩu thường trú</label>
                     <input type="text" className="w-full border p-2 rounded mt-1" value={selectedReq.address} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, address: e.target.value})} />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs text-slate-500 font-semibold">Nội dung vi phạm / Yêu cầu</label>
                     <textarea className="w-full border p-2 rounded mt-1" rows={3} value={selectedReq.violationContent} readOnly={!isEditing} onChange={e => setSelectedReq({...selectedReq, violationContent: e.target.value})} />
                   </div>
                   <div className="md:col-span-2 pt-2 border-t mt-2">
                     <label className="block text-xs font-bold text-blue-700 mb-1">Kết quả xác minh</label>
                     <textarea className="w-full border p-3 rounded border-blue-300 focus:ring-2 focus:ring-blue-200 bg-blue-50" rows={5} value={selectedReq.verificationResult || ''} readOnly={!isEditing} onChange={(e) => setSelectedReq({...selectedReq, verificationResult: e.target.value})} placeholder="Nhập kết quả xác minh thực tế..." />
                   </div>
                </div>
                
                {isEditing && (
                  <div className="mt-6 flex gap-3 justify-end border-t pt-4">
                      <button onClick={() => { setIsEditing(false); if(selectedReq.id) refreshData(); else setSelectedReq(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy bỏ</button>
                      <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 font-bold shadow"><Save className="w-4 h-4" /> Lưu hồ sơ</button>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
              <div className="text-center"><FileText className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>Chọn hoặc nhập mới yêu cầu</p></div>
            </div>
          )}
        </div>
      </div>

      {/* --- DOCUMENT GENERATION MODAL --- */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
             {/* Header */}
             <div className="bg-police-900 text-white p-4 flex justify-between items-center rounded-t-lg flex-shrink-0">
               <div className="flex items-center gap-4">
                 <h3 className="font-bold text-lg">Soạn Văn Bản</h3>
                 <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="text-slate-800 text-sm rounded px-2 py-1">
                   <option value="mau1">Mẫu 1: Thường</option>
                   <option value="mau2">Mẫu 2: Học sinh</option>
                 </select>
                 
                 {/* DATE INPUTS */}
                 <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded">
                    <Calendar className="w-3 h-3" />
                    <input type="text" className="w-6 bg-transparent text-center border-b border-white/50 focus:outline-none text-sm" value={docDay} onChange={e => setDocDay(e.target.value)} placeholder="DD" />
                    <span>/</span>
                    <input type="text" className="w-6 bg-transparent text-center border-b border-white/50 focus:outline-none text-sm" value={docMonth} onChange={e => setDocMonth(e.target.value)} placeholder="MM" />
                    <span>/</span>
                    <input type="text" className="w-10 bg-transparent text-center border-b border-white/50 focus:outline-none text-sm" value={docYear} onChange={e => setDocYear(e.target.value)} placeholder="YYYY" />
                 </div>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setIsEditingTemplate(!isEditingTemplate)} className={`px-3 py-1 rounded text-sm flex items-center gap-2 ${isEditingTemplate ? 'bg-yellow-500 text-black' : 'bg-white/20 hover:bg-white/30'}`}>
                    <Settings className="w-4 h-4" /> {isEditingTemplate ? 'Đang sửa mẫu' : 'Sửa mẫu'}
                 </button>
                 <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded text-sm flex items-center gap-2 shadow font-bold">
                    <Printer className="w-4 h-4" /> In Ngay
                 </button>
                 <button onClick={() => setShowDocModal(false)} className="hover:bg-white/20 p-1 rounded ml-2">Đóng</button>
               </div>
             </div>

             {/* Content Body */}
             <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto p-8 bg-slate-200 flex justify-center">
                   <div className="bg-white shadow-lg p-[2cm] w-[21cm] min-h-[29.7cm] text-black relative" style={{ fontFamily: "'Times New Roman', serif" }}>
                      {isEditingTemplate ? (
                         <div className="h-full flex flex-col">
                           <div className="bg-yellow-100 border border-yellow-300 p-3 mb-3 text-sm text-yellow-800 flex justify-between items-center rounded">
                             <div><strong>Chế độ sửa mẫu gốc:</strong> Hãy chỉnh sửa và lưu lại.</div>
                             <button onClick={handleResetTemplate} className="text-red-600 hover:text-red-800 text-xs underline flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset</button>
                           </div>
                           <textarea className="flex-1 w-full border p-4 font-mono text-sm rounded focus:ring-2 focus:ring-yellow-400 outline-none" value={docType === 'mau1' ? template1 : template2} onChange={(e) => docType === 'mau1' ? setTemplate1(e.target.value) : setTemplate2(e.target.value)} />
                           <div className="mt-4 flex justify-end">
                              <button onClick={handleSaveTemplate} className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold"><Save className="w-4 h-4" /> Lưu Cấu Hình</button>
                           </div>
                         </div>
                      ) : (
                         <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
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

export default VerificationManager;
