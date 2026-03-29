import React, { useEffect, useState } from 'react';
import { Activity, Pill, FileText, AlertCircle, Plus, X, Shield, ChevronDown, User, Edit2, Stethoscope, ArrowRight, CheckCircle2, XCircle, Clock3, Bell, Bot, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PrescriptionUpload from '../components/PrescriptionUpload';
import EmergencyCard from '../components/EmergencyCard';
import ProfileModal from '../components/ProfileModal';
import TriAlertModal from '../components/TriAlertModal';
import { cache } from '../lib/cache';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [meds, setMeds] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [medLogs, setMedLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);



  const [showUpload, setShowUpload] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  // Vitals State
  const [sysBP, setSysBP] = useState('');
  const [diaBP, setDiaBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState('Celsius');
  const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);

  // Timeline State
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [newVisit, setNewVisit] = useState({ date: '', doctorName: '', qualifications: '', hospital: '', notes: '', linkedReports: '' });
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  // Tri-Alert Polypharmacy State
  const [activeTriAlert, setActiveTriAlert] = useState<any>(null);
  const [showTriAlertModal, setShowTriAlertModal] = useState(false);

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) {
      toast.error('Please select a profile first');
      return;
    }
    const token = localStorage.getItem('token');
    setIsSubmittingVitals(true);
    try {
      const res = await fetch('/api/patient/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          systolic: parseInt(sysBP),
          diastolic: parseInt(diaBP),
          heartRate: parseInt(heartRate),
          temperature: parseFloat(temperature),
          tempUnit
        })
      });
      if (res.ok) {
        toast.success("Vitals logged successfully!");
        setSysBP(''); setDiaBP(''); setHeartRate(''); setTemperature('');
      } else {
        toast.error("Failed to log vitals");
      }
    } catch (err) {
      toast.error("Error logging vitals");
    } finally {
      setIsSubmittingVitals(false);
    }
  };

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/patient/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newVisit, profileId: selectedProfile.id })
      });
      if (res.ok) {
        toast.success("Timeline event added");
        setShowAddTimeline(false);
        setNewVisit({ date: '', doctorName: '', qualifications: '', hospital: '', notes: '', linkedReports: '' });
        fetchData(selectedProfile.id);
      }
    } catch (err) {
      toast.error("Failed to add visit");
    }
  };

  const handleDeleteVisit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/visits/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        toast.success("Event deleted");
        fetchData(selectedProfile.id);
      }
    } catch (err) {
      toast.error("Failed to delete event");
    }
  };

  const fetchProfiles = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Try cache first
    const cachedProfiles = cache.get('profiles');
    if (cachedProfiles && cachedProfiles.length > 0) {
      setProfiles(cachedProfiles);
      setSelectedProfile((prev: any) => {
        if (prev) return prev;
        return cachedProfiles.find((p: any) => p.isPrimary) || cachedProfiles[0];
      });
    }

    try {
      const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        cache.set('profiles', data);
        
        if (data.length > 0) {
          setSelectedProfile((prev: any) => {
            // If we already have a selected profile, try to keep it (refresh its data)
            if (prev) {
              const updated = data.find((p: any) => p.id === prev.id);
              return updated || data.find((p: any) => p.isPrimary) || data[0];
            }
            // Otherwise pick primary or first
            return data.find((p: any) => p.isPrimary) || data[0];
          });
        } else {
          setSelectedProfile(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  };

  const fetchData = async (profileId: string) => {
    // Try cache first
    const cachedMeds = cache.get(`meds_${profileId}`);
    if (cachedMeds) setMeds(cachedMeds);

    const token = localStorage.getItem('token');
    try {
      const [medsRes, suggRes, logsRes, interRes, alertsRes, visitsRes] = await Promise.all([
        fetch(`/api/patient/medications?profileId=${profileId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/patient/suggestions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/patient/medication-logs/${profileId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/patient/interactions?profileId=${profileId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/patient/alerts/${profileId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/patient/visits/${profileId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (medsRes.ok) {
        const medsData = await medsRes.json();
        setMeds(medsData);
        cache.set(`meds_${profileId}`, medsData);
      }
      if (suggRes.ok) setSuggestions(await suggRes.json());
      if (logsRes.ok) setMedLogs(await logsRes.json());
      if (interRes.ok) setInteractions(await interRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (visitsRes.ok) setVisits(await visitsRes.json());
      
      const hospitalsRes = await fetch('/api/hospitals/nearby', { headers: { Authorization: `Bearer ${token}` } });
      if (hospitalsRes.ok) setHospitals(await hospitalsRes.json());
    } catch (error) {

      console.error("Failed to fetch data:", error);
    }
  };

  const handleLogMedication = async (medId: string, status: string) => {
    const token = localStorage.getItem('token');
    if (!selectedProfile) return;

    try {
      const res = await fetch('/api/patient/medication-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicationId: medId,
          profileId: selectedProfile.id,
          status,
          scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      });

      if (res.ok) {
        toast.success(`Medication marked as ${status}`);
        fetchData(selectedProfile.id);
      }
    } catch (error) {
      toast.error("Failed to log medication status");
    }
  };

  useEffect(() => {
    fetchProfiles();

    // Tri-Alert polling: check every 10 seconds for unread patient alerts
    const triAlertInterval = setInterval(async () => {
      if (!selectedProfile) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`/api/tri-alerts/patient/${selectedProfile.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const alerts = await res.json();
          if (alerts.length > 0 && !showTriAlertModal) {
            setActiveTriAlert(alerts[0]);
            setShowTriAlertModal(true);
          }
        }
      } catch {}

      // Family member alerts (toast for non-Self profiles)
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) return;
        const famRes = await fetch(`/api/tri-alerts/family/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (famRes.ok) {
          const famAlerts = await famRes.json();
          famAlerts.forEach((fa: any) => {
            toast.warning(`\u26a0\ufe0f Family Alert: ${fa.patientName}'s medication ${fa.newDrug} may conflict with existing drugs`, { duration: 12000 });
            // Auto-mark family alert as read
            fetch(`/api/tri-alerts/${fa.id}/read`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ recipient: 'family' })
            });
          });
        }
      } catch {}
    }, 10000);

    return () => clearInterval(triAlertInterval);
  }, [selectedProfile]);

  useEffect(() => {
    if (selectedProfile) {
      fetchData(selectedProfile.id);
    }
  }, [selectedProfile]);

  const handleEditProfile = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfile(p);
    setShowProfileModal(true);
    setShowProfileSelector(false);
  };

  const handleAddProfile = () => {
    setEditingProfile(null);
    setShowProfileModal(true);
    setShowProfileSelector(false);
  };

  const refreshData = () => {
    if (selectedProfile) fetchData(selectedProfile.id);
  };

  const handleDeleteMedication = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/medications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Medication removed from timeline'); refreshData(); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeletePrescription = async () => {
    if (!selectedProfile) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/patient/medications/all/${selectedProfile.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Prescription cleared from timeline'); refreshData(); }
    } catch { toast.error('Failed to clear prescription'); }
  };

  const handleTriAlertAcknowledge = async (alertId: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/tri-alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient: 'patient' })
      });
    } catch {}
  };

  const handleTriAlertFromUpload = (alert: any) => {
    setActiveTriAlert(alert);
    setShowTriAlertModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Hero Section: Prescription Upload */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 italic">Upload Prescription</h2>
              <p className="text-sm text-slate-500 font-medium italic">Our AI will extract and verify your medications for clinical accuracy.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowUpload(true)}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-3 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            New Upload
          </button>
        </div>

        {/* Minimalist drop zone mockup */}
        <div 
          onClick={() => setShowUpload(true)}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-all transition-all"
        >
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-slate-300">
            <FileText size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 italic">Click to upload or drag and drop prescription images</p>
        </div>
      </section>

      {/* 2. Main content split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Medical History Timeline (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 min-h-[600px]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-400">
                <Activity size={24} className="animate-pulse" />
                <h3 className="text-xl font-bold italic">Medical History</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">{meds.length} Active Rx</span>
              </div>
            </div>

            {selectedProfile ? (
              <div className="relative pl-8 space-y-12">
                <div className="timeline-line" />
                
                {/* Timeline Entry: Medications */}
                {meds.length > 0 && (
                  <div className="relative group/block">
                    <div className="absolute -left-[2.25rem] top-1.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="mb-4">
                        <span className="text-xs font-bold text-slate-400 block mb-1">{new Date().toLocaleDateString()}</span>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">PRESCRIPTION</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Active Medical Records</span>
                            </div>
                            <button onClick={handleDeletePrescription} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/block:opacity-100 transition-all" title="Clear Prescription">
                              <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                      {meds.map((med) => {
                        const isInteracting = interactions.some(i => {
                          try {
                            const drugs = JSON.parse(i.drugsInvolved);
                            return drugs.includes(med.name);
                          } catch(e) { return false; }
                        });

                        return (
                          <div key={med.id} className={`bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border ${isInteracting ? 'border-red-200 dark:border-red-900/30' : 'border-slate-100 dark:border-slate-800'} p-6 transition-all relative group`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${isInteracting ? 'bg-red-100 text-red-600' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-emerald-600'}`}>
                                  <Pill size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">{med.name}</h4>
                                    {isInteracting && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black italic">ALERT</span>}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">{med.dose} • {med.schedule}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleDeleteMedication(med.id)} className="p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all" title="Remove">
                                  <Trash2 size={14} />
                                </button>
                                <div className="text-right">
                                  <span className={`text-[10px] font-black tracking-widest uppercase ${med.isApproved ? 'text-emerald-600' : 'text-orange-500'}`}>
                                    {med.isApproved ? 'Verified' : 'Pending Verification'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {isInteracting && (
                              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/20 rounded-xl">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                                  <AlertCircle size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Safe-Dose Warning</span>
                                </div>
                                <p className="text-[10px] text-red-600 dark:text-red-300 italic leading-relaxed">
                                  Detected potential interaction with other prescribed medications. Consult your physician.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timeline Entry: Visits */}
                {visits.map(visit => (
                  <div key={visit.id} className="relative">
                    <div className="absolute -left-[2.25rem] top-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="mb-4">
                        <span className="text-xs font-bold text-slate-400 block mb-1">{new Date(visit.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">CLINICAL VISIT</span>
                            <span className="text-sm font-bold">{visit.hospital}</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative group">
                      <button onClick={(e) => handleDeleteVisit(visit.id, e)} className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all" title="Remove visit">
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs uppercase">
                          {visit.doctorName.charAt(0)}
                        </div>
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">{visit.doctorName}</div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-2 border-slate-100 pl-4">
                        "{visit.notes}"
                      </p>
                    </div>
                  </div>
                ))}

                {meds.length === 0 && visits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Activity size={64} className="mb-4 opacity-5" />
                    <p className="font-medium italic">No medical records found on your timeline.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 text-center">
                <User size={64} className="mb-4 opacity-10" />
                <p className="font-medium italic">Select or create a profile to view your medical timeline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar Widgets (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Profile Widget */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-emerald-600">
              <User size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Active Profile</span>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black border border-emerald-100">
                {selectedProfile?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-black text-slate-900 dark:text-slate-100 truncate">{selectedProfile?.name || 'No Profile'}</h4>
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">{selectedProfile?.roleTag || 'Select Profile'}</div>
              </div>
              <button 
                onClick={() => setShowProfileSelector(!showProfileSelector)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-emerald-600 transition-colors"
                title="Switch Profile"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            <AnimatePresence>
              {showProfileSelector && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-50 pt-4 mb-4">
                  <div className="space-y-2">
                    {profiles.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProfile(p); setShowProfileSelector(false); }} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${selectedProfile?.id === p.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
                        <div className="w-6 h-6 rounded-lg bg-current opacity-10 flex items-center justify-center text-[10px] font-black">{p.name.charAt(0)}</div>
                        <span className="text-xs font-bold">{p.name}</span>
                      </button>
                    ))}
                    <button onClick={handleAddProfile} className="w-full mt-2 p-2 border-2 border-dashed border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-emerald-200 hover:text-emerald-600 transition-all text-center">
                      + Add Family Member
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedProfile && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Blood Group</div>
                  <div className="font-bold text-red-600">{selectedProfile.bloodGroup || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Age</div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">{selectedProfile.age || 'N/A'} yrs</div>
                </div>
              </div>
            )}
          </section>

          {/* AI Health Suggestions Widget */}
          <section className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl shadow-emerald-600/10">
            <div className="flex items-center gap-2 mb-6">
              <Bot size={18} className="opacity-80" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">AI Clinical Assistant</span>
            </div>
            <div className="space-y-4">
              {suggestions.length > 0 ? suggestions.slice(0, 2).map((s: any) => (
                <p key={s.id} className="text-sm font-medium italic leading-relaxed opacity-95 group">
                  "{s.text}"
                </p>
              )) : (
                <p className="text-xs font-bold italic opacity-60">Generate suggestions for health insights...</p>
              )}
              <button 
                onClick={async () => {
                  if (!selectedProfile) { toast.error("Select a profile first"); return; }
                  toast.info("AI Analysis started...");
                }}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Generate Suggestions
              </button>
            </div>
          </section>

          {/* Critical Alerts Widget */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-red-600">
                    <Bell size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Alerts</span>
                </div>
                {alerts.length > 0 && <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center animate-pulse">{alerts.length}</span>}
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/10 rounded-xl">
                  <p className="text-[10px] font-bold text-red-800 dark:text-red-400 truncate">{alert.type}</p>
                  <p className="text-[9px] text-red-600/70 dark:text-red-300/70 mt-0.5">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              )) : (
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 italic">No unread alerts</p>
                </div>
              )}
            </div>
          </section>

          {/* Nearby Healthcare Hubs Widget */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-blue-600">
                <Stethoscope size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Nearby Healthcare</span>
              </div>
              <Link to="/patient/map" className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase flex items-center gap-1 transition-colors">
                Map View <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {hospitals.slice(0, 3).map(h => (
                <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl group hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="text-[11px] font-black text-slate-900 dark:text-slate-100 line-clamp-1">{h.name}</h5>
                    <div className="flex items-center text-amber-500">
                      <span className="text-[9px] font-bold">{h.rating || '4.8'}</span>
                      <svg className="w-2.5 h-2.5 fill-current ml-0.5" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {h.specialties?.slice(0, 2).map((s: string, i: number) => (
                      <span key={i} className="text-[8px] font-black text-slate-400 uppercase">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {/* Modals remain for specific actions */}
        {showUpload && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpload(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold italic">Prescription OCR Capture</h2>
                    <button onClick={() => setShowUpload(false)} className="hover:rotate-90 transition-transform"><X /></button>
                </div>
                <div className="p-0">
                  <PrescriptionUpload 
                    profileId={selectedProfile?.id} 
                    onComplete={() => { setShowUpload(false); fetchData(selectedProfile.id); }}
                    onTriAlert={handleTriAlertFromUpload}
                  />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tri-Alert Polypharmacy Modal */}
      {showTriAlertModal && activeTriAlert && (
        <TriAlertModal
          alert={activeTriAlert}
          onAcknowledge={handleTriAlertAcknowledge}
          onClose={() => { setShowTriAlertModal(false); setActiveTriAlert(null); }}
        />
      )}

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        onSave={fetchProfiles}
        profile={editingProfile}
      />
    </div>
  );
}

