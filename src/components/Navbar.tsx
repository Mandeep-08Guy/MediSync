import { Link } from 'react-router-dom';
import { Activity, Menu, User } from 'lucide-react';

export default function Navbar({ user, onMenuOpen }: { user: any; onMenuOpen: () => void }) {
  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {user && (
            <button 
              onClick={onMenuOpen}
              className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600">
            <Activity className="w-8 h-8" />
            <span className="hidden sm:block">MediSync</span>
          </Link>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">{user.role}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
