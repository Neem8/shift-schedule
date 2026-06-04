"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, UserPlus, Download, AlertCircle, Calendar, UserCheck, LogOut, Menu, X } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState('');

  useEffect(() => {
    setSelectedWeekStart(new Date().toISOString().split('T')[0]);
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: emps } = await supabase.from('employees').select('*').order('name');
    if (emps) setEmployees(emps);

    const { data: shiftsData } = await supabase.from('shifts').select('*');
    if (shiftsData) {
      setSchedule(shiftsData.map(s => ({
        id: s.id, date: s.date, employeeId: s.employee_id, start: s.start_time.slice(0,5), end: s.end_time.slice(0,5)
      })));
    }

    const { data: availsData } = await supabase.from('availabilities').select('*');
    if (availsData) {
      setAvailabilities(availsData.map(a => ({
        id: a.id, date: a.date, employeeId: a.employee_id, start: a.start_time.slice(0,5), end: a.end_time.slice(0,5)
      })));
    }
  };

  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; 
    return `${hour}:${minStr} ${ampm}`;
  };

  const generateUniqueCode = () => {
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (employees.some(e => e.code === code));
    return code;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    const randomCode = generateUniqueCode();
    const { data, error } = await supabase.from('employees').insert([{ name: newEmployeeName.trim(), code: randomCode }]).select();
    if (!error && data) {
      setEmployees([...employees, data[0]]);
      setNewEmployeeName('');
    }
  };

  const handleDeleteEmployee = async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      setEmployees(employees.filter(emp => emp.id !== id));
      setSchedule(schedule.filter(s => s.employeeId !== id));
    }
  };

  const assignShift = async (date, employeeId, start, end) => {
    await supabase.from('shifts').delete().eq('date', date).eq('start_time', start).eq('end_time', end);
    const { data, error } = await supabase.from('shifts').insert([
      { employee_id: employeeId, date: date, start_time: start, end_time: end }
    ]).select();

    if (!error && data) {
      const cleanNewShift = { id: data[0].id, date, employeeId, start, end };
      const filtered = schedule.filter(s => !(s.date === date && s.start === start && s.end === end));
      setSchedule([...filtered, cleanNewShift]);
    }
  };

  const getWeekDates = (startDateStr) => {
    if (!startDateStr) return [];
    const dates = [];
    const start = new Date(startDateStr + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + i);
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    return dates;
  };

  const currentWeekDates = getWeekDates(selectedWeekStart);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Store Shift Schedule (Week of ${selectedWeekStart})`, 14, 15);
    doc.setFontSize(10);
    doc.text("Operational Hours: 8:00 AM - 10:00 PM", 14, 22);

    const tableRows = [];
    currentWeekDates.forEach(dateStr => {
      const dayShifts = schedule.filter(s => s.date === dateStr).sort((a, b) => a.start.localeCompare(b.start));
      const dayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

      if (dayShifts.length === 0) {
        tableRows.push([dayLabel, 'No shifts assigned', '-', '-']);
      } else {
        dayShifts.forEach((shift, index) => {
          const emp = employees.find(e => e.id === shift.employeeId);
          tableRows.push([
            index === 0 ? dayLabel : '', 
            emp ? emp.name : 'Unknown Employee',
            convertTo12Hour(shift.start),
            convertTo12Hour(shift.end)
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 28,
      head: [['Date / Day', 'Staff Assignment', 'Start Time', 'End Time']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Schedule_Week_${selectedWeekStart}.pdf`);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 bg-gray-50 min-h-screen text-slate-800">
      {/* Header Container */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shift Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Operational Hours: 8:00 AM - 10:00 PM</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-600">Week:</span>
            </div>
            <input type="date" value={selectedWeekStart} onChange={(e) => setSelectedWeekStart(e.target.value)} className="text-xs sm:text-sm font-bold bg-transparent outline-none text-slate-800" />
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full">
            <button onClick={exportPDF} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm">
              <Download size={16} /> Export PDF
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Roster Controls */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" /> Team Roster ({employees.length})
          </h2>
          <form onSubmit={handleAddEmployee} className="flex gap-2 mb-4">
            <input type="text" placeholder="Full Name" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm w-full outline-none text-slate-800 focus:ring-2 focus:ring-blue-500 bg-slate-50/50" />
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">Add</button>
          </form>
          <div className="space-y-2 max-h-62.5 lg:max-h-87.5 overflow-y-auto pr-1">
            {employees.map(emp => (
              <div key={emp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{emp.name}</p>
                  <p className="text-xxs text-blue-600 font-mono mt-0.5 bg-blue-50 px-2 py-0.5 rounded w-max">Code: {emp.code}</p>
                </div>
                <button onClick={() => handleDeleteEmployee(emp.id)} className="text-slate-400 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Matrix Container */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">Pending Time Submissions</h2>
            <p className="text-xs text-slate-400 mb-4">Click to assign staff members who have submitted availability.</p>
            <div className="space-y-4 max-h-100 overflow-y-auto pr-1">
              {currentWeekDates.map(dateStr => {
                const entriesOnThisDay = availabilities.filter(a => a.date === dateStr).sort((a, b) => a.start.localeCompare(b.start));
                const displayDayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                if (entriesOnThisDay.length === 0) return null;

                return (
                  <div key={dateStr} className="p-3 sm:p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="font-bold text-sm text-slate-900 mb-2 border-b border-slate-100 pb-1.5">{displayDayLabel}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {entriesOnThisDay.map(avail => {
                        const workerProfile = employees.find(e => e.id === avail.employeeId);
                        if (!workerProfile) return null;
                        const isAssigned = schedule.some(s => s.date === dateStr && s.employeeId === workerProfile.id && s.start === avail.start && s.end === avail.end);

                        return (
                          <div key={avail.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <div className="min-w-0 pr-2">
                              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{workerProfile.name}</p>
                              <p className="text-xxs font-mono text-slate-400 mt-0.5">{convertTo12Hour(avail.start)} - {convertTo12Hour(avail.end)}</p>
                            </div>
                            <button onClick={() => assignShift(dateStr, workerProfile.id, avail.start, avail.end)} className={`text-xxs px-3 py-2 rounded-lg font-extrabold flex items-center gap-1 transition ${isAssigned ? 'bg-green-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                              {isAssigned ? <><UserCheck size={12}/> Active</> : 'Assign'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Live Grid Table */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 text-base sm:text-lg">Active Scheduled Roster</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-125">
                <thead>
                  <tr className="bg-slate-50 text-xxs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 sm:p-4">Calendar Date</th>
                    <th className="p-3 sm:p-4">Staff Assignment</th>
                    <th className="p-3 sm:p-4">Assigned Slot</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm divide-y divide-slate-100">
                  {currentWeekDates.map(dateStr => {
                    const dayShifts = schedule.filter(s => s.date === dateStr).sort((a, b) => a.start.localeCompare(b.start));
                    const formattedDisplayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    if (dayShifts.length === 0) {
                      return (
                        <tr key={dateStr} className="bg-white">
                          <td className="p-3 sm:p-4 font-bold text-slate-900">{formattedDisplayDate}</td>
                          <td className="p-3 sm:p-4 italic text-slate-400" colSpan="2">Unscheduled date block</td>
                        </tr>
                      );
                    }
                    return dayShifts.map((shift, i) => {
                      const emp = employees.find(e => e.id === shift.employeeId);
                      return (
                        <tr key={`${dateStr}-${i}`} className="hover:bg-slate-50/50 bg-white">
                          <td className="p-3 sm:p-4 font-bold text-slate-900">{i === 0 ? formattedDisplayDate : ''}</td>
                          <td className="p-3 sm:p-4 font-semibold text-slate-700">{emp ? emp.name : 'Unknown Profile'}</td>
                          <td className="p-3 sm:p-4 text-slate-500 font-mono text-xs">{convertTo12Hour(shift.start)} - {convertTo12Hour(shift.end)}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}