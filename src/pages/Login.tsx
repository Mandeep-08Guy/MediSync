import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { User, X, LogIn, ChevronRight, Shield, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SavedAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  uniqueId: string;
}

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('medisync_saved_accounts');
    if (saved) {
      try {
        setSavedAccounts(JSON.parse(saved));
      } catch (e) { /* ignore corrupt data */ }
    }
  }, []);

  const saveAccount = (account: SavedAccount) => {
    const existing = localStorage.getItem('medisync_saved_accounts');
    let accounts: SavedAccount[] = [];
    if (existing) {
      try { accounts = JSON.parse(existing); } catch (e) {}
    }
    // Update if exists, or add new
    const idx = accounts.findIndex(a => a.email === account.email);
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem('medisync_saved_accounts', JSON.stringify(accounts));
    setSavedAccounts(accounts);
  };

  const removeAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.email !== emailToRemove);
    localStorage.setItem('medisync_saved_accounts', JSON.stringify(updated));
    setSavedAccounts(updated);
    toast.success('Account removed');
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Save this account for quick re-login
        saveAccount({
          email: loginEmail,
          password: loginPassword,
          name: data.user.name,
          role: data.user.role,
          uniqueId: data.user.uniqueId,
        });

        onLogin(data.user);
        toast.success('Welcome back, ' + data.user.name);
        navigate(data.user.role === 'doctor' ? '/doctor' : '/patient');
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Connection failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleQuickLogin = (account: SavedAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    doLogin(account.email, account.password);
  };

  return (
    <div className="max-w-md mx-auto mt-12 space-y-6">
      {/* Saved Accounts */}
      {savedAccounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <LogIn size={14} />
              Previously Logged In
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {savedAccounts.map((account, i) => (
              <motion.button
                key={account.email}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleQuickLogin(account)}
                disabled={isLoggingIn}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-all group text-left disabled:opacity-60"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${
                  account.role === 'doctor' 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {account.role === 'doctor' ? <Stethoscope size={22} /> : account.name?.charAt(0)?.toUpperCase() || <User size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{account.name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate">{account.email}</span>
                    <span className="shrink-0">•</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      account.role === 'doctor' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {account.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => removeAccount(account.email, e)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove saved account"
                  >
                    <X size={14} />
                  </button>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50"
      >
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">MediSync Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-600 dark:text-slate-400">
          Don't have an account? <Link to="/register" className="text-blue-600 hover:underline font-medium">Register here</Link>
        </p>
      </motion.div>

      {savedAccounts.length > 0 && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          <Shield size={12} className="inline mr-1 -mt-0.5" />
          Credentials are stored locally on this device only.
        </p>
      )}
    </div>
  );
}
