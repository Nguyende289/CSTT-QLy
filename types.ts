
export enum WorkStatus {
  TODO = 'Chưa thực hiện',
  IN_PROGRESS = 'Đang thực hiện',
  DONE = 'Hoàn thành'
}

export interface AccidentCase {
  id: string;
  date: string;
  location: string;
  content: string;
  fatalities: number;
  injuries: number;
  estimatedDamage: number; // VND
  alcoholLevel: number; // mg/L
  handlingUnit: string;
  status: string;
  result?: string; // Kết quả giải quyết
}

export interface VehicleRegistration {
  id: string;
  date: string;
  type: 'Mới' | 'Sang tên' | 'Thu hồi' | 'Cấp đổi';
  vehicleType: 'Ô tô' | 'Xe máy'; // New field to distinguish vehicle type
  count: number;
  revenue: number;
}

export interface CampaignTarget {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface CampaignLog {
  date: string;
  results: { targetId: string; value: number }[];
}

export interface Campaign {
  id: string;
  name: string;
  dispatchNumber?: string; // Số công văn
  dispatchDate?: string;   // Ngày công văn
  issuingAuthority?: string; // Cơ quan ban hành
  description?: string;    // Nội dung
  startDate: string;
  endDate: string;
  targets: CampaignTarget[];
  logs?: CampaignLog[];    // Lịch sử nhập liệu
  status: 'Active' | 'Completed' | 'Planned';
}

export interface VerificationRequest {
  id: string;
  dispatchNumber: string; // Số công văn
  date: string;
  offenderName: string;
  idCard: string; // CCCD
  yob: string;
  address: string; // Hộ khẩu
  violationContent: string;
  verificationResult?: string;
  status: WorkStatus;
  documentHtml?: string; // Lưu nội dung văn bản đã soạn
}

export interface OCRResult {
  text: string;
  data?: Partial<VerificationRequest>;
}

// --- RESULTS MODULE TYPES ---

export type ResultCategory = 
  | 'Chỉ tiêu'
  | 'Xử lý vi phạm' 
  | 'Công tác tham mưu' 
  | 'Tuần tra kiểm soát' 
  | 'Bảo vệ kỳ cuộc' 
  | 'Tiếp nhận tin báo'
  | 'Tuyên truyền'
  | 'Công tác xác minh'
  | 'Kết quả khác';

export interface WorkResult {
  id: string;
  date: string;
  category: ResultCategory;
  customCategory?: string; // Used if category is 'Kết quả khác'
  content: string;
  quantity?: number; // Made optional
  unit?: string;    // Made optional
  note?: string;
}

// --- DOCUMENT MODULE TYPES ---

export type DocType = 'Công văn' | 'Kế hoạch' | 'Báo cáo' | 'Khác';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null if root (Year folder)
  type: 'year' | 'category';
}

export interface Document {
  id: string;
  folderId?: string; // Link to a folder
  name: string; // Tên văn bản (dùng để quản lý file)
  title: string; // Trích yếu / Tên loại văn bản chính (VD: KẾ HOẠCH)
  about?: string; // Về việc / Nội dung chi tiết (VD: Cao điểm tấn công trấn áp...)
  type: DocType;
  dispatchNumber?: string;
  date: string;
  content: string; // HTML or Text content (Legacy / Backup)
  htmlTemplate?: string; // Full rendered HTML for printing
  status: 'Dự thảo' | 'Đã ban hành';
}

// --- TASK MANAGER TYPES ---

export type TaskType = 'Công việc' | 'Họp' | 'Cá nhân' | 'Thường xuyên';
export type TaskPriority = 'Cao' | 'Trung bình' | 'Thấp';

export interface RecurrenceConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  weekDays?: number[]; // 0=Sunday, 1=Monday...
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;        // YYYY-MM-DD (Initial date)
  time?: string;       // HH:mm (Optional for all-day tasks)
  type: TaskType;
  priority: TaskPriority;
  isCompleted: boolean;
  recurrence?: RecurrenceConfig; // Updated from simple boolean
}