import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  Loader2, 
  CheckCircle, 
  FileUp, 
  Eye, 
  X, 
  LayoutDashboard, 
  List, 
  PieChart,
  BarChart3,
  Shield,
  AlertTriangle,
  MessageSquare,
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Link
} from 'lucide-react';
import { PolicyDocument, CompanySettings } from '../types';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { extractTextFromPdf, extractTextFromWord } from '../lib/pdfUtils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  policies: PolicyDocument[];
  onUpload: (name: string, content: string, department: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  role: 'admin' | 'user';
  onOpenChat?: () => void;
  settings: CompanySettings;
  onUpdateSettings: (settings: CompanySettings) => Promise<void>;
}

const DEPARTMENTS = [
  'Human Resources (HR)',
  'Information Technology (IT)',
  'Finance & Accounts',
  'Operations',
  'Legal & Compliance',
  'Marketing & Sales',
  'Administration',
  'General'
];

type AdminView = 'dashboard' | 'upload' | 'list' | 'chat' | 'settings';

export default function AdminDashboard({ policies, onUpload, onDelete, role, onOpenChat, settings, onUpdateSettings }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadDepartment, setUploadDepartment] = useState(DEPARTMENTS[0]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<PolicyDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Settings state
  const [editSettings, setEditSettings] = useState<CompanySettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Update editSettings when settings prop changes
  React.useEffect(() => {
    setEditSettings(settings);
  }, [settings]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = policies.length;
    const deptCounts = DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = policies.filter(p => p.department === dept).length;
      return acc;
    }, {} as Record<string, number>);

    return { total, deptCounts };
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const matchesDept = filterDepartment === 'All' || p.department === filterDepartment;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [policies, filterDepartment, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!policyToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(policyToDelete.id);
      setPolicyToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadContent || !uploadDepartment) return;
    
    setIsUploading(true);
    try {
      await onUpload(uploadName, uploadContent, uploadDepartment);
      setUploadName('');
      setUploadContent('');
      setUploadDepartment(DEPARTMENTS[0]);
      setCurrentView('list'); // Switch to list after successful upload
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadName(file.name.replace(/\.[^/.]+$/, ""));
    setIsExtracting(true);
    
    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPdf(file);
        setUploadContent(text);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const text = await extractTextFromWord(file);
        setUploadContent(text);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setUploadContent(text);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("Error extracting text:", err);
      alert("Failed to extract text from file. You can still paste it manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Horizontal Menu */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
            <Shield className="w-5 h-5 text-[#312e81]" />
            {role === 'admin' ? 'Admin Panel' : 'User Panel'}
          </h3>
          <nav className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                currentView === 'dashboard' 
                  ? "bg-[#312e81] text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            
            {role === 'admin' && (
              <button
                onClick={() => setCurrentView('upload')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  currentView === 'upload' 
                    ? "bg-[#312e81] text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Upload className="w-4 h-4" />
                Upload Policy
              </button>
            )}

            <button
              onClick={() => setCurrentView('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                currentView === 'list' 
                  ? "bg-[#312e81] text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <List className="w-4 h-4" />
              Policy List
            </button>

            {role === 'admin' && (
              <button
                onClick={() => setCurrentView('settings')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  currentView === 'settings' 
                    ? "bg-[#312e81] text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}

            <button
              onClick={onOpenChat}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#312e81] hover:bg-indigo-50 transition-all border border-indigo-100"
            >
              <MessageSquare className="w-4 h-4" />
              ASK AI
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Welcome Banner */}
              <div className="bg-[#312e81] rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-3xl md:text-4xl font-black mb-4">
                    Hello, {role === 'admin' ? 'Administrator' : 'Team Member'}!
                  </h2>
                  <p className="text-indigo-100 text-lg font-medium opacity-90 leading-relaxed">
                    Welcome to the Padakhep Policy Assistant. Access company policies, 
                    get instant AI-powered answers, and stay informed about our organizational guidelines.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <button 
                      onClick={onOpenChat}
                      className="bg-white text-[#312e81] px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Ask AI a Question
                    </button>
                    <button 
                      onClick={() => setCurrentView('list')}
                      className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition-all"
                    >
                      Browse Policies
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#312e81]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Policies</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Departments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(stats.deptCounts).filter((count: number) => count > 0).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <BarChart3 className="w-6 h-6 text-[#312e81]" />
                  <h3 className="text-xl font-bold text-gray-900">Department-wise Breakdown</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEPARTMENTS.map(dept => (
                    <div key={dept} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate" title={dept}>
                        {dept}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {stats.deptCounts[dept]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-8">
                <Upload className="w-6 h-6 text-[#312e81]" />
                <h3 className="text-xl font-bold text-gray-900">Upload New Policy</h3>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Policy Name</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                      placeholder="e.g. Employee Conduct Policy"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <select
                      value={uploadDepartment}
                      onChange={(e) => setUploadDepartment(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none bg-white transition-all"
                      required
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload File (PDF/Word/Text/Markdown)</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={handleFileChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                    />
                    {isExtracting && (
                      <div className="absolute right-0 top-0 flex items-center gap-2 text-indigo-600 text-xs font-medium bg-white px-2 py-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Extracting text...
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Content Preview</label>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      uploadContent.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {uploadContent.length} characters extracted
                    </span>
                  </div>
                  <textarea
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none text-sm leading-relaxed"
                    style={{ fontFamily: '"Hind Siliguri", "Noto Sans Bengali", "Mina", "Inter", sans-serif' }}
                    placeholder="Paste policy content here if not uploading a file..."
                    required
                  />
                  {uploadContent.length > 0 && uploadContent.length < 50 && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Extracted text seems very short. Please verify the content.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploading || isExtracting}
                  className="w-full bg-[#312e81] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3730a3] disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.99]"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
                  {isUploading ? 'Processing...' : 'Save Policy for AI'}
                </button>
              </form>
            </motion.div>
          )}

          {currentView === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex flex-col gap-6 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <List className="w-6 h-6 text-[#312e81]" />
                    <h3 className="text-xl font-bold text-gray-900">Policy List</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Filter by Dept:</span>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#312e81] outline-none bg-white"
                      >
                        <option value="All">All Departments</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                      {filteredPolicies.length} Found
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, content, or department..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">SL No</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Policy Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Upload Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPolicies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                          {filterDepartment === 'All' 
                            ? 'No policies uploaded yet. Go to "Upload Policy" to get started.' 
                            : `No policies found for ${filterDepartment}.`}
                        </td>
                      </tr>
                    ) : (
                      filteredPolicies.map((policy, index) => (
                        <tr key={policy.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-gray-900">{policy.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {policy.department}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {format(new Date(policy.uploadDate), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedPolicy(policy)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="View Policy"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              {role === 'admin' && (
                                <button
                                  onClick={() => setPolicyToDelete(policy)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="Delete Policy"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && role === 'admin' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-8">
                <Settings className="w-6 h-6 text-[#312e81]" />
                <h3 className="text-xl font-bold text-gray-900">Company Settings</h3>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingSettings(true);
                  try {
                    await onUpdateSettings(editSettings);
                    alert("Settings updated successfully!");
                  } finally {
                    setIsSavingSettings(false);
                  }
                }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editSettings.companyName}
                      onChange={(e) => setEditSettings({...editSettings, companyName: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      Company Short Name
                    </label>
                    <input
                      type="text"
                      value={editSettings.companyShortName}
                      onChange={(e) => setEditSettings({...editSettings, companyShortName: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-400" />
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={editSettings.logoUrl}
                      onChange={(e) => setEditSettings({...editSettings, logoUrl: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={editSettings.companyEmail}
                      onChange={(e) => setEditSettings({...editSettings, companyEmail: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={editSettings.companyContact}
                      onChange={(e) => setEditSettings({...editSettings, companyContact: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Company Address
                  </label>
                  <textarea
                    value={editSettings.companyAddress}
                    onChange={(e) => setEditSettings({...editSettings, companyAddress: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#312e81] outline-none transition-all h-24"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full bg-[#312e81] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3730a3] disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.99]"
                >
                  {isSavingSettings ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                  {isSavingSettings ? 'Saving...' : 'Update Settings'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Policy View Modal */}
      <AnimatePresence>
        {selectedPolicy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedPolicy.name}</h3>
                    <div className="flex gap-3 items-center mt-1">
                      <span className="text-xs font-bold bg-[#312e81] text-white px-3 py-1 rounded-full uppercase tracking-wider">
                        {selectedPolicy.department}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                        Uploaded on {format(new Date(selectedPolicy.uploadDate), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPolicy(null)}
                  className="p-3 hover:bg-gray-200 rounded-2xl transition-all group"
                >
                  <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="max-w-3xl mx-auto">
                  <div className="prose prose-blue max-w-none text-gray-700 whitespace-pre-wrap font-sans leading-relaxed text-lg">
                    {selectedPolicy.content}
                  </div>
                </div>
              </div>
              
              <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setSelectedPolicy(null)}
                  className="px-8 py-3 bg-[#312e81] text-white rounded-xl font-bold hover:bg-[#3730a3] transition-all shadow-lg active:scale-[0.98]"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {policyToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Policy?</h3>
                <p className="text-gray-500 mb-8">
                  Are you sure you want to delete <span className="font-bold text-gray-900">"{policyToDelete.name}"</span>? This action cannot be undone.
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Policy'}
                  </button>
                  <button
                    onClick={() => setPolicyToDelete(null)}
                    disabled={isDeleting}
                    className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
