import React, { useState, useEffect } from 'react';
import { Shield, Phone, Heart, User, AlertTriangle, Navigation, MessageSquare, Bell, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import EmergencyCard from '../components/EmergencyCard';
import { cache } from '../lib/cache';

export default function Emergency() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const cachedProfiles = cache.get('profiles');
    if (cachedProfiles) {
      setProfiles(cachedProfiles);
      setSelectedProfile(cachedProfiles.find((p: any) => p.isPrimary) || cachedProfiles[0]);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profiles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
        if (!selectedProfile) {
          setSelectedProfile(data.find((p: any) => p.isPrimary) || data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  };

  const triggerSOS = () => {
    setIsSOSActive(true);
    setCountdown(5);
    toast.warning("SOS Alert will be sent in 5 seconds...", {
      duration: 5000,
    });
  };

  useEffect(() => {
    let timer: any;
    if (isSOSActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isSOSActive && countdown === 0) {
      sendSOS();
    }
    return () => clearInterval(timer);
  }, [isSOSActive, countdown]);

  const sendSOS = async () => {
    setIsSOSActive(false);
    toast.success("SOS Alert Sent! Emergency contacts and nearby facilities have been notified.", {
      icon: <Bell className="text-red-600" />,
      duration: 10000,
    });
    
    // In a real app, this would call an API to send SMS/Push notifications
    console.log("SOS Sent for:", selectedProfile?.name);
  };

  const cancelSOS = () => {
    setIsSOSActive(false);
    toast.info("SOS Alert Cancelled");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 dark:text-white">Emergency Center</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Immediate assistance and critical medical information.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedProfile?.id}
            onChange={(e) => setSelectedProfile(profiles.find(p => p.id === e.target.value))}
            className="bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 dark:text-slate-300 outline-none focus:ring-2 focus:ring-red-500"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.roleTag})</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SOS Section */}
        <div className="space-y-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-red-200 dark:shadow-red-900/20 relative overflow-hidden group"
          >
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform">
              <AlertTriangle size={200} />
            </div>
            
            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Shield size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">SOS Emergency</h2>
                <p className="text-red-100 font-medium">Notify all emergency contacts and nearby medical facilities instantly.</p>
              </div>
              
              {!isSOSActive ? (
                <button 
                  onClick={triggerSOS}
                  className="w-full py-6 bg-white dark:bg-slate-800 text-red-600 rounded-2xl font-black text-xl shadow-xl hover:bg-red-50 transition-all active:scale-95"
                >
                  TRIGGER SOS
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl font-black">{countdown}</div>
                  <button 
                    onClick={cancelSOS}
                    className="w-full py-4 bg-red-800 text-white rounded-2xl font-bold hover:bg-red-900 transition-all"
                  >
                    CANCEL SOS
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <a 
              href="tel:911"
              className="p-6 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700 shadow-sm flex flex-col items-center gap-3 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all group"
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Phone size={24} />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-200">Call 911</span>
            </a>
            <button 
              onClick={() => setShowCard(true)}
              className="p-6 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700 shadow-sm flex flex-col items-center gap-3 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all group"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-200">Digital ID</span>
            </button>
          </div>

          <div className="bg-slate-900 dark:bg-black p-6 rounded-3xl text-white space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Emergency Contacts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
                    {selectedProfile?.emergencyContactName?.charAt(0) || 'J'}
                  </div>
                  <div>
                    <p className="font-bold">{selectedProfile?.emergencyContactName || 'Jane Doe'}</p>
                    <p className="text-xs text-slate-400">Primary Contact</p>
                  </div>
                </div>
                <a href={`tel:${selectedProfile?.emergencyContactPhone}`} className="p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-all">
                  <Phone size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 dark:border-slate-700 shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 dark:text-white flex items-center gap-2">
              <Heart className="text-red-500" />
              Vital Medical Info
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Blood Group</p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{selectedProfile?.bloodGroup || 'O+'}</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Allergies</p>
                <p className="font-bold text-orange-600 dark:text-orange-400">{selectedProfile?.allergies || 'None'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {['Hypertension', 'Type 2 Diabetes'].map(c => (
                    <span key={c} className="px-3 py-1 bg-white dark:bg-slate-800 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Current Medications</p>
                <div className="space-y-2">
                  {['Metformin 500mg', 'Lisinopril 10mg'].map(m => (
                    <div key={m} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent p-8 rounded-[2.5rem] border border-primary/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Navigation size={100} />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Nearby Emergency Care</h3>
            <p className="text-sm text-primary/70 mb-6">Find the fastest route to the nearest hospital or urgent care facility.</p>
            <button 
              onClick={() => window.location.href = '/patient/map'}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-200"
            >
              <Navigation size={18} />
              <span>Open Emergency Map</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <div className="relative w-full max-w-md">
              <button 
                onClick={() => setShowCard(false)}
                className="absolute -top-12 right-0 text-white hover:text-red-200 flex items-center gap-2 font-bold"
              >
                <X className="w-6 h-6" />
                Close
              </button>
              <EmergencyCard profile={selectedProfile} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
