import { useEffect, useState } from 'react';
import { Users, User, ClipboardCheck, Bell, Search, FileText, Activity, ShieldAlert, X, Calendar, Pill, HeartPulse, Utensils, Edit2, Trash2, Plus, MessageSquare, Save, Loader2, AlertTriangle, Clock3, Stethoscope } from 'lucide-react';


import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageOptimizer';
import TriAlertModal from '../components/TriAlertModal';


export default function DoctorDashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingMeds, setPendingMeds] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);




  // Notes CRUD state
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Softcopy Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showSoftcopyModal, setShowSoftcopyModal] = useState(false);
  const [softcopyType, setSoftcopyType] = useState<'Prescription' | 'Lab Report' | 'Medical Report'>('Prescription');

  // Tri-Alert Polypharmacy State
  const [triAlerts, setTriAlerts] = useState<any[]>([]);
  const [showTriAlertList, setShowTriAlertList] = useState(false);
  const [activeTriAlert, setActiveTriAlert] = useState<any>(null);
  const [seenTriAlertIds, setSeenTriAlertIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    fetchPatients();
    fetchPendingVerifications();
    const stored = localStorage.getItem('doctor_recent_searches');
    if (stored) setRecentSearches(JSON.parse(stored));

    // Tri-Alert polling: check every 10 seconds
    const triAlertPoll = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/tri-alerts/doctor', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const alerts = await res.json();
          setTriAlerts(alerts);
          // Fire toast for genuinely new alerts
          alerts.forEach((a: any) => {
            if (!seenTriAlertIds.has(a.id)) {
              toast.error(
                `\u26a0\ufe0f POLYPHARMACY ALERT: ${a.patientName} — ${a.newDrug} conflicts with existing medications (${a.severity})`,
                { duration: 15000 }
              );
              setSeenTriAlertIds(prev => new Set([...prev, a.id]));
            }
          });
        }
      } catch {}
    }, 10000);

    // Initial fetch immediately
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/tri-alerts/doctor', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const alerts = await res.json();
          setTriAlerts(alerts);
          const ids = new Set(alerts.map((a: any) => a.id));
          setSeenTriAlertIds(ids as Set<string>);
        }
      } catch {}
    })();

    return () => clearInterval(triAlertPoll);
  }, []);


  const fetchPatients = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/doctor/patients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setPatients(await res.json());
    }
  };

  const fetchPendingVerifications = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/doctor/pending-verifications', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setPendingMeds(await res.json());
  };

  const handleApproveMedication = async (id: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/doctor/approve-medication/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      toast.success("Medication officially approved");
      fetchPendingVerifications();
      if (pendingMeds.length === 1) setShowPendingModal(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setSearchNotFound(false);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/doctor/search-patient/${searchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const patient = await res.json();
        viewHistory(patient);
        // Update recent searches
        const updated = [searchId, ...recentSearches.filter(id => id !== searchId)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('doctor_recent_searches', JSON.stringify(updated));
      } else {
        setSearchNotFound(true);
        toast.error("Patient not found with ID: " + searchId);
      }

    } catch (error) {
      toast.error("Search failed");
    }
  };

  const viewHistory = async (patient: any) => {
    setSelectedPatient(patient);
    setIsLoadingHistory(true);
    setNewNote('');
    setEditingNoteId(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/doctor/patient-history/${patient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPatientHistory(await res.json());
      }
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Refresh just notes after CRUD operations
  const refreshHistory = async () => {
    if (!selectedPatient) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/doctor/patient-history/${selectedPatient.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setPatientHistory(await res.json());
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !patientHistory?.profiles?.[0]?.id) return;
    setIsSavingNote(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/doctor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profileId: patientHistory.profiles[0].id, note: newNote })
      });
      if (res.ok) {
        toast.success("Note added");
        setNewNote('');
        refreshHistory();
      }
    } catch (err) { toast.error("Failed to add note"); }
    finally { setIsSavingNote(false); }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editingNoteText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/doctor/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note: editingNoteText })
      });
      toast.success("Note updated");
      setEditingNoteId(null);
      refreshHistory();
    } catch (err) { toast.error("Failed to update note"); }
  };

  const handleDeleteNote = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/doctor/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Note deleted");
      refreshHistory();
    } catch (err) { toast.error("Failed to delete note"); }
  };

  const handleSoftcopyUpload = async (file: File, type: string) => {
    if (!selectedPatient || !patientHistory?.profiles?.[0]) return;
    setUploadLoading(true);
    try {
      // ⚡️ Client-side Image Compression
      const base64 = await compressImage(file);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/doctor/upload-softcopy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          profileId: patientHistory.profiles[0].id,
          title: `${type} - ${new Date().toLocaleDateString()}`,
          type: type,
          imageBase64: base64
        })
      });
      if (res.ok) {
        toast.success(`${type} uploaded successfully`);
        refreshHistory();
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      console.error("Softcopy upload error:", err);
      toast.error("Error processing file");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/medications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Medication removed'); refreshHistory(); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeletePrescriptionBlock = async () => {
    if (!selectedPatient?.id) return;
    // Assuming selectedPatient.id maps to the profileId used by medications in DoctorDashboard
    const token = localStorage.getItem('token');
    try {
      const profileId = patientHistory?.profiles?.[0]?.id;
      if (!profileId) return;
      const res = await fetch(`/api/patient/medications/all/${profileId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Prescription cleared'); refreshHistory(); }
    } catch { toast.error('Failed to clear prescription'); }
  };

  const handleDeleteReport = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/reports/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Report removed'); refreshHistory(); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeleteVisit = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/visits/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Visit removed'); refreshHistory(); }
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Global Search Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Search size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 italic">Search Patient</h2>
        </div>
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Enter Patient ID (e.g. MS-P-1234)" 
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-emerald-600/20 focus:border-emerald-600 rounded-xl text-slate-900 dark:text-slate-100 outline-none transition-all font-mono"
          />
          <button 
            type="submit"
            className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
          >
            Search
          </button>
        </form>

        {/* Recent Search Shelf */}
        <AnimatePresence>
          {recentSearches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Recently Searched Patient IDs</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((id) => (
                  <button 
                    key={id} 
                    onClick={() => { setSearchId(id); handleSearch({ preventDefault: () => {} } as any); }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-all flex items-center gap-2 group"
                  >
                    <Clock3 size={12} className="text-slate-300 group-hover:text-emerald-600" />
                    {id}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>


      {/* 2. Main content split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient Info & Actions */}
        <div className="lg:col-span-4 space-y-6">
          {selectedPatient ? (
            <>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-6 text-emerald-600">
                  <User size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Patient Details</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">{selectedPatient.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</div>
                    <div className="font-medium text-slate-600 dark:text-slate-400">{selectedPatient.email || "haseeb.rahaman.07@gmail.com"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</div>
                      <div className="font-medium text-slate-600 dark:text-slate-400">N/A</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency</div>
                      <div className="font-medium text-slate-600 dark:text-slate-400">N/A</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-6 text-emerald-600">
                  <FileText size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Record</span>
                </div>
                <div className="space-y-4">
                  <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer">
                    <option>Clinical Visit</option>
                    <option>Follow-up</option>
                    <option>Lab Referral</option>
                  </select>
                  <input placeholder="Title" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                  <textarea placeholder="Details" rows={4} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none" />
                  <input placeholder="Tests (e.g., Blood Test, X-Ray)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                  <input placeholder="Reports (e.g., MRI Scan Result)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                  <button className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm">Save Record</button>
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Softcopies</p>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors group">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-600">📝 Prescription</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSoftcopyUpload(e.target.files[0], 'Prescription')} />
                        <Plus size={14} className="text-slate-400 group-hover:text-emerald-600" />
                      </label>
                      <label className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors group">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-600">🧪 Lab Report</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSoftcopyUpload(e.target.files[0], 'Lab Report')} />
                        <Plus size={14} className="text-slate-400 group-hover:text-emerald-600" />
                      </label>
                      <label className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors group">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-600">📁 Medical Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSoftcopyUpload(e.target.files[0], 'Medical Report')} />
                        <Plus size={14} className="text-slate-400 group-hover:text-emerald-600" />
                      </label>
                    </div>
                  </div>
                </div>

              </motion.div>
            </>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Search className="mx-auto mb-4 opacity-20" size={48} />
              <p className="text-sm font-medium italic">Search for a patient to view details and history.</p>
            </div>
          )}
        </div>

        {/* Right Column: Medical Timeline */}
        <div className="lg:col-span-8">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-400">
                <Activity size={24} className="animate-pulse" />
                <h3 className="text-xl font-bold italic">Complete Medical Timeline</h3>
              </div>
              {selectedPatient && (
                <div className="flex items-center gap-3">
                  {triAlerts.length > 0 && (
                    <button 
                      onClick={() => setShowTriAlertList(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-200 transition-colors animate-pulse"
                    >
                      <ShieldAlert size={14} />
                      {triAlerts.length} Drug Alert{triAlerts.length > 1 ? 's' : ''}
                    </button>
                  )}
                  <button 
                    onClick={() => { if (pendingMeds.length > 0) setShowPendingModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-orange-200 transition-colors"
                  >
                    {pendingMeds.length} Pending Actions
                  </button>
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-20 bg-slate-50/50 rounded-2xl">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            ) : selectedPatient ? (
              <div className="relative pl-8 space-y-12">
                <div className="timeline-line" />
                
                {/* Timeline Entry: Prescriptions */}
                {patientHistory?.medications?.length > 0 && (
                  <div className="relative group/block">
                    <div className="absolute -left-[2.25rem] top-1.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="mb-2">
                        <span className="text-xs font-bold text-slate-400 block mb-1">3/28/2026</span>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">PRESCRIPTION</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Uploaded Prescription</span>
                            </div>
                            <button onClick={handleDeletePrescriptionBlock} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/block:opacity-100 transition-all" title="Clear Prescription">
                              <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-4">Extracted via AI</p>
                    
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-white dark:border-slate-700 pb-2">Prescribed Medications:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {patientHistory.medications.map((med: any) => (
                                <div key={med.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm group relative">
                                    <button onClick={() => handleDeleteMedication(med.id)} className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all" title="Remove">
                                      <Trash2 size={12} />
                                    </button>
                                    <div className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase mb-1">{med.name}</div>
                                    <p className="text-[10px] text-slate-400 mb-2 italic">Paracetamol (Example Salt)</p>
                                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg inline-block">
                                        {med.dose} • {med.schedule}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-6 flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest hover:underline">
                            + Add Note
                        </button>
                    </div>
                  </div>
                )}

                {/* Timeline Entry: Reports & Softcopies */}
                {patientHistory?.reports?.map((report: any) => (
                  <div key={report.id} className="relative">
                    <div className="absolute -left-[2.25rem] top-1.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="mb-2">
                        <span className="text-xs font-bold text-slate-400 block mb-1">{new Date(report.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                              report.type?.includes('Lab') ? 'bg-orange-100 text-orange-700' : 
                              report.type?.includes('Prescription') ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {report.type}
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{report.title}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden group relative">
                        <button onClick={() => handleDeleteReport(report.id)} className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all" title="Remove report">
                          <Trash2 size={14} />
                        </button>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 italic">{report.summary}</p>
                        
                        {report.fileData && (
                          <div className="relative mt-4 group/img cursor-pointer max-w-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-800">
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
                                 <Search size={14} /> Full View
                               </button>
                             </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {/* Timeline Entry: Visits & Treatments */}
                {patientHistory?.visits?.map((visit: any) => (
                  <div key={visit.id} className="relative">
                    <div className="absolute -left-[2.25rem] top-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="mb-2">
                        <span className="text-xs font-bold text-slate-400 block mb-1">{new Date(visit.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest flex items-center gap-1">
                              <Calendar size={10} /> CLINICAL VISIT
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{visit.hospital || "General Hospital"}</span>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 relative group">
                        <button onClick={() => handleDeleteVisit(visit.id)} className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all" title="Remove visit">
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-emerald-600 shadow-sm">
                                <Stethoscope size={18} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-slate-700 dark:text-slate-300">{visit.doctorName}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{visit.qualifications || "Specialist"}</div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Treatment Faced & Notes:</h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed pl-3 border-l-2 border-emerald-500/30">
                                    {visit.notes || "No treatment details recorded for this visit."}
                                </p>
                            </div>
                            
                            {visit.linkedReports && JSON.parse(visit.linkedReports).length > 0 && (
                                <div className="pt-2">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Linked Reports Attached</span>
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
                ))}



                {/* Case of no history */}
                {(!patientHistory || (patientHistory.medications.length === 0 && patientHistory.visits.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Activity size={64} className="mb-4 opacity-5" />
                    <p className="font-medium italic">No clinical history recorded on timeline.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                <Users size={64} className="mb-4 opacity-10" />
                <p className="font-medium italic">Select a patient to populate timeline</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Legacy modals remain functional underneath the new layout */}
      <AnimatePresence>
        {showPendingModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPendingModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
                {/* Modal content repurposed to match new theme */}
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold italic">Verify Incoming Prescriptions</h2>
                    <button onClick={() => setShowPendingModal(false)}><X /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {pendingMeds.map(med => (
                        <div key={med.id} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="text-[10px] font-black text-emerald-600 uppercase mb-2">Request from {med.patientName}</div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400">MEDICATION</div>
                                    <div className="font-bold">{med.name}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400">DOSAGE</div>
                                    <div className="font-bold">{med.dose}</div>
                                </div>
                            </div>
                            <button onClick={() => handleApproveMedication(med.id)} className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                                <ClipboardCheck size={16} /> Approve & Log to Timeline
                            </button>
                        </div>
                    ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tri-Alert Polypharmacy List Modal */}
      <AnimatePresence>
        {showTriAlertList && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTriAlertList(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 bg-red-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={24} />
                  <h2 className="text-xl font-bold italic">Polypharmacy Safety Alerts</h2>
                </div>
                <button onClick={() => setShowTriAlertList(false)} className="hover:rotate-90 transition-transform"><X /></button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                {triAlerts.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 italic">No active polypharmacy alerts</p>
                ) : (
                  triAlerts.map(alert => {
                    let drugs: string[] = [];
                    try { drugs = JSON.parse(alert.drugsInvolved); } catch { drugs = []; }
                    return (
                      <div key={alert.id} className={`p-6 rounded-2xl border-l-4 ${alert.severity === 'Severe' ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-500'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${alert.severity === 'Severe' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>{alert.severity}</span>
                            <span className="text-xs font-bold text-slate-500">{alert.patientName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {drugs.map((d: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              <Pill size={10} />
                              {d}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic mb-4">"{alert.message}"</p>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem('token');
                            await fetch(`/api/tri-alerts/${alert.id}/read`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ recipient: 'doctor' })
                            });
                            setTriAlerts(prev => prev.filter(a => a.id !== alert.id));
                            toast.success('Alert acknowledged');
                          }}
                          className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-2"
                        >
                          <ClipboardCheck size={14} /> Acknowledge & Dismiss
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Individual Tri-Alert Detail Modal */}
      {activeTriAlert && (
        <TriAlertModal
          alert={activeTriAlert}
          onAcknowledge={async (id) => {
            const token = localStorage.getItem('token');
            await fetch(`/api/tri-alerts/${id}/read`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ recipient: 'doctor' })
            });
            setTriAlerts(prev => prev.filter(a => a.id !== id));
          }}
          onClose={() => setActiveTriAlert(null)}
        />
      )}
    </div>
  );
}

