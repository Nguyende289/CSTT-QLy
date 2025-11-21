
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Task, TaskPriority, TaskType, RecurrenceConfig } from '../types';
import { Calendar, CheckCircle, Clock, Plus, Trash2, Bell, User, Briefcase, RotateCcw, ChevronLeft, ChevronRight, PieChart, X, Sun, Sunset, Moon, AlertTriangle, Repeat } from 'lucide-react';

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [formData, setFormData] = useState<Partial<Task>>({
    type: 'Công việc',
    priority: 'Trung bình',
    recurrence: { enabled: false, frequency: 'daily' }
  });

  useEffect(() => {
    loadTasks();
    // Update current time every minute for alerts
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadTasks = async () => {
    const data = await StorageService.getTasks();
    setTasks(data);
  };

  // --- DATE HELPERS ---
  const formattedDateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);
  
  const changeDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + days);
      setSelectedDate(newDate);
  };

  // --- SMART FILTERING & GROUPING ---
  
  // 1. Filter tasks for the selected day (Handling Recurrence)
  const daysTasks = useMemo(() => {
      return tasks.filter(t => {
          if (!t.recurrence || !t.recurrence.enabled) {
              // Simple single date match
              return t.date === formattedDateStr;
          } else {
              // Advanced Recurrence Logic
              const { frequency, weekDays, dayOfMonth, monthOfYear } = t.recurrence;
              
              if (frequency === 'daily') return true;
              
              if (frequency === 'weekly') {
                  const currentDay = selectedDate.getDay(); // 0-6
                  return weekDays?.includes(currentDay);
              }
              
              if (frequency === 'monthly') {
                  const currentD = selectedDate.getDate();
                  return currentD === dayOfMonth;
              }
              
              if (frequency === 'yearly') {
                  const currentD = selectedDate.getDate();
                  const currentM = selectedDate.getMonth() + 1; // 1-12
                  return currentD === dayOfMonth && currentM === monthOfYear;
              }
              
              return false;
          }
      });
  }, [tasks, formattedDateStr, selectedDate]);

  // 2. Logic for 1-Hour Warning
  const checkUrgency = (task: Task) => {
      if (task.isCompleted || !task.time) return false;
      // If task is today (or recurring today)
      const now = new Date();
      const taskDate = new Date(selectedDate); // Use selected date context
      const [hours, minutes] = task.time.split(':').map(Number);
      taskDate.setHours(hours, minutes, 0);

      // Only alert if selected date is TODAY
      const isToday = new Date().toDateString() === selectedDate.toDateString();
      if (!isToday) return false;

      const diffMs = taskDate.getTime() - now.getTime();
      const diffMins = diffMs / 60000;

      // Warning if between 0 and 60 minutes remaining
      return diffMins > 0 && diffMins <= 60;
  };

  // 3. Grouping logic
  const taskGroups = useMemo(() => {
      const groups = {
          urgent: [] as Task[],
          morning: [] as Task[], // 00:00 - 11:59
          afternoon: [] as Task[], // 12:00 - 17:59
          evening: [] as Task[], // 18:00 - 23:59
          completed: [] as Task[]
      };

      daysTasks.forEach(task => {
          if (task.isCompleted) {
              groups.completed.push(task);
              return;
          }

          if (checkUrgency(task)) {
              groups.urgent.push(task);
              return; // If urgent, don't put in time slots to avoid duplication
          }

          if (!task.time) {
              groups.morning.push(task); // Default to morning if no time
              return;
          }

          const hour = parseInt(task.time.split(':')[0]);
          if (hour < 12) groups.morning.push(task);
          else if (hour < 18) groups.afternoon.push(task);
          else groups.evening.push(task);
      });

      // Sort each group by time
      const sorter = (a: Task, b: Task) => (a.time || '').localeCompare(b.time || '');
      groups.urgent.sort(sorter);
      groups.morning.sort(sorter);
      groups.afternoon.sort(sorter);
      groups.evening.sort(sorter);

      return groups;
  }, [daysTasks, currentTime]); // Re-calc when time changes

  const progress = useMemo(() => {
      if (daysTasks.length === 0) return 0;
      const completed = daysTasks.filter(t => t.isCompleted).length;
      return Math.round((completed / daysTasks.length) * 100);
  }, [daysTasks]);


  // --- ACTIONS ---
  const handleAddTask = () => {
      setFormData({
          date: formattedDateStr,
          time: new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}),
          type: 'Công việc',
          priority: 'Trung bình',
          recurrence: { enabled: false, frequency: 'daily', weekDays: [], dayOfMonth: new Date().getDate(), monthOfYear: new Date().getMonth() + 1 },
          title: '',
          description: ''
      });
      setShowModal(true);
  };

  const handleToggleComplete = async (task: Task) => {
      const updated = { ...task, isCompleted: !task.isCompleted };
      await StorageService.saveTask(updated);
      loadTasks();
  };

  const handleDelete = async (id: string) => {
      if (confirm("Bạn muốn xóa công việc này?")) {
          await StorageService.deleteTask(id);
          loadTasks();
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title) return;

      // Clean up recurrence data before saving
      let finalRecurrence = formData.recurrence;
      if (!finalRecurrence?.enabled) {
        finalRecurrence = undefined;
      }

      const newTask: Task = {
          id: formData.id || Date.now().toString(),
          title: formData.title,
          description: formData.description || '',
          date: formData.date || formattedDateStr,
          time: formData.time || '',
          type: formData.type as TaskType,
          priority: formData.priority as TaskPriority,
          recurrence: finalRecurrence,
          isCompleted: false
      };

      await StorageService.saveTask(newTask);
      loadTasks();
      setShowModal(false);
  };

  // --- RECURRENCE UI HELPERS ---
  const toggleWeekDay = (dayIndex: number) => {
      const current = formData.recurrence?.weekDays || [];
      let next = [];
      if (current.includes(dayIndex)) {
          next = current.filter(d => d !== dayIndex);
      } else {
          next = [...current, dayIndex];
      }
      setFormData({
          ...formData,
          recurrence: { ...formData.recurrence!, weekDays: next }
      });
  };

  // --- VISUAL HELPERS ---
  const getCategoryStyles = (type: TaskType) => {
      switch(type) {
          case 'Họp': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: <User className="w-3 h-3"/> };
          case 'Cá nhân': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: <Bell className="w-3 h-3"/> };
          case 'Thường xuyên': return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: <RotateCcw className="w-3 h-3"/> };
          default: return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Briefcase className="w-3 h-3"/> };
      }
  };

  return (
    <div className="p-6 animate-fade-in h-full flex flex-col">
       {/* Header Dashboard */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
           <div>
               <h1 className="text-2xl font-bold text-slate-800">Quản Lý Công Việc & Nhắc Việc</h1>
               <p className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4"/> {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </p>
           </div>
           
           {/* Progress Card */}
           <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-6 border border-slate-100">
                <div className="relative w-16 h-16">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className={`${progress === 100 ? 'text-green-500' : 'text-blue-500'} transition-all duration-1000`} strokeDasharray={175.84} strokeDashoffset={175.84 - (175.84 * progress) / 100} />
                     </svg>
                     <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{progress}%</span>
                </div>
                <div>
                    <p className="text-sm text-slate-500">Đánh giá tiến độ</p>
                    <p className="font-bold text-lg text-slate-800">{progress === 100 ? 'Xuất sắc!' : 'Đang thực hiện'}</p>
                    <p className="text-xs text-slate-400">{daysTasks.filter(t => t.isCompleted).length}/{daysTasks.length} công việc</p>
                </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
           
           {/* LEFT COLUMN: Calendar & Tools */}
           <div className="space-y-6">
               {/* Date Picker */}
               <div className="bg-white rounded-lg shadow p-4">
                   <div className="flex justify-between items-center mb-4">
                       <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                       <span className="font-bold text-lg text-slate-700">{selectedDate.toLocaleDateString('vi-VN')}</span>
                       <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                   </div>
                   <button onClick={() => setSelectedDate(new Date())} className="w-full py-2 text-sm bg-blue-50 text-blue-600 font-bold rounded hover:bg-blue-100 transition">
                       Hôm nay
                   </button>
               </div>

               {/* Quick Routine Checklist */}
               <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-lg shadow-lg p-5">
                   <h3 className="font-bold flex items-center gap-2 mb-4 text-teal-400"><RotateCcw className="w-5 h-5"/> Checklist Thường Xuyên</h3>
                   <div className="space-y-3">
                       {tasks.filter(t => t.recurrence?.enabled).map(task => (
                           <div key={task.id} onClick={() => handleToggleComplete(task)} className="flex items-center gap-3 cursor-pointer group">
                               <div className={`w-5 h-5 rounded border border-slate-400 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-green-500 border-green-500' : 'group-hover:border-white'}`}>
                                   {task.isCompleted && <CheckCircle className="w-3.5 h-3.5 text-white"/>}
                               </div>
                               <span className={`text-sm transition-colors ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-200 group-hover:text-white'}`}>{task.title}</span>
                           </div>
                       ))}
                       {tasks.filter(t => t.recurrence?.enabled).length === 0 && <p className="text-xs text-slate-500 italic">Chưa có việc thường xuyên</p>}
                   </div>
               </div>

               {/* Stats / Legend */}
               <div className="bg-white border rounded-lg p-4">
                   <h3 className="font-bold text-slate-700 text-sm mb-3">Phân loại màu sắc</h3>
                   <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Công việc</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span>Cuộc họp</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span>Cá nhân</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500"></span>Thường xuyên</div>
                   </div>
               </div>
           </div>

           {/* RIGHT COLUMN: Smart Grouped List */}
           <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-full overflow-hidden border border-slate-200">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex gap-4 items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-600"/> Lịch trình công việc</h3>
                    </div>
                    <button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 font-bold text-sm transition">
                        <Plus className="w-4 h-4"/> Thêm việc
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                    {/* URGENT SECTION */}
                    {taskGroups.urgent.length > 0 && (
                        <div className="space-y-2 animate-pulse-subtle">
                            <h4 className="text-red-600 font-bold text-sm uppercase flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> Cảnh báo: Sắp đến hạn (1h)
                            </h4>
                            {taskGroups.urgent.map(task => renderTaskCard(task, true))}
                        </div>
                    )}

                    {/* MORNING */}
                    {taskGroups.morning.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-slate-500 font-bold text-sm uppercase flex items-center gap-2">
                                <Sun className="w-4 h-4 text-yellow-500"/> Buổi sáng
                            </h4>
                            {taskGroups.morning.map(task => renderTaskCard(task))}
                        </div>
                    )}

                    {/* AFTERNOON */}
                    {taskGroups.afternoon.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-slate-500 font-bold text-sm uppercase flex items-center gap-2">
                                <Sunset className="w-4 h-4 text-orange-500"/> Buổi chiều
                            </h4>
                            {taskGroups.afternoon.map(task => renderTaskCard(task))}
                        </div>
                    )}

                    {/* EVENING */}
                    {taskGroups.evening.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-slate-500 font-bold text-sm uppercase flex items-center gap-2">
                                <Moon className="w-4 h-4 text-indigo-500"/> Buổi tối
                            </h4>
                            {taskGroups.evening.map(task => renderTaskCard(task))}
                        </div>
                    )}

                    {/* COMPLETED */}
                    {taskGroups.completed.length > 0 && (
                        <div className="space-y-2 opacity-60 mt-8 pt-4 border-t border-slate-200">
                            <h4 className="text-slate-400 font-bold text-sm uppercase flex items-center gap-2">
                                <CheckCircle className="w-4 h-4"/> Đã hoàn thành
                            </h4>
                            {taskGroups.completed.map(task => renderTaskCard(task))}
                        </div>
                    )}

                    {daysTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                             <Clock className="w-12 h-12 mb-2 opacity-20"/>
                             <p>Bạn rảnh rỗi vào ngày này!</p>
                        </div>
                    )}
                </div>
           </div>
       </div>

       {/* ADD TASK MODAL */}
       {showModal && (
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
                   <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0 z-10">
                       <h3 className="font-bold text-slate-800">Thêm Công Việc Mới</h3>
                       <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                   </div>
                   <form onSubmit={handleSave} className="p-6 space-y-4">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Tên công việc</label>
                           <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ví dụ: Họp giao ban..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-slate-600 mb-1">Ngày bắt đầu</label>
                               <input type="date" className="w-full border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-600 mb-1">Giờ</label>
                               <input type="time" className="w-full border p-2 rounded" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-sm font-medium text-slate-600 mb-1">Phân loại</label>
                               <select className="w-full border p-2 rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                   <option value="Công việc">Công việc (Xanh dương)</option>
                                   <option value="Họp">Cuộc họp (Cam)</option>
                                   <option value="Cá nhân">Cá nhân (Tím)</option>
                                   <option value="Thường xuyên">Thường xuyên (Xanh mòng két)</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-sm font-medium text-slate-600 mb-1">Mức ưu tiên</label>
                               <select className="w-full border p-2 rounded" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                                   <option value="Thấp">Thấp</option>
                                   <option value="Trung bình">Trung bình</option>
                                   <option value="Cao">Cao</option>
                               </select>
                            </div>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-slate-600 mb-1">Mô tả chi tiết</label>
                           <textarea className="w-full border p-2 rounded" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                       </div>
                       
                       {/* RECURRENCE SETTINGS */}
                       <div className="bg-slate-50 p-4 rounded border border-slate-200">
                           <div className="flex items-center gap-2 mb-3">
                               <input 
                                 type="checkbox" id="isRecurring" 
                                 className="w-4 h-4 text-blue-600 rounded" 
                                 checked={formData.recurrence?.enabled} 
                                 onChange={e => setFormData({...formData, recurrence: { ...formData.recurrence!, enabled: e.target.checked }})} 
                               />
                               <label htmlFor="isRecurring" className="text-sm font-bold text-slate-700 select-none flex items-center gap-2">
                                   <Repeat className="w-4 h-4"/> Lặp lại công việc
                               </label>
                           </div>

                           {formData.recurrence?.enabled && (
                               <div className="space-y-3 pl-6 animate-fade-in">
                                   <div>
                                       <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Tần suất lặp lại</label>
                                       <select 
                                            className="w-full border p-2 rounded text-sm"
                                            value={formData.recurrence.frequency}
                                            onChange={e => setFormData({...formData, recurrence: { ...formData.recurrence!, frequency: e.target.value as any }})}
                                       >
                                           <option value="daily">Hàng ngày</option>
                                           <option value="weekly">Hàng tuần</option>
                                           <option value="monthly">Hàng tháng</option>
                                           <option value="yearly">Hàng năm</option>
                                       </select>
                                   </div>

                                   {/* Weekly Options */}
                                   {formData.recurrence.frequency === 'weekly' && (
                                       <div>
                                           <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Vào các ngày</label>
                                           <div className="flex gap-1 justify-between">
                                               {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, idx) => (
                                                   <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => toggleWeekDay(idx)}
                                                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${formData.recurrence?.weekDays?.includes(idx) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                                   >
                                                       {d}
                                                   </button>
                                               ))}
                                           </div>
                                       </div>
                                   )}

                                   {/* Monthly Options */}
                                   {formData.recurrence.frequency === 'monthly' && (
                                       <div>
                                            <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Vào ngày</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-600">Ngày</span>
                                                <input 
                                                    type="number" min="1" max="31" 
                                                    className="w-16 border p-1 rounded text-center"
                                                    value={formData.recurrence.dayOfMonth}
                                                    onChange={e => setFormData({...formData, recurrence: { ...formData.recurrence!, dayOfMonth: parseInt(e.target.value) }})}
                                                />
                                                <span className="text-sm text-slate-600">hàng tháng</span>
                                            </div>
                                       </div>
                                   )}

                                    {/* Yearly Options */}
                                    {formData.recurrence.frequency === 'yearly' && (
                                       <div>
                                            <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Vào ngày</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-600">Ngày</span>
                                                <input 
                                                    type="number" min="1" max="31" 
                                                    className="w-14 border p-1 rounded text-center"
                                                    value={formData.recurrence.dayOfMonth}
                                                    onChange={e => setFormData({...formData, recurrence: { ...formData.recurrence!, dayOfMonth: parseInt(e.target.value) }})}
                                                />
                                                <span className="text-sm text-slate-600">tháng</span>
                                                <input 
                                                    type="number" min="1" max="12" 
                                                    className="w-14 border p-1 rounded text-center"
                                                    value={formData.recurrence.monthOfYear}
                                                    onChange={e => setFormData({...formData, recurrence: { ...formData.recurrence!, monthOfYear: parseInt(e.target.value) }})}
                                                />
                                                <span className="text-sm text-slate-600">hàng năm</span>
                                            </div>
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>

                       <div className="pt-4">
                           <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow">Lưu Công Việc</button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );

  function renderTaskCard(task: Task, isUrgent = false) {
      const styles = getCategoryStyles(task.type);
      
      return (
        <div key={task.id} className={`group relative p-3 rounded-lg border transition-all hover:shadow-md bg-white ${isUrgent ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
             <div className="flex items-start gap-3">
                 {/* Completion Button */}
                 <button 
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500 hover:bg-green-50'}`}
                    title={task.isCompleted ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                 >
                     <CheckCircle className="w-4 h-4" />
                 </button>

                 <div className="flex-1">
                     <div className="flex justify-between items-start">
                         <h4 className={`font-bold text-base ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                         <span className={`text-xs px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${styles.bg} ${styles.border} ${styles.text}`}>
                             {styles.icon} {task.type}
                         </span>
                     </div>
                     
                     {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
                     
                     <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                         <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-bold animate-pulse' : 'text-blue-600'}`}>
                             <Clock className="w-3 h-3"/> {task.time || 'Cả ngày'}
                         </span>
                         {task.priority === 'Cao' && <span className="text-red-600 bg-red-50 px-1.5 rounded border border-red-100">Ưu tiên cao</span>}
                         {task.recurrence?.enabled && <span className="text-teal-600 bg-teal-50 px-1.5 rounded border border-teal-100 flex items-center gap-1"><Repeat className="w-3 h-3"/> Lặp lại</span>}
                     </div>
                 </div>

                 <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition">
                     <Trash2 className="w-4 h-4"/>
                 </button>
             </div>
        </div>
      );
  }
};

export default TaskManager;
