
import { AccidentCase, VehicleRegistration, Campaign, VerificationRequest, WorkStatus, WorkResult, Document, Folder, Task } from '../types';

// Key constants
const KEYS = {
  ACCIDENTS: 'cstt_accidents',
  REGISTRATIONS: 'cstt_registrations',
  CAMPAIGNS: 'cstt_campaigns',
  VERIFICATIONS: 'cstt_verifications',
  RESULTS: 'cstt_results',
  DOCUMENTS: 'cstt_documents',
  FOLDERS: 'cstt_folders',
  TASKS: 'cstt_tasks',
  TEMPLATE_PREFIX: 'cstt_template_',
  REPORT_DIRECTIONS: 'cstt_report_directions',
  SYNC_URL: 'cstt_google_sheet_url' // New Key for URL
};

// Initial Mock Data
const MOCK_ACCIDENTS: AccidentCase[] = [
  { id: '1', date: '2023-10-01', location: 'Ngã 4 Hàng Bài', content: 'Va chạm xe máy và ô tô', fatalities: 0, injuries: 1, estimatedDamage: 5000000, alcoholLevel: 0.0, handlingUnit: 'Đội 1', status: 'Đã xử lý', result: 'Phạt hành chính 5.000.000đ' },
];

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- GOOGLE SHEETS SYNC HELPER ---
const syncToCloud = async (type: string, data: any, action: 'SAVE' | 'DELETE' = 'SAVE') => {
    const url = localStorage.getItem(KEYS.SYNC_URL);
    if (!url) return; // No URL configured, offline mode only

    try {
        // Remove 'no-cors' to get actual response. 
        // Ensure Google Apps Script returns valid JSON (or text/plain)
        
        let response;
        if (action === 'DELETE') {
             response = await fetch(`${url}?action=DELETE&type=${type}&id=${data}`, {
                 method: 'POST', 
                 redirect: 'follow',
                 headers: { "Content-Type": "text/plain;charset=utf-8" }
             });
        } else {
             response = await fetch(`${url}?action=SAVE&type=${type}`, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8' 
                },
                body: JSON.stringify({ data })
            });
        }
        
        if (!response.ok) {
            console.error("Cloud Sync Failed:", response.statusText);
        }
    } catch (e) {
        console.error("Cloud Sync Error:", e);
    }
};

export const StorageService = {
  init: () => {
    if (!localStorage.getItem(KEYS.ACCIDENTS)) localStorage.setItem(KEYS.ACCIDENTS, JSON.stringify(MOCK_ACCIDENTS));
    // Initialize other empty arrays if needed
    ['cstt_registrations', 'cstt_campaigns', 'cstt_verifications', 'cstt_results', 'cstt_documents', 'cstt_folders', 'cstt_tasks'].forEach(k => {
        if (!localStorage.getItem(k)) localStorage.setItem(k, '[]');
    });
  },

  // --- SETTINGS ---
  getSyncUrl: () => localStorage.getItem(KEYS.SYNC_URL) || '',
  setSyncUrl: (url: string) => localStorage.setItem(KEYS.SYNC_URL, url),
  
  // --- FULL SYNC (DOWNLOAD FROM CLOUD) ---
  pullFromCloud: async (): Promise<{success: boolean, message: string}> => {
      const url = localStorage.getItem(KEYS.SYNC_URL);
      if (!url) return { success: false, message: "Chưa cấu hình đường dẫn Google Sheet" };

      try {
          const response = await fetch(`${url}?action=READ_ALL`);
          if (!response.ok) throw new Error("Network response was not ok");
          
          const result = await response.json();
          
          if (result) {
              if(result.accidents) localStorage.setItem(KEYS.ACCIDENTS, JSON.stringify(result.accidents));
              if(result.registrations) localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(result.registrations));
              if(result.campaigns) localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(result.campaigns));
              if(result.verifications) localStorage.setItem(KEYS.VERIFICATIONS, JSON.stringify(result.verifications));
              if(result.results) localStorage.setItem(KEYS.RESULTS, JSON.stringify(result.results));
              if(result.documents) localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(result.documents));
              if(result.folders) localStorage.setItem(KEYS.FOLDERS, JSON.stringify(result.folders));
              if(result.tasks) localStorage.setItem(KEYS.TASKS, JSON.stringify(result.tasks));
              return { success: true, message: "Đồng bộ dữ liệu thành công!" };
          }
          return { success: false, message: "Không đọc được dữ liệu từ Sheet" };
      } catch (e) {
          console.error(e);
          return { success: false, message: "Lỗi kết nối: " + e };
      }
  },

  // --- Accidents ---
  getAccidents: async (): Promise<AccidentCase[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.ACCIDENTS) || '[]');
  },
  saveAccident: async (data: AccidentCase) => {
    // 1. Save Local
    const list = JSON.parse(localStorage.getItem(KEYS.ACCIDENTS) || '[]');
    const index = list.findIndex((i: AccidentCase) => i.id === data.id);
    if (index >= 0) list[index] = data;
    else list.push(data);
    localStorage.setItem(KEYS.ACCIDENTS, JSON.stringify(list));
    
    // 2. Sync Cloud
    await syncToCloud('accidents', data);
  },
  deleteAccident: async (id: string) => {
    const list = JSON.parse(localStorage.getItem(KEYS.ACCIDENTS) || '[]');
    const newList = list.filter((i: AccidentCase) => i.id !== id);
    localStorage.setItem(KEYS.ACCIDENTS, JSON.stringify(newList));
    
    // Sync Cloud Delete
    await syncToCloud('accidents', id, 'DELETE');
  },

  // --- Registrations ---
  getRegistrations: async (): Promise<VehicleRegistration[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS) || '[]');
  },
  saveDailyRegistrations: async (newRecords: VehicleRegistration[]) => {
     const list = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS) || '[]');
     
     // Ensure we replace old records with matching IDs
     const newIds = new Set(newRecords.map(r => r.id));
     const filtered = list.filter((r: VehicleRegistration) => !newIds.has(r.id));
     const updated = [...filtered, ...newRecords];
     
     localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(updated));

     // Sync each record (can be optimized to batch in future)
     for (const r of newRecords) {
         await syncToCloud('registrations', r);
     }
  },

  // --- Campaigns ---
  getCampaigns: async (): Promise<Campaign[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.CAMPAIGNS) || '[]');
  },
  saveCampaign: async (campaign: Campaign) => {
    const list = JSON.parse(localStorage.getItem(KEYS.CAMPAIGNS) || '[]');
    const index = list.findIndex((c: Campaign) => c.id === campaign.id);
    if (index >= 0) list[index] = campaign;
    else list.push(campaign);
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(list));
    
    await syncToCloud('campaigns', campaign);
  },
  logCampaignDailyProgress: async (campaignId: string, date: string, dailyResults: {targetId: string, value: number}[]) => {
     const list = JSON.parse(localStorage.getItem(KEYS.CAMPAIGNS) || '[]');
     const index = list.findIndex((c: Campaign) => c.id === campaignId);
     
     if (index >= 0) {
        const campaign = list[index];
        dailyResults.forEach(res => {
           const tIndex = campaign.targets.findIndex((t: any) => t.id === res.targetId);
           if (tIndex >= 0) {
             campaign.targets[tIndex].current += res.value;
           }
        });
        if (!campaign.logs) campaign.logs = [];
        campaign.logs.push({ date, results: dailyResults });
        list[index] = campaign;
        localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(list));
        
        await syncToCloud('campaigns', campaign);
     }
  },
  deleteCampaign: async (id: string) => {
     const list = JSON.parse(localStorage.getItem(KEYS.CAMPAIGNS) || '[]');
     const newList = list.filter((c: Campaign) => c.id !== id);
     localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(newList));
     await syncToCloud('campaigns', id, 'DELETE');
  },

  // --- Verifications ---
  getVerifications: async (): Promise<VerificationRequest[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.VERIFICATIONS) || '[]');
  },
  saveVerification: async (data: VerificationRequest) => {
    const list = JSON.parse(localStorage.getItem(KEYS.VERIFICATIONS) || '[]');
    const index = list.findIndex((i: VerificationRequest) => i.id === data.id);
    if (index >= 0) list[index] = data;
    else list.push(data);
    localStorage.setItem(KEYS.VERIFICATIONS, JSON.stringify(list));
    
    await syncToCloud('verifications', data);
  },

  // --- Results ---
  getResults: async (): Promise<WorkResult[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.RESULTS) || '[]');
  },
  saveResult: async (data: WorkResult) => {
    const list = JSON.parse(localStorage.getItem(KEYS.RESULTS) || '[]');
    const index = list.findIndex((i: WorkResult) => i.id === data.id);
    if (index >= 0) list[index] = data;
    else list.push(data);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(list));
    
    await syncToCloud('results', data);
  },
  deleteResult: async (id: string) => {
    const list = JSON.parse(localStorage.getItem(KEYS.RESULTS) || '[]');
    const newList = list.filter((i: WorkResult) => i.id !== id);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(newList));
    await syncToCloud('results', id, 'DELETE');
  },

  // --- Folders ---
  getFolders: async (): Promise<Folder[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.FOLDERS) || '[]');
  },
  saveFolder: async (folder: Folder): Promise<Folder> => {
    const list = JSON.parse(localStorage.getItem(KEYS.FOLDERS) || '[]');
    const index = list.findIndex((f: Folder) => f.id === folder.id);
    if (index >= 0) list[index] = folder;
    else list.push(folder);
    localStorage.setItem(KEYS.FOLDERS, JSON.stringify(list));
    
    await syncToCloud('folders', folder);
    return folder;
  },

  // --- Documents ---
  getDocuments: async (): Promise<Document[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]');
  },
  checkDocumentNameExists: async (folderId: string, name: string, excludeId?: string): Promise<Document | null> => {
      const list: Document[] = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]');
      return list.find(d => d.folderId === folderId && d.name === name && d.id !== excludeId) || null;
  },
  saveDocument: async (data: Document) => {
    const list = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]');
    const index = list.findIndex((i: Document) => i.id === data.id);
    if (index >= 0) list[index] = data;
    else list.push(data);
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(list));
    
    await syncToCloud('documents', data);
  },
  deleteDocument: async (id: string) => {
    const list = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]');
    const newList = list.filter((i: Document) => i.id !== id);
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(newList));
    await syncToCloud('documents', id, 'DELETE');
  },

  // --- Tasks ---
  getTasks: async (): Promise<Task[]> => {
    await delay(100);
    return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
  },
  saveTask: async (task: Task) => {
    const list = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const index = list.findIndex((t: Task) => t.id === task.id);
    if (index >= 0) list[index] = task;
    else list.push(task);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(list));
    
    await syncToCloud('tasks', task);
  },
  deleteTask: async (id: string) => {
    const list = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const newList = list.filter((t: Task) => t.id !== id);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(newList));
    await syncToCloud('tasks', id, 'DELETE');
  },

  // --- Templates & Configs (Local Only usually) ---
  saveTemplate: async (key: string, content: string) => {
    localStorage.setItem(KEYS.TEMPLATE_PREFIX + key, content);
  },
  getTemplate: async (key: string): Promise<string | null> => {
    return localStorage.getItem(KEYS.TEMPLATE_PREFIX + key);
  },
  saveReportDirections: async (content: string) => {
    localStorage.setItem(KEYS.REPORT_DIRECTIONS, content);
  },
  getReportDirections: async (): Promise<string | null> => {
    return localStorage.getItem(KEYS.REPORT_DIRECTIONS);
  }
};

StorageService.init();
