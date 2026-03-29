import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Shield, Trash2, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import ProfileModal from '../components/ProfileModal';
import { cache } from '../lib/cache';
import { toast } from 'sonner';

export default function ManageProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    // Try cache first
    const cached = cache.get('profiles');
    if (cached) setProfiles(cached);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        cache.set('profiles', data);
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleEdit = (profile: any) => {
    setEditingProfile(profile);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Profile deleted');
        fetchProfiles();
      } else {
        toast.error('Failed to delete profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/profiles/${id}/primary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Primary profile updated');
        fetchProfiles();
      } else {
        toast.error('Failed to update primary profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Manage Profiles</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage health profiles for you and your family members.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} />
          <span>Add Profile</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={profile.id}
            className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border transition-all group relative ${
              profile.isPrimary ? 'border-blue-200 ring-2 ring-blue-50 shadow-md' : 'border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md'
            }`}
          >
            {profile.isPrimary && (
              <div className="absolute -top-3 left-6 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                Primary Profile
              </div>
            )}
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  profile.isPrimary ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {profile.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{profile.roleTag}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(profile)}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Edit Profile"
                >
                  <Edit2 size={16} />
                </button>
                {!profile.isPrimary && (
                  <button 
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Delete Profile"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Blood Group</p>
                <p className="font-bold text-red-600">{profile.bloodGroup || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Age</p>
                <p className="font-bold text-slate-700 dark:text-slate-300">{profile.age || 'N/A'} yrs</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Allergies</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 italic">
                {profile.allergies || 'No allergies reported'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              {!profile.isPrimary && (
                <button 
                  onClick={() => handleSetPrimary(profile.id)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                >
                  <Shield size={14} />
                  Set as Primary
                </button>
              )}
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter ml-auto">
                ID: {profile.id.slice(0, 8)}
              </div>
            </div>
          </motion.div>
        ))}

        {profiles.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No profiles found. Start by adding one!</p>
          </div>
        )}
      </div>

      <ProfileModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={fetchProfiles} 
        profile={editingProfile} 
      />
    </div>
  );
}
