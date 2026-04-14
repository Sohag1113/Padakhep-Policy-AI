import React from 'react';
import { CompanySettings } from '../types';

interface FooterProps {
  settings?: CompanySettings;
}

export default function Footer({ settings }: FooterProps) {
  const companyName = settings?.companyName || "PADAKHEP";
  const companyEmail = settings?.companyEmail || "support@padakhep.org";

  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Operational</span>
        </div>
        
        <div className="text-sm font-medium text-gray-400">
          © {new Date().getFullYear()} <span className="text-gray-900 font-black">{companyName}</span>. All rights reserved.
        </div>
        
        <div className="flex items-center gap-4 text-sm font-bold text-[#312e81]">
          <span className="text-gray-400 font-medium">Support:</span>
          <a href={`mailto:${companyEmail}`} className="hover:text-indigo-600 transition-colors">{companyEmail}</a>
        </div>
      </div>
    </footer>
  );
}
