import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { CompanySettings } from '../types';

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
  settings?: CompanySettings;
}

export default function Header({ userEmail, onLogout, settings }: HeaderProps) {
  const companyName = settings?.companyName || "PADAKHEP";
  const companyShortName = settings?.companyShortName || companyName;
  const logoUrl = settings?.logoUrl;

  return (
    <header className="bg-[#312e81]/95 backdrop-blur-md text-white py-5 px-8 flex justify-between items-center shadow-lg border-b border-white/10 sticky top-0 z-[50]">
      <div className="flex items-center gap-4 group cursor-pointer">
        <div className="bg-white p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform overflow-hidden flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <Shield className="text-[#312e81] w-7 h-7" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter leading-none">
            <span className="hidden sm:inline">{companyName}</span>
            <span className="sm:hidden">{companyShortName}</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-60 mt-1">Policy Assistant</p>
        </div>
      </div>
      
      {userEmail && (
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-black uppercase tracking-widest opacity-50">Logged in as</span>
            <span className="text-sm font-bold">{userEmail}</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-red-500/20 hover:text-red-200 px-4 py-2.5 rounded-xl transition-all font-bold text-sm border border-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
