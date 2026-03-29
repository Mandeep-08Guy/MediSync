import { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, Pill, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TriAlert {
  id: string;
  severity: string;
  drugsInvolved: string;
  message: string;
  newDrug: string;
  existingDrugs: string;
  patientName: string;
  timestamp: string;
}

interface TriAlertModalProps {
  alert: TriAlert | null;
  onAcknowledge: (id: string) => void;
  onClose: () => void;
}

export default function TriAlertModal({ alert, onAcknowledge, onClose }: TriAlertModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!alert) return null;

  const isSevere = alert.severity === 'Severe';
  let drugs: string[] = [];
  try { drugs = JSON.parse(alert.drugsInvolved); } catch { drugs = [alert.newDrug]; }
  let existingDrugs: string[] = [];
  try { existingDrugs = JSON.parse(alert.existingDrugs); } catch { existingDrugs = []; }

  const handleAcknowledge = async () => {
    setAcknowledged(true);
    onAcknowledge(alert.id);
    setTimeout(() => {
      onClose();
      setAcknowledged(false);
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl ${
            isSevere
              ? 'ring-2 ring-red-500 shadow-red-500/30'
              : 'ring-2 ring-orange-400 shadow-orange-400/20'
          }`}
        >
          {/* Pulsing danger header */}
          <div className={`relative p-6 ${isSevere ? 'bg-red-600' : 'bg-orange-500'}`}>
            <div className={`absolute inset-0 ${isSevere ? 'bg-red-600' : 'bg-orange-500'} animate-pulse opacity-30`} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isSevere ? 'bg-red-700/50' : 'bg-orange-600/50'}`}>
                  <ShieldAlert size={28} className="text-white" />
                </div>
                <div>
                  <div className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">
                    Tri-Alert • Polypharmacy Safety Net
                  </div>
                  <h2 className="text-white text-xl font-black italic">
                    {isSevere ? '🚨 SEVERE CONFLICT' : '⚠️ MODERATE CONFLICT'}
                  </h2>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} className="text-white/70" />
              </button>
            </div>
          </div>

          {/* Content body */}
          <div className="bg-white dark:bg-slate-900 p-6 space-y-6">
            {/* Conflicting Drugs Visual */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                Conflicting Medications
              </h3>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {drugs.map((drug, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSevere ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        ×
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${
                      isSevere
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                        : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30'
                    }`}>
                      <Pill size={14} />
                      {drug}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Explanation */}
            <div className={`p-4 rounded-2xl border-l-4 ${
              isSevere
                ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                : 'bg-orange-50 dark:bg-orange-950/20 border-orange-500'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className={isSevere ? 'text-red-500 mt-0.5' : 'text-orange-500 mt-0.5'} />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                    AI Clinical Assessment
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{alert.message}"
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Recipients */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">
                Alert Sent Simultaneously To:
              </h4>
              <div className="flex items-center gap-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} /> You (Patient)
                </span>
                <ArrowRight size={12} className="text-emerald-300" />
                <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} /> Doctor
                </span>
                <ArrowRight size={12} className="text-emerald-300" />
                <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} /> Family
                </span>
              </div>
            </div>

            {/* Acknowledge Button */}
            <button
              onClick={handleAcknowledge}
              disabled={acknowledged}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                acknowledged
                  ? 'bg-green-600 text-white'
                  : isSevere
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
              }`}
            >
              {acknowledged ? (
                <>
                  <CheckCircle2 size={18} />
                  Acknowledged
                </>
              ) : (
                <>
                  <ShieldAlert size={18} />
                  I Understand — Acknowledge Alert
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-400 italic">
              Please consult your prescribing physician before combining these medications.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
