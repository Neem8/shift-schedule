"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Users, Lock } from 'lucide-react';

export default function UnifiedLoginGateway() {
  const router = useRouter();
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('PWA Service Worker registered safely:', reg.scope))
        .catch((err) => console.warn('Service worker registration failed:', err));
    }
  }, []);
  
  const handleRouteAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 1. Check for Admin Master Override Pin
    if (loginCode === '00000') {
      router.push('/admin/dashboard');
      return;
    }

    try {
      // 2. Scan the database to check if the 5-digit code matches an employee
      const { data, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .eq('code', loginCode)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        // Save the current verified employee session state into temporary session state
        sessionStorage.setItem('authenticated_emp_id', data.id);
        router.push('/employee');
      } else {
        setError('Invalid authorization token. Please cross-check with your supervisor.');
      }
    } catch (err) {
      setError('Network communication crash. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_center,rgba(51,65,85,0.5)_0%,rgba(15,23,42,1)_100%)] z-0" />
      
      <div className="bg-white/95 backdrop-blur-md p-6 sm:p-10 rounded-2xl shadow-2xl max-w-md w-full border border-white/20 z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Store Portal Node</h1>
          <p className="text-sm text-slate-500 mt-2">Enter your assigned 5-digit security profile access sequence</p>
        </div>

        <form onSubmit={handleRouteAuth} className="space-y-6">
          <div>
            <input 
              type="text" 
              maxLength={5} 
              placeholder="• • • • •" 
              value={loginCode} 
              disabled={isLoading}
              onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, ''))} 
              className="w-full text-center tracking-[0.4em] text-3xl sm:text-4xl border-2 border-slate-200 rounded-2xl py-4 focus:border-blue-600 focus:ring-0 font-mono text-slate-800 outline-none transition bg-slate-50/50" 
              required 
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-semibold animate-pulse">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150 transform active:scale-[0.99] flex items-center justify-center"
          >
            {isLoading ? 'Verifying Link...' : 'Access Workspace'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-center text-xxs sm:text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1"><Users size={14}/> Workers: Use generated PIN</span>
          <span className="flex items-center gap-1"><Lock size={14}/> Admin Override: 00000</span>
        </div>
      </div>
    </div>
  );
}