import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  profile?: any; // If provided, we are editing
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, profile }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    bloodGroup: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    roleTag: 'Self',
    isPrimary: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setStep(1);
    if (profile) {
      setFormData({
        name: profile.name || '',
        age: profile.age || '',
        bloodGroup: profile.bloodGroup || '',
        allergies: profile.allergies || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        roleTag: profile.roleTag || 'Self',
        isPrimary: !!profile.isPrimary
      });
    } else {
      setFormData({
        name: '',
        age: '',
        bloodGroup: '',
        allergies: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        roleTag: 'Self',
        isPrimary: false
      });
    }
  }, [profile, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = profile ? `/api/profiles/${profile.id}` : '/api/profiles';
      const method = profile ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(profile ? 'Profile updated' : 'Profile created');
        onSave();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {profile ? 'Edit Profile' : 'Add New Profile'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Stepper Header */}
              <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 -z-10 -translate-y-1/2" />
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === s ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {step > s ? <Check size={16} /> : s}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                    <input autoFocus required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-slate-800" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Age</label>
                    <input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800" placeholder="25" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role / Tag</label>
                    <input type="text" value={formData.roleTag} onChange={(e) => setFormData({ ...formData, roleTag: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800" placeholder="Self, Spouse, Child" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Blood Group</label>
                    <select value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800">
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Known Allergies</label>
                    <textarea value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800 min-h-[100px] resize-none" placeholder="Penicillin, Peanuts, Pollen..." />
                  </div>
                  <div className="col-span-2 pt-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Emergency Contact</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                    <input type="text" value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="tel" value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-800" placeholder="+1 234 567" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3 pt-4 mt-2 bg-blue-50 p-4 rounded-xl border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30">
                    <input type="checkbox" id="isPrimary" checked={formData.isPrimary} onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })} className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <label htmlFor="isPrimary" className="text-sm font-bold text-blue-900 dark:text-blue-100 cursor-pointer">Set as Primary Profile <span className="block text-xs font-normal text-blue-600 dark:text-blue-300 mt-1">Make this the default profile upon login.</span></label>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Save size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Review Profile</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Please verify the details below before saving.</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-4">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Name</span><span className="font-bold text-slate-700 dark:text-slate-200">{formData.name || 'N/A'}</span></div>
                      <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Role</span><span className="font-bold text-slate-700 dark:text-slate-200">{formData.roleTag || 'N/A'}</span></div>
                      <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Age</span><span className="font-bold text-slate-700 dark:text-slate-200">{formData.age || 'N/A'}</span></div>
                      <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Blood Group</span><span className="font-bold text-red-500">{formData.bloodGroup || 'N/A'}</span></div>
                      <div className="col-span-2"><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Allergies</span><span className="font-medium text-slate-700 dark:text-slate-200">{formData.allergies || 'None listed'}</span></div>
                      <div className="col-span-2 pt-3 border-t border-slate-200 dark:border-slate-700"><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Emergency Contact</span><span className="font-medium text-slate-700 dark:text-slate-200">{formData.emergencyContactName} {formData.emergencyContactPhone ? `(${formData.emergencyContactPhone})` : ''}</span></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 flex gap-3 bg-slate-50/50 dark:bg-slate-800/50">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all">Back</button>
              ) : (
                <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all">Cancel</button>
              )}
              
              <div className="flex-1" />

              {step < 3 ? (
                <button type="button" onClick={() => { if (!formData.name) toast.error("Name is required"); else setStep(step + 1); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-blue-900/30 flex items-center gap-2">Next <ArrowRight size={18} /></button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md shadow-green-200 dark:shadow-green-900/30 flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {profile ? 'Update Profile' : 'Confirm & Save'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
