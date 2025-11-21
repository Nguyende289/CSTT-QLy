import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Document, DocType, Folder } from '../types';
import { Folder as FolderIcon, FileText, Plus, Save, Printer, Trash2, Search, Cloud, ArrowLeft, Upload, Loader2, Download, Edit, PenTool, Tag, ChevronRight, ChevronDown, FolderPlus, Check, Eye, PlusSquare, MinusSquare, AlertTriangle, Copy, CheckCircle } from 'lucide-react';

// --- STANDARD TEMPLATES ---
const HEADER_ADMIN = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-bottom: 20px; line-height: 1.3;">
  <tr>
    <td style="width: 40%; text-align: center; vertical-align: top; font-size: 13pt;">
      <strong>CÔNG AN TP HÀ NỘI</strong><br />
      <strong>CÔNG AN XÃ KIỀU PHÚ</strong><br />
      <hr style="width: 30%; border: 1px solid black; margin: 5px auto;" />
      Số: <<Số công văn>>
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

const FOOTER_ADMIN = `
<table style="width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif; margin-top: 30px; line-height: 1.3;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top; font-size: 12pt; font-style: italic;">
      <strong><em>Nơi nhận:</em></strong><br />
      - <<Nơi nhận>>;<br />
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

const BODY_TEMPLATE = `
<div style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; text-align: justify;">
  <h3 style="text-align: center; font-weight: bold; margin: 20px 0; text-transform: uppercase;"><<Tiêu đề>></h3>
  <p style="text-align: center; font-weight: bold; margin-top: 5px; margin-bottom: 20px;"><<Về việc>></p>
  
  <div style="text-indent: 1.27cm; min-height: 200px;">
     Kính gửi: ..........................................................................
     <br/><br/>
     (Nội dung văn bản soạn thảo tại đây...)
  </div>
</div>
`;

type ViewMode = 'list' | 'view' | 'edit';

const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDoc, setCurrentDoc] = useState<Partial<Document>>({});
  const [recipient, setRecipient] = useState(''); // For footer
  
  // Save Location & Conflict Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [conflictDoc, setConflictDoc] = useState<Document | null>(null); // Track conflict

  // AI Scan State
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  // Ref for Direct Edit (Paper)
  const directEditRef = useRef<HTMLDivElement>(null);

  // Dates for template
  const today = new Date();
  const [docDay, setDocDay] = useState(today.getDate().toString().padStart(2,'0'));
  const [docMonth, setDocMonth] = useState((today.getMonth()+1).toString().padStart(2,'0'));
  const [docYear, setDocYear] = useState(today.getFullYear().toString());

  // Tree UI State
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const docs = await StorageService.getDocuments();
    const foldersData = await StorageService.getFolders();
    setDocuments(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setFolders(foldersData);

    // Expand current year by default if exists
    const currentYear = new Date().getFullYear().toString();
    const yearFolder = foldersData.find(f => f.name.includes(currentYear));
    if (yearFolder) {
        setExpandedFolders(prev => new Set(prev).add(yearFolder.id));
        if (!selectedFolderId) setSelectedFolderId(yearFolder.id);
    }
  };

  // --- TREE HELPERS ---
  const buildTree = (parentId: string | null) => {
      return folders.filter(f => f.parentId === parentId);
  };

  const toggleFolder = (id: string) => {
      const newSet = new Set(expandedFolders);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedFolders(newSet);
  };

  const handleCreateFolder = async (parentId: string | null) => {
      let suggestion = '';
      if (parentId === null) {
          // Suggest next year
          const years = folders.filter(f => f.type === 'year').map(f => parseInt(f.name.replace(/\D/g, ''))).filter(n => !isNaN(n));
          const nextYear = years.length > 0 ? Math.max(...years) + 1 : new Date().getFullYear() + 1;
          suggestion = `Năm ${nextYear}`;
      } else {
          suggestion = 'Thư mục mới';
      }

      const name = prompt("Nhập tên thư mục:", suggestion);
      if (name) {
          const newFolder: Folder = {
              id: `f_${Date.now()}`,
              name,
              parentId,
              type: parentId === null ? 'year' : 'category'
          };
          await StorageService.saveFolder(newFolder);
          await loadData();
          // Auto expand parent
          if (parentId) setExpandedFolders(prev => new Set(prev).add(parentId));
          
          // If inside save modal, select the new folder
          if (showSaveModal) setTargetFolderId(newFolder.id);
      }
  };

  // --- FILTERED DOCS ---
  const filteredDocs = useMemo(() => {
      if (!selectedFolderId) return [];
      return documents.filter(d => d.folderId === selectedFolderId);
  }, [documents, selectedFolderId]);

  // --- ACTION HANDLERS ---
  const handleCreateNew = () => {
    setCurrentDoc({
        id: '',
        name: '',
        title: 'KẾ HOẠCH',
        about: 'V/v ........................................',
        type: 'Công văn',
        dispatchNumber: '.../KH-CAX',
        date: new Date().toISOString().split('T')[0],
        status: 'Dự thảo',
        htmlTemplate: '',
        folderId: selectedFolderId || undefined
    });
    setRecipient('Như trên');
    setTargetFolderId(selectedFolderId); // Default save location
    setConflictDoc(null);
    setViewMode('edit');
    
    // Generate initial HTML for the paper
    setTimeout(regenerateTemplate, 100);
  };

  const handleViewDoc = (doc: Document) => {
    setCurrentDoc({ ...doc });
    setTargetFolderId(doc.folderId || null);
    setConflictDoc(null);
    setViewMode('view');
  };

  const handleEditFromView = () => {
      setViewMode('edit');
  };

  // Load HTML into contentEditable when entering Edit Mode or View Mode
  useEffect(() => {
      if ((viewMode === 'edit' || viewMode === 'view') && directEditRef.current) {
          if (currentDoc.htmlTemplate && currentDoc.htmlTemplate.length > 20) {
              directEditRef.current.innerHTML = currentDoc.htmlTemplate;
          } else if (viewMode === 'edit') {
              // Only regenerate if missing and in edit mode
              regenerateTemplate();
          }
      }
  }, [viewMode, currentDoc.id]);


  const handleDeleteDoc = async (id: string) => {
      if (confirm("Bạn chắc chắn muốn xóa văn bản này?")) {
          await StorageService.deleteDocument(id);
          loadData();
      }
  };

  // --- GENERATION & AI LOGIC ---
  const handleScanImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     setIsScanning(true);

     try {
         const files = Array.from(e.target.files) as File[];
         const base64Promises = files.map(file => new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => {
                 const base64 = reader.result as string;
                 resolve(base64.split(',')[1]);
             };
             reader.readAsDataURL(file);
         }));

         const base64Images = await Promise.all(base64Promises);
         const reconstructedHtml = await GeminiService.reconstructDocument(base64Images);

         // Inject result into editor
         if (directEditRef.current) {
             directEditRef.current.innerHTML = reconstructedHtml;
         }
         
         // Auto generate name
         const now = new Date();
         const formattedName = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}.${now.getHours().toString().padStart(2,'0')}.${now.getMinutes().toString().padStart(2,'0')} Quét AI`;

         setCurrentDoc(prev => ({
             ...prev,
             name: formattedName,
             title: 'VĂN BẢN QUÉT AI',
             about: 'V/v Trích yếu nội dung...',
             htmlTemplate: reconstructedHtml
         }));

     } catch (error) {
         alert("Lỗi khi quét ảnh: " + error);
     } finally {
         setIsScanning(false);
         if (fileInputRef.current) fileInputRef.current.value = '';
     }
  };

  const regenerateTemplate = () => {
     if (!directEditRef.current) return;

     let fullHtml = HEADER_ADMIN + BODY_TEMPLATE + FOOTER_ADMIN;
     
     const mapObj: Record<string, string> = {
         '<<Số công văn>>': currentDoc.dispatchNumber || '.......',
         '<<Ngày>>': docDay,
         '<<Tháng>>': docMonth,
         '<<Năm>>': docYear,
         '<<Tiêu đề>>': currentDoc.title?.toUpperCase() || 'TIÊU ĐỀ VĂN BẢN',
         '<<Về việc>>': currentDoc.about || '',
         '<<Nơi nhận>>': recipient || '...........'
     };

     const re = new RegExp(Object.keys(mapObj).join("|"), "gi");
     const finalHtml = fullHtml.replace(re, (matched) => mapObj[matched]);
     
     directEditRef.current.innerHTML = finalHtml;
  };

  const handleOpenSaveModal = () => {
      if (!currentDoc.name) {
          alert("Vui lòng nhập tên văn bản (Tên lưu trữ)");
          return;
      }
      if (!currentDoc.title) {
          alert("Vui lòng nhập tiêu đề (Tên loại văn bản)");
          return;
      }
      // Capture final HTML
      const finalHtml = directEditRef.current?.innerHTML || '';
      setCurrentDoc(prev => ({ ...prev, htmlTemplate: finalHtml }));
      
      // If not yet assigned a folder, set to current selected or root
      if (!targetFolderId) setTargetFolderId(selectedFolderId);
      setConflictDoc(null); // Reset conflict state
      setShowSaveModal(true);
  };

  // Check for duplicate names in the selected folder
  const handleCheckAndSave = async () => {
      if (!targetFolderId) {
          alert("Vui lòng chọn thư mục lưu.");
          return;
      }

      // 1. Check duplication
      const duplicate = await StorageService.checkDocumentNameExists(targetFolderId, currentDoc.name || '', currentDoc.id);
      
      if (duplicate) {
          setConflictDoc(duplicate);
          return; // Stop and show conflict UI
      }

      // 2. No conflict, proceed
      await executeSave(currentDoc.id || Date.now().toString());
  };

  // Execute final save
  const executeSave = async (docId: string, newName?: string) => {
       const docToSave: Document = {
          id: docId,
          name: newName || currentDoc.name || 'Un-named',
          title: currentDoc.title || 'Văn bản',
          about: currentDoc.about || '',
          type: currentDoc.type as DocType,
          dispatchNumber: currentDoc.dispatchNumber,
          date: currentDoc.date || new Date().toISOString().split('T')[0],
          content: '', 
          status: currentDoc.status as any,
          htmlTemplate: currentDoc.htmlTemplate,
          folderId: targetFolderId || undefined
      };

      await StorageService.saveDocument(docToSave);
      await loadData();
      setShowSaveModal(false);
      setConflictDoc(null);
      setViewMode('list');
  };

  // Resolve Conflict Options
  const handleOverwrite = async () => {
      if (conflictDoc) {
          await executeSave(conflictDoc.id); // Use existing ID to overwrite
      }
  };

  const handleSaveAsCopy = async () => {
      const newName = `${currentDoc.name} (Copy)`;
      await executeSave(Date.now().toString(), newName); // New ID, New Name
  };

  const handlePrint = () => {
      const html = directEditRef.current?.innerHTML || '';
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
                ${html}
                <script>window.onload = function() { window.print(); window.close(); }</script>
              </body>
            </html>
          `);
          printWindow.document.close();
      }
  };

  // --- ROBUST MOBILE DOWNLOAD FIX ---
  const handleExportWord = () => {
    setIsDownloading(true);
    setDownloadReady(false);

    // 1. Prepare Content
    const content = directEditRef.current?.innerHTML || currentDoc.htmlTemplate || '';
    const preHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${currentDoc.name || 'Document'}</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
        </style>
      </head>
      <body>`;
    const postHtml = "</body></html>";
    const html = preHtml + content + postHtml;
    
    // 2. Create Blob with proper BOM and MIME
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    
    // 3. Create Object URL
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    
    const safeName = currentDoc.name ? currentDoc.name.replace(/[^a-z0-9\u00a1-\uffff]/gi, '_') : 'van_ban';
    const filename = `${safeName}.doc`;
    downloadLink.href = url;
    downloadLink.download = filename;
    
    // 4. Trigger Click immediately
    downloadLink.click();

    // 5. Change state to "Ready" to show the "Continue" button
    // We do NOT automatically revoke the URL. We wait for user confirmation.
    setTimeout(() => {
        setDownloadReady(true);
    }, 1000);
  };

  const handleFinishDownload = () => {
      // Clean up logic runs when user clicks "Continue"
      setIsDownloading(false);
      setDownloadReady(false);
      // Clean up DOM elements (optional but good practice)
      const links = document.querySelectorAll('a[download]');
      links.forEach(link => {
          if(link.parentNode) link.parentNode.removeChild(link);
      });
  };

  // --- RENDER WINDOWS-STYLE TREE NODE ---
  const renderWindowsTreeNode = (folder: Folder, level: number = 0) => {
      const children = buildTree(folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;

      return (
          <div key={folder.id}>
              <div 
                className={`flex items-center gap-1 py-1 px-2 cursor-pointer select-none whitespace-nowrap ${isSelected ? 'bg-blue-200 border border-blue-300 text-black' : 'hover:bg-slate-100 text-slate-700 border border-transparent'}`}
                style={{ paddingLeft: `${level * 20 + 4}px` }}
                onClick={() => {
                    setSelectedFolderId(folder.id);
                    // Auto expand if selecting
                    setExpandedFolders(prev => new Set(prev).add(folder.id));
                }}
              >
                  {/* Expand/Collapse Icon */}
                  <div onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} className="w-4 h-4 flex items-center justify-center mr-1">
                      {children.length > 0 ? (
                          isExpanded ? <MinusSquare className="w-3 h-3 text-slate-500"/> : <PlusSquare className="w-3 h-3 text-slate-500"/>
                      ) : <div className="w-3 h-3"/>}
                  </div>

                  {/* Folder Icon */}
                  {folder.type === 'year' ? (
                      <FolderPlus className={`w-4 h-4 ${isExpanded ? 'text-yellow-600' : 'text-yellow-500'}`}/>
                  ) : (
                      <FolderIcon className={`w-4 h-4 ${isExpanded ? 'text-yellow-500' : 'text-yellow-400'} fill-yellow-100`}/>
                  )}
                  
                  <span className="text-sm">{folder.name}</span>
              </div>
              
              {isExpanded && children.map(child => renderWindowsTreeNode(child, level + 1))}
          </div>
      );
  };

  const renderSaveLocationNode = (folder: Folder, level: number = 0) => {
      const children = buildTree(folder.id);
      const isSelected = targetFolderId === folder.id;
      const isExpanded = expandedFolders.has(folder.id);

      return (
          <div key={folder.id}>
              <div 
                 onClick={() => { setTargetFolderId(folder.id); setConflictDoc(null); }}
                 className={`flex items-center gap-2 py-1 px-2 cursor-pointer border-b border-slate-50 ${isSelected ? 'bg-blue-100 font-bold text-blue-900' : 'hover:bg-slate-50'}`}
                 style={{ paddingLeft: `${level * 16 + 8}px` }}
              >
                  {children.length > 0 ? (
                      <div onClick={(e) => {e.stopPropagation(); toggleFolder(folder.id)}}><ChevronDown className={`w-3 h-3 text-slate-400 ${isExpanded ? '' : '-rotate-90'}`} /></div>
                  ) : <div className="w-3"/>}
                  
                  <FolderIcon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-yellow-500'}`}/>
                  <span className="text-sm truncate">{folder.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-green-600 ml-auto"/>}
              </div>
              {isExpanded && children.map(c => renderSaveLocationNode(c, level + 1))}
          </div>
      );
  };

  // --- MAIN RENDER ---
  if (viewMode === 'edit' || viewMode === 'view') {
      const isReadOnly = viewMode === 'view';
      return (
          <div className="p-6 h-full flex flex-col animate-fade-in">
              {/* Editor Header */}
              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft/></button>
                      <h2 className="text-xl font-bold text-slate-800">
                          {isReadOnly ? 'Xem Văn Bản' : 'Soạn Thảo / Chỉnh Sửa'}
                      </h2>
                  </div>
                  <div className="flex gap-2">
                      {isReadOnly ? (
                          <>
                            <button onClick={handleExportWord} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-bold shadow text-sm">
                                <Download className="w-4 h-4"/> Tải về
                            </button>
                            <button onClick={handleEditFromView} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold shadow text-sm">
                                <Edit className="w-4 h-4"/> Sửa văn bản
                            </button>
                          </>
                      ) : (
                          <>
                            <button onClick={handlePrint} className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-800 font-medium text-sm">
                                <Printer className="w-4 h-4"/> In
                            </button>
                            <button onClick={handleOpenSaveModal} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-bold shadow text-sm">
                                <Save className="w-4 h-4"/> Lưu
                            </button>
                          </>
                      )}
                  </div>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                  {/* LEFT PANEL */}
                  <div className={`w-full lg:w-1/3 bg-white rounded-lg shadow p-6 overflow-y-auto flex flex-col ${isReadOnly ? 'opacity-80 pointer-events-none grayscale' : ''}`}>
                      <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Thông tin văn bản</h3>
                      <div className="space-y-4 flex-1">
                          <div>
                              <label className="block text-sm font-bold text-blue-600 flex items-center gap-1"><Tag className="w-3 h-3"/> Tên văn bản (Lưu trữ)</label>
                              <input 
                                type="text" 
                                disabled={isReadOnly}
                                className="w-full border border-blue-200 bg-blue-50 p-2 rounded mt-1 font-medium focus:ring-2 focus:ring-blue-300" 
                                value={currentDoc.name || ''} 
                                onChange={e => setCurrentDoc({...currentDoc, name: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-slate-600">Loại văn bản</label>
                              <select disabled={isReadOnly} className="w-full border p-2 rounded mt-1" value={currentDoc.type} onChange={e => setCurrentDoc({...currentDoc, type: e.target.value as any})}>
                                  <option value="Công văn">Công văn</option>
                                  <option value="Kế hoạch">Kế hoạch</option>
                                  <option value="Báo cáo">Báo cáo</option>
                                  <option value="Khác">Khác</option>
                              </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600">Số hiệu</label>
                                    <input disabled={isReadOnly} type="text" className="w-full border p-2 rounded mt-1" value={currentDoc.dispatchNumber} onChange={e => setCurrentDoc({...currentDoc, dispatchNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600">Ngày ban hành</label>
                                    <div className="flex gap-1 mt-1">
                                        <input disabled={isReadOnly} type="text" className="w-1/3 border p-2 rounded text-center" placeholder="DD" value={docDay} onChange={e => setDocDay(e.target.value)}/>
                                        <input disabled={isReadOnly} type="text" className="w-1/3 border p-2 rounded text-center" placeholder="MM" value={docMonth} onChange={e => setDocMonth(e.target.value)}/>
                                        <input disabled={isReadOnly} type="text" className="w-1/3 border p-2 rounded text-center" placeholder="YY" value={docYear} onChange={e => setDocYear(e.target.value)}/>
                                    </div>
                                </div>
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-slate-600">Tiêu đề lớn</label>
                              <input disabled={isReadOnly} type="text" className="w-full border p-2 rounded mt-1 font-bold uppercase" value={currentDoc.title} onChange={e => setCurrentDoc({...currentDoc, title: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-slate-600">Về việc</label>
                              <textarea disabled={isReadOnly} className="w-full border p-2 rounded mt-1" rows={3} value={currentDoc.about || ''} onChange={e => setCurrentDoc({...currentDoc, about: e.target.value})} />
                          </div>
                          {!isReadOnly && (
                            <div className="pt-2">
                                <button onClick={regenerateTemplate} className="w-full bg-yellow-100 text-yellow-800 py-2 rounded font-medium text-sm hover:bg-yellow-200 flex items-center justify-center gap-2">
                                    <PenTool className="w-4 h-4"/> Reset Mẫu (Xóa nội dung)
                                </button>
                            </div>
                          )}
                      </div>
                      {!isReadOnly && (
                        <div className="mt-4 pt-4 border-t">
                            <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScanImages} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="w-full bg-purple-600 text-white py-3 rounded font-bold shadow hover:bg-purple-700 flex items-center justify-center gap-2 transition">
                                {isScanning ? <Loader2 className="animate-spin w-5 h-5"/> : <Upload className="w-5 h-5"/>}
                                {isScanning ? 'Đang xử lý AI...' : 'Quét ảnh (OCR)'}
                            </button>
                        </div>
                      )}
                  </div>

                  {/* RIGHT PANEL: Editor/Preview */}
                  <div className="flex-1 bg-slate-200 rounded-lg overflow-y-auto flex justify-center p-4 lg:p-8">
                      <div className="bg-white shadow-lg w-[21cm] min-h-[29.7cm] p-[2cm] text-black origin-top lg:scale-100 scale-75" style={{ fontFamily: "'Times New Roman', serif" }}>
                          {!isReadOnly && (
                            <div className="absolute top-0 right-0 -mt-10 text-slate-500 font-bold text-sm flex items-center gap-1">
                                <Edit className="w-4 h-4"/> Sửa trực tiếp
                            </div>
                          )}
                          <div 
                            ref={directEditRef}
                            contentEditable={!isReadOnly}
                            className={`outline-none min-h-[25cm] p-1 ${isReadOnly ? 'pointer-events-none' : 'cursor-text'}`}
                            suppressContentEditableWarning={true}
                          >
                          </div>
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

              {/* SAVE LOCATION MODAL WITH CONFLICT RESOLUTION */}
              {showSaveModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
                          <div className="p-4 border-b bg-slate-50 rounded-t-lg flex justify-between items-center">
                              <h3 className="font-bold text-slate-800">
                                  {conflictDoc ? 'Phát hiện trùng tên!' : 'Chọn nơi lưu trữ'}
                              </h3>
                              <button onClick={() => {setShowSaveModal(false); setConflictDoc(null);}}><ArrowLeft className="w-5 h-5"/></button>
                          </div>
                          
                          <div className="p-4 overflow-y-auto flex-1">
                             {conflictDoc ? (
                                 <div className="space-y-4">
                                     <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                         <div className="flex items-center gap-2 text-yellow-700 font-bold mb-1">
                                            <AlertTriangle className="w-5 h-5"/> Cảnh báo
                                         </div>
                                         <p className="text-sm text-slate-700">
                                             Văn bản có tên <strong>"{currentDoc.name}"</strong> đã tồn tại trong thư mục này.
                                         </p>
                                         <p className="text-xs text-slate-500 mt-2">
                                             Cập nhật lần cuối: {new Date(conflictDoc.date).toLocaleDateString('vi-VN')}
                                         </p>
                                     </div>
                                     
                                     <div className="space-y-2">
                                         <button onClick={handleOverwrite} className="w-full p-3 text-left bg-white border hover:bg-red-50 hover:border-red-300 rounded flex items-center gap-3 transition">
                                             <div className="bg-red-100 p-2 rounded-full"><Save className="w-4 h-4 text-red-600"/></div>
                                             <div>
                                                 <span className="block font-bold text-slate-800">Ghi đè (Overwrite)</span>
                                                 <span className="block text-xs text-slate-500">Thay thế nội dung file cũ bằng file này.</span>
                                             </div>
                                         </button>

                                         <button onClick={handleSaveAsCopy} className="w-full p-3 text-left bg-white border hover:bg-blue-50 hover:border-blue-300 rounded flex items-center gap-3 transition">
                                             <div className="bg-blue-100 p-2 rounded-full"><Copy className="w-4 h-4 text-blue-600"/></div>
                                             <div>
                                                 <span className="block font-bold text-slate-800">Lưu bản mới (Save as Copy)</span>
                                                 <span className="block text-xs text-slate-500">Tự động đổi tên thành "{currentDoc.name} (Copy)".</span>
                                             </div>
                                         </button>
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-slate-500">Chọn thư mục:</p>
                                        <button 
                                            onClick={() => handleCreateFolder(targetFolderId)} 
                                            disabled={!targetFolderId}
                                            className="text-xs bg-slate-100 hover:bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Plus className="w-3 h-3"/> Tạo thư mục con
                                        </button>
                                    </div>
                                    <div className="border rounded max-h-64 overflow-auto bg-white shadow-inner">
                                        {buildTree(null).map(yearFolder => renderSaveLocationNode(yearFolder))}
                                    </div>
                                    {targetFolderId && (
                                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                            <Check className="w-3 h-3"/> Đã chọn: {folders.find(f => f.id === targetFolderId)?.name}
                                        </p>
                                    )}
                                 </>
                             )}
                          </div>

                          {!conflictDoc && (
                            <div className="p-4 border-t flex justify-end gap-2">
                                <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-600">Hủy</button>
                                <button onClick={handleCheckAndSave} disabled={!targetFolderId} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold disabled:bg-slate-300 shadow">
                                    Xác nhận Lưu
                                </button>
                            </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="p-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           <FileText className="text-blue-600" /> Quản Lý Văn Bản & Kế Hoạch
        </h1>
        <div className="flex gap-2">
            <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { handleCreateNew(); handleScanImages(e); }} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700 shadow font-bold">
               <Upload className="w-4 h-4" /> Quét AI
            </button>
            <button onClick={handleCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow font-bold">
               <Plus className="w-4 h-4" /> Soạn mới
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
         {/* Sidebar Folders Tree (Windows Style) */}
         <div className="w-full lg:w-72 bg-white rounded-lg shadow p-4 h-fit flex flex-col border border-slate-200">
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <Cloud className="w-4 h-4 text-blue-500"/> Cây Thư Mục
                </h3>
                <button onClick={() => handleCreateFolder(null)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Thêm năm mới">
                    <FolderPlus className="w-4 h-4"/>
                </button>
            </div>
            <div className="space-y-0.5 overflow-y-auto max-h-[60vh] font-sans text-sm">
               {buildTree(null).map(yearFolder => renderWindowsTreeNode(yearFolder))}
               {folders.length === 0 && <div className="text-sm text-slate-400 italic p-2">Chưa có thư mục</div>}
            </div>
         </div>

         {/* Main List */}
         <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden min-h-[500px] border border-slate-200">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <FolderIcon className="w-5 h-5 text-yellow-500"/>
                    <span className="font-bold text-slate-700">
                        {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Tất cả'} 
                        <span className="text-slate-400 font-normal text-sm ml-2">({filteredDocs.length} tài liệu)</span>
                    </span>
                 </div>
                 <div className="relative hidden md:block">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                     <input type="text" placeholder="Tìm kiếm..." className="pl-9 pr-4 py-1.5 border rounded text-sm w-64 focus:ring-2 focus:ring-blue-200 outline-none"/>
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-100 text-slate-500 text-sm uppercase sticky top-0 z-10 shadow-sm">
                         <tr>
                             <th className="p-3 border-b w-1/2 pl-6">Tên văn bản</th>
                             <th className="p-3 border-b hidden md:table-cell">Loại</th>
                             <th className="p-3 border-b hidden md:table-cell">Ngày cập nhật</th>
                             <th className="p-3 border-b text-right pr-6">Thao tác</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {filteredDocs.map(doc => (
                             <tr key={doc.id} className="hover:bg-blue-50 group cursor-pointer transition-colors" onClick={() => handleViewDoc(doc)}>
                                 <td className="p-3 pl-6">
                                     <div className="flex items-start gap-3">
                                         <FileText className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0"/>
                                         <div>
                                            <div className="font-bold text-slate-800 text-sm">{doc.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{doc.dispatchNumber || 'Chưa có số'} - {doc.title}</div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="p-3 hidden md:table-cell">
                                     <span className={`text-xs px-2 py-1 rounded border font-bold ${doc.type === 'Kế hoạch' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                         {doc.type}
                                     </span>
                                 </td>
                                 <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{new Date(doc.date).toLocaleDateString('vi-VN')}</td>
                                 <td className="p-3 text-right pr-6" onClick={e => e.stopPropagation()}>
                                     <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                                         <button onClick={() => handleViewDoc(doc)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Xem"><Eye className="w-4 h-4"/></button>
                                         <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Xóa"><Trash2 className="w-4 h-4"/></button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                         {filteredDocs.length === 0 && (
                             <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">Thư mục trống</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </div>
      </div>
    </div>
  );
};

export default DocumentManager;