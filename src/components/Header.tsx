import React from 'react';
import { Activity, LogOut, User, Menu, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../context/LanguageContext';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onMenuOpen?: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onMenuOpen, title }) => {
  const { language, setLanguage, t } = useTranslation();

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-[1000] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuOpen}
          className="p-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 transition-all active:scale-95"
          aria-label="Toggle Menu"
        >
          <Menu size={28} strokeWidth={2.5} />
        </button>


        <div className="flex items-center gap-3">

        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
          <Activity size={20} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{t('app_name')}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">{title || (user.role === 'doctor' ? 'Doctor Portal' : t('patient') + ' Portal')}</span>
        </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button 
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLanguage('hi')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'hi' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
          >
            हिं
          </button>
        </div>

        <div className="flex items-center gap-3 pr-4 md:pr-6 border-r border-slate-100 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate max-w-[120px]">
              {user.role === 'doctor' ? 'Clinical Practitioner' : `UID: ${user.uniqueId}`}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <User size={20} />
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
          title={t('logout')}
        >
          <LogOut size={20} />
          <span className="text-sm font-bold hidden md:block">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
