import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, Trash2, Loader2, FileUp, Sparkles, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageOptimizer';

import { cache } from '../lib/cache';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function HealthReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'reports' | 'vitals'>('reports');
  const [vitalsData, setVitalsData] = useState<any[]>([]);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('Blood Test');
  const [uploadProfileId, setUploadProfileId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchProfiles = async () => {
    const cachedProfiles = cache.get('profiles');
    if (cachedProfiles) {
      setProfiles(cachedProfiles);
      if (cachedProfiles.length > 0) {
        setSelectedProfileId(cachedProfiles[0].id);
        setUploadProfileId(cachedProfiles[0].id);
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        cache.set('profiles', data);
        if (data.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data[0].id);
          setUploadProfileId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  };

  const fetchReports = async () => {
    const cachedReports = cache.get('reports');
    if (cachedReports) {
      setReports(cachedReports);
      setLoading(false);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/patient/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        cache.set('reports', data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchReports();
  }, []);

  useEffect(() => {
    if (activeTab === 'vitals' && selectedProfileId) {
      const fetchVitals = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/patient/vitals/${selectedProfileId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const formatted = data.map((d: any) => ({
              ...d,
              dateStr: new Date(d.timestamp).toLocaleDateString()
            }));
            setVitalsData(formatted);
          }
        } catch (e) {
          console.error("Failed to fetch vitals", e);
        }
      };
      fetchVitals();
    }
  }, [activeTab, selectedProfileId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/patient/reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Report deleted');
        fetchReports();
      } else {
        toast.error('Failed to delete report');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleUploadReport = async () => {
    if (!uploadTitle.trim() || !uploadFile || !uploadProfileId) {
      toast.error('Please provide a title, file, and profile');
      return;
    }
    
    setIsUploading(true);
    try {
      // ⚡️ Client-side Image Compression
      const base64 = await compressImage(uploadFile);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/patient/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          profileId: uploadProfileId,
          title: uploadTitle,
          type: uploadType,
          imageBase64: base64
        })
      });
      
      if (res.ok) {
        toast.success('Report Analyzed Successfully');
        setShowUpload(false);
        setUploadTitle('');
        setUploadFile(null);
        fetchReports();
      } else {
        toast.error('Analysis failed');
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };



  const filteredReports = reports.filter(r => 
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic">Medical Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic">Advanced AI analysis of your clinical documents and diagnostic results.</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span>New Upload</span>
        </button>
      </header>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'reports' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Lab Analysis
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'vitals' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Vital Metrics
        </button>
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-8">
            {/* Search & Profile Sidebar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search for tests, reports or clinical findings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium italic"
                    />
                </div>
                <select 
                    className="w-full md:w-64 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-black text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase tracking-widest"
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                >
                    {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Reports Display - Grid of Clinical Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <Loader2 className="mx-auto animate-spin text-emerald-600 mb-4" size={48} />
                        <p className="text-slate-400 font-bold italic">Consulting Medical Cloud Knowledge...</p>
                    </div>
                ) : filteredReports.length > 0 ? filteredReports.map((report) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={report.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{report.type}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(report.date).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{report.title}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDelete(report.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-emerald-600" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Insight</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                        "{report.summary || 'AI Analysis in progress...'}"
                                    </p>
                                </div>

                                {report.flaggedValues && JSON.parse(report.flaggedValues).length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-2 px-2">Anomalies Detected</span>
                                        <div className="flex flex-wrap gap-2">
                                            {JSON.parse(report.flaggedValues).map((val: string, idx: number) => (
                                                <span key={idx} className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 px-3 py-1 rounded-lg text-xs font-bold">
                                                    {val}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {report.fileData && (
                                  <div className="relative group/img cursor-pointer max-w-sm rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-800">
                                     <img 
                                       src={`data:image/jpeg;base64,${report.fileData}`} 
                                       alt={report.title} 
                                       className="w-full h-auto object-cover transition-transform duration-500 group-hover/img:scale-105"
                                     />
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                       <button 
                                         onClick={() => window.open(`data:image/jpeg;base64,${report.fileData}`, '_blank')}
                                         className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2"
                                       >
                                         <Search size={14} /> View Original
                                       </button>
                                     </div>
                                  </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${report.status === 'Analyzed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{report.status}</span>
                             </div>
                             <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <Download size={14} /> Full Record
                             </button>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                        <FileText className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={64} />
                        <h4 className="text-xl font-bold text-slate-500 italic">No Reports Archieved</h4>
                        <p className="text-slate-400 max-w-sm mx-auto mt-2 italic">Integrate your medical data by uploading clinical reports or diagnostic images.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'vitals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="mb-8">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 block">Metabolic Trend</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Blood Pressure Analysis</h3>
              </div>
              <div className="h-72 w-full">
                {vitalsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitalsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                            <XAxis dataKey="dateStr" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey="systolic" stroke="#10b981" strokeWidth={4} dot={{r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} name="Systolic" />
                            <Line type="monotone" dataKey="diastolic" stroke="#34d399" strokeWidth={4} dot={{r: 6, fill: '#34d399', strokeWidth: 2, stroke: '#fff'}} name="Diastolic" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl text-slate-400 italic">No data logged.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="mb-8">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 block">Cardiac Insights</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Heart Rate Variability</h3>
              </div>
              <div className="h-72 w-full">
                {vitalsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitalsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                            <XAxis dataKey="dateStr" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey="heartRate" stroke="#6366f1" strokeWidth={4} dot={{r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} name="BPM" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl text-slate-400 italic">No data logged.</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modern Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpload(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 italic leading-none">Intelligence Layer</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Clinical Report OCR Analysis</p>
                    </div>
                    <button onClick={() => setShowUpload(false)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div
                        className={`border-4 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer group ${uploadFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200'}`}
                        onClick={() => document.getElementById('reportFileInput')?.click()}
                    >
                        <input type="file" id="reportFileInput" className="hidden" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                        {uploadFile ? (
                            <div className="space-y-2">
                                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={48} />
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{uploadFile.name}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl w-fit mx-auto group-hover:scale-110 transition-transform">
                                    <FileUp className="text-emerald-500" size={32} />
                                </div>
                                <p className="text-sm font-bold text-slate-400 italic">Select Medical Image or Document</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Clinical Title</label>
                            <input
                                type="text"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                                placeholder="e.g. Metabolic Blood Chemistry"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Report Category</label>
                                <select
                                    value={uploadType}
                                    onChange={(e) => setUploadType(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase tracking-widest"
                                >
                                    <option value="Blood Test">Blood Test</option>
                                    <option value="Radiology">Radiology</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="HbA1c">Diabetes</option>
                                    <option value="Other">Standard Lab</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Target Profile</label>
                                <select
                                    value={uploadProfileId}
                                    onChange={(e) => setUploadProfileId(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase tracking-widest"
                                >
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleUploadReport}
                        disabled={isUploading || !uploadTitle.trim() || !uploadFile}
                        className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                    >
                        {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                        <span className="uppercase tracking-[0.2em] text-xs font-black">{isUploading ? 'Extracting Medical Data...' : 'Analyze Document'}</span>
                    </button>
                    
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        Secure HIPAA-compliant AI analysis. Results will be stored in your clinical history.
                    </p>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

