import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  LogOut, 
  User, 
  Menu, 
  X, 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Settings,
  ShieldAlert,
  FileText,
  MessageSquare,
  Edit2,
  Bot,
  Palette,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileModal from './ProfileModal';
import { cache } from '../lib/cache';

interface SidebarProps {
  user: any;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isOpen, onClose }) => {
  const location = useLocation();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('mode') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const mode = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mode', mode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mode', mode);
  }, [isDarkMode]);

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    // Try cache first
    const cachedProfiles = cache.get('profiles');
    if (cachedProfiles) setProfiles(cachedProfiles);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profiles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
        cache.set('profiles', data);
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  };

  const handleEditProfile = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfile(p);
    setShowProfileModal(true);
  };

  const handleAddProfile = () => {
    setEditingProfile(null);
    setShowProfileModal(true);
  };

  const menuItems = user?.role === 'patient' ? [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/patient' },
    { name: 'Symptom Checker', icon: Activity, path: '/patient/symptoms' },
    { name: 'Nearby Facilities', icon: MapPin, path: '/patient/map' },
    { name: 'Manage Profiles', icon: Users, path: '/patient/profiles' },
    { name: 'Health Reports', icon: FileText, path: '/patient/reports' },
    { name: 'AI Chatbot', icon: MessageSquare, path: '/patient/chat' },
    { name: 'Live Consultation', icon: Bot, path: '/patient/consultation' },
    { name: 'Emergency Center', icon: ShieldAlert, path: '/patient/emergency' },
  ] : [
    { name: 'Doctor Dashboard', icon: LayoutDashboard, path: '/doctor' },
    { name: 'Patient Directory', icon: Users, path: '/doctor/patients' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[1000] backdrop-blur-sm"
          />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-800 dark:bg-slate-900 z-[1001] shadow-2xl flex flex-col border-r border-slate-100 dark:border-slate-700/50 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-xl">
                  <Activity size={24} />
                  <span>MediSync</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <ShieldAlert size={10} />
                    <span>Your Unique ID</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-primary">
                    {user?.uniqueId || 'Generating...'}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Navigation</h4>
                  {menuItems.map((item) => (
                    <Link 
                      key={item.name}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        location.pathname === item.path 
                          ? 'bg-primary/10 text-primary font-semibold' 
                          : 'text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>

              {user?.role === 'patient' && (
                <div className="space-y-1">
                  <h4 className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Patient Profiles</h4>
                  {profiles.map((profile) => (
                    <div 
                      key={profile.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {profile.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{profile.name}</span>
                          <span className="text-[10px] text-slate-400">{profile.roleTag}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.isPrimary && <ShieldAlert size={12} className="text-primary" />}
                        <button 
                          onClick={(e) => handleEditProfile(profile, e)}
                          className="p-1 hover:bg-primary/10 rounded text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddProfile}
                    className="w-full mt-2 text-xs text-primary font-semibold hover:underline text-left px-4"
                  >
                    + Add New Profile
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between px-4 mb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme Mode</h4>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 dark:text-slate-300 transition-all"
                  >
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </button>
                </div>
                <h4 className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Theme Presets</h4>
                <div className="grid grid-cols-5 gap-2 px-4">
                  {[
                    { id: 'light', color: 'bg-blue-600' },
                    { id: 'emerald', color: 'bg-emerald-600' },
                    { id: 'rose', color: 'bg-rose-600' },
                    { id: 'amber', color: 'bg-amber-600' },
                    { id: 'indigo', color: 'bg-indigo-600' },
                    { id: 'violet', color: 'bg-violet-600' },
                    { id: 'cyan', color: 'bg-cyan-600' },
                    { id: 'lime', color: 'bg-lime-600' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setCurrentTheme(t.id)}
                      className={`w-full aspect-square rounded-lg ${t.color} border-2 ${currentTheme === t.id ? 'border-primary scale-110 shadow-lg' : 'border-transparent'} transition-all`}
                      title={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800">
              <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 dark:text-slate-400">
                  <User size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{user?.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-semibold"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          </motion.div>
          
          <ProfileModal 
            isOpen={showProfileModal} 
            onClose={() => setShowProfileModal(false)} 
            onSave={fetchProfiles}
            profile={editingProfile}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
