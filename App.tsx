
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertOctagon, FileSpreadsheet, ClipboardList, ShieldCheck, BarChart3, Menu, FileText, PieChart, FolderOpen, X, CheckSquare, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import VerificationManager from './components/VerificationManager';
import CampaignManager from './components/CampaignManager';
import ReportGenerator from './components/ReportGenerator';
import AccidentManager from './components/AccidentManager';
import VehicleRegistrationManager from './components/VehicleRegistrationManager';
import ResultManager from './components/ResultManager';
import DocumentManager from './components/DocumentManager';
import TaskManager from './components/TaskManager';
import Settings from './components/Settings';

// Simple Sidebar Navigation Item
const NavItem = ({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-police-700 text-white shadow-lg' : 'text-slate-300 hover:bg-police-800 hover:text-white'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const App: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <Router>
      <div className="flex h-screen bg-slate-100 overflow-hidden">
        
        {/* Mobile Menu Overlay (Backdrop) */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in"
            onClick={closeMobileMenu}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            bg-police-900 text-white flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
            fixed inset-y-0 left-0 z-40 w-64 h-full shadow-2xl
            md:relative md:translate-x-0 md:shadow-none
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="p-6 flex items-center justify-between border-b border-police-800">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="font-bold text-lg leading-tight">CSTT Manager</h1>
                <p className="text-xs text-police-300">Phòng Cảnh sát QLHC</p>
              </div>
            </div>
            {/* Close button for mobile */}
            <button onClick={closeMobileMenu} className="md:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Tổng quan" onClick={closeMobileMenu} />
            <NavItem to="/tasks" icon={<CheckSquare className="w-5 h-5" />} label="Việc cần làm & Nhắc việc" onClick={closeMobileMenu} />
            <NavItem to="/results" icon={<PieChart className="w-5 h-5" />} label="Kết quả công tác" onClick={closeMobileMenu} />
            <NavItem to="/accidents" icon={<AlertOctagon className="w-5 h-5" />} label="Tai nạn giao thông" onClick={closeMobileMenu} />
            <NavItem to="/verifications" icon={<ClipboardList className="w-5 h-5" />} label="Phối hợp xác minh" onClick={closeMobileMenu} />
            <NavItem to="/campaigns" icon={<BarChart3 className="w-5 h-5" />} label="Chuyên đề & Sự kiện" onClick={closeMobileMenu} />
            <NavItem to="/vehicle-reg" icon={<FileSpreadsheet className="w-5 h-5" />} label="Đăng ký xe" onClick={closeMobileMenu} />
            <NavItem to="/documents" icon={<FolderOpen className="w-5 h-5" />} label="Quản lý văn bản" onClick={closeMobileMenu} />
            <div className="pt-4 mt-4 border-t border-police-800">
              <p className="px-4 text-xs text-police-400 uppercase font-bold mb-2">Công cụ AI</p>
              <NavItem to="/reports" icon={<FileText className="w-5 h-5" />} label="Tạo báo cáo tự động" onClick={closeMobileMenu} />
            </div>
          </nav>

          <div className="p-4 border-t border-police-800">
            <NavItem to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Cài đặt kết nối" onClick={closeMobileMenu} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative flex flex-col w-full">
          {/* Mobile Header */}
          <header className="bg-police-900 text-white shadow-sm p-4 flex items-center justify-between md:hidden sticky top-0 z-20">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 -ml-1 rounded hover:bg-police-800">
                 <Menu className="w-7 h-7" />
               </button>
               <div className="flex items-center gap-2">
                 <ShieldCheck className="w-6 h-6 text-yellow-400" />
                 <span className="font-bold text-lg">CSTT App</span>
               </div>
             </div>
             <div className="flex gap-4">
                <Link to="/"><LayoutDashboard className="w-6 h-6 text-slate-300 hover:text-white" /></Link>
                <Link to="/tasks"><CheckSquare className="w-6 h-6 text-slate-300 hover:text-white" /></Link>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<TaskManager />} />
              <Route path="/results" element={<ResultManager />} />
              <Route path="/verifications" element={<VerificationManager />} />
              <Route path="/campaigns" element={<CampaignManager />} />
              <Route path="/reports" element={<ReportGenerator />} />
              <Route path="/accidents" element={<AccidentManager />} />
              <Route path="/vehicle-reg" element={<VehicleRegistrationManager />} />
              <Route path="/documents" element={<DocumentManager />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
