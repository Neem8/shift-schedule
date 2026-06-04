"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Check, Clock, CalendarPlus, Trash2, Edit2, X, LogOut, ShieldCheck } from 'lucide-react';

export default function EmployeePortal() {
  const router = useRouter();
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [targetDate, setTargetDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [editingId, setEditingId] = useState(null);
  const [allAvailabilities, setAllAvailabilities] = useState([]);

  useEffect(() => {
    const verifiedEmpId = sessionStorage.getItem('authenticated_emp_id');
    if (!verifiedEmpId) {
      router.push('/');
      return;
    }
    
    const resolveSessionProfile = async () => {
      const { data } = await supabase.from('employees').select('*').eq('id', verifiedEmpId).maybeSingle();
      if (data) {
        setCurrentEmployee(data);
        setTargetDate(new Date().toISOString().split('T')[0]);
        fetchEmployeeAvailabilities(data.id);
      } else {
        router.push('/');
      }
    };

    resolveSessionProfile();
  }, [router]);

  const formatTimeStr = (timeString) => {
    if (!timeString) return '08:00';
    return timeString.slice(0, 5); 
  };

  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; 
    return `${hour}:${minStr} ${ampm}`;
  };

  const fetchEmployeeAvailabilities = async (employeeId) => {
    const { data } = await supabase
      .from('availabilities')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: true });

    if (data) {
      setAllAvailabilities(data.map(item => ({
        id: item.id, 
        employeeId: item.employee_id, 
        date: item.date, 
        start: formatTimeStr(item.start_time), 
        end: formatTimeStr(item.end_time)
      })));
    }
  };

const handleDelete = async (id) => {
    if (!id) return;
    console.log("Pressed Delete Button for item ID:", id);
    
    const { error } = await supabase
      .from('availabilities')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("CRITICAL SUPABASE DELETION ERROR:", error);
      alert(`Deletion Failed: ${error.message}`);
      return;
    }

    console.log("Deleted successfully from Supabase, updating local state array...");
    setAllAvailabilities(allAvailabilities.filter(item => item.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    if (!targetDate) return alert('Please select a valid calendar date.');
    if (startTime >= endTime) return alert('Start time must be strictly before end time.');

    if (editingId) {
      // 1. Standard Update Mode
      const { error } = await supabase
        .from('availabilities')
        .update({ date: targetDate, start_time: startTime, end_time: endTime })
        .eq('id', editingId);

      if (error) {
        alert(`Update error: ${error.message}`);
        return;
      }

      setAllAvailabilities(allAvailabilities.map(item => 
        item.id === editingId ? { ...item, date: targetDate, start: startTime, end: endTime } : item
      ));
      setEditingId(null);
    } else {
      // 2. Intelligent Auto-Merging Mode
      const existingDuplicate = allAvailabilities.find(a => a.date === targetDate);

      if (existingDuplicate) {
        const mergedStart = startTime < existingDuplicate.start ? startTime : existingDuplicate.start;
        const mergedEnd = endTime > existingDuplicate.end ? endTime : existingDuplicate.end;

        const { error } = await supabase
          .from('availabilities')
          .update({ start_time: mergedStart, end_time: mergedEnd })
          .eq('id', existingDuplicate.id);

        if (!error) {
          setAllAvailabilities(allAvailabilities.map(item => 
            item.id === existingDuplicate.id ? { ...item, start: mergedStart, end: mergedEnd } : item
          ));
        } else {
          alert(`Database merge error: ${error.message}`);
          return;
        }
      } else {
        // 3. New Entry Mode
        const { data, error } = await supabase
          .from('availabilities')
          .insert([{ employee_id: currentEmployee.id, date: targetDate, start_time: startTime, end_time: endTime }])
          .select();

        if (error) {
          alert(`Database insertion error: ${error.message}`);
          return;
        }

        if (data && data.length > 0) {
          const newItem = { 
            id: data[0].id, 
            employeeId: currentEmployee.id, 
            date: targetDate, 
            start: formatTimeStr(data[0].start_time), 
            end: formatTimeStr(data[0].end_time) 
          };
          setAllAvailabilities([...allAvailabilities, newItem].sort((a, b) => new Date(a.date) - new Date(b.date)));
        }
      }
    }

    cancelEdit();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setTargetDate(item.date);
    setStartTime(item.start); // Fixed: maps perfectly to your array state keys
    setEndTime(item.end);     // Fixed: maps perfectly to your array state keys
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStartTime('08:00');
    setEndTime('16:00');
    setTargetDate(new Date().toISOString().split('T')[0]);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  if (!currentEmployee) return <div className="p-8 text-center text-slate-500 font-medium">Initializing secure data pipes...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 bg-gray-50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Welcome, {currentEmployee.name}</h1>
            {currentEmployee.is_admin && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                <ShieldCheck size={14} /> Admin
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Submit availability windows for specific calendar dates.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {currentEmployee.is_admin && (
            <button onClick={() => router.push('/admin/dashboard')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition w-full sm:w-auto shadow-sm">
              Go to Admin Dashboard
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition w-full sm:w-auto">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarPlus size={18} className="text-blue-600" /> Availability
          </h3>
          <form onSubmit={handleSaveAvailability} className="space-y-4">
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 font-medium" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="time" min="08:00" max="22:00" value={startTime}onChange={(e) => setStartTime(e.target.value)} className="border p-2.5 rounded-lg font-mono text-sm outline-none text-slate-700 bg-slate-50/50" />
              <input type="time" min="08:00" max="22:00" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border p-2.5 rounded-lg font-mono text-sm outline-none text-slate-700 bg-slate-50/50" />
            </div>
            <div className="space-y-2">
              <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-sm text-sm transition ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editingId ? 'Update View' : 'Save Availability'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Your Logged Timeline Parameters</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 text-xxs font-bold text-slate-400 uppercase tracking-wider border-b">
                  <th className="p-4">Calendar Date</th>
                  <th className="p-4">Available Window</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm divide-y">
                {allAvailabilities.map((item) => {
                  const isRowEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className={`transition-colors ${isRowEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-4 font-semibold text-slate-800">{item.date}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{convertTo12Hour(item.start)} - {convertTo12Hour(item.end)}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => startEdit(item)} disabled={isRowEditing} className={`p-2 rounded-lg mr-1 transition ${isRowEditing ? 'text-slate-300 cursor-not-allowed' : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'}`}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}