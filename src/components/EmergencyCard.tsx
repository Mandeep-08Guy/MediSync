import { QRCodeSVG } from 'qrcode.react';
import { Shield, Phone, Heart, User } from 'lucide-react';

export default function EmergencyCard({ profile }: { profile: any }) {
  if (!profile) return null;

  const emergencyData = JSON.stringify({
    name: profile.name,
    bloodGroup: profile.bloodGroup || 'N/A',
    allergies: profile.allergies || 'None',
    emergencyContact: `${profile.emergencyContactName}: ${profile.emergencyContactPhone}`
  });

  return (
    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-8 rounded-3xl border-4 border-red-100 dark:border-red-900/30 shadow-2xl max-w-md mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 dark:text-white uppercase tracking-tight">Emergency Card</h2>
          <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">MediSync Vital Info</p>
        </div>
      </div>

      <div className="flex justify-center mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
        <QRCodeSVG value={emergencyData} size={180} bgColor="transparent" fgColor="currentColor" className="text-slate-900 dark:text-slate-100 dark:text-white" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-xl">
          <User className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 dark:text-white">{profile.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <p className="text-[10px] font-bold text-red-400 uppercase">Blood Group</p>
            <p className="font-black text-red-600 dark:text-red-400 text-xl">{profile.bloodGroup || 'O+'}</p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <p className="text-[10px] font-bold text-orange-400 uppercase">Allergies</p>
            <p className="font-bold text-orange-600 dark:text-orange-400 text-sm">{profile.allergies || 'None'}</p>
          </div>
        </div>

        <div className="p-4 bg-accent rounded-xl border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold text-primary/60 uppercase">Emergency Contact</p>
          </div>
          <p className="font-bold text-slate-900 dark:text-slate-100 dark:text-white">{profile.emergencyContactName || 'Jane Doe'}</p>
          <p className="text-primary font-mono font-bold">{profile.emergencyContactPhone || '+1 234 567 890'}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-700 text-center">
        <p className="text-[10px] text-slate-400 font-medium">
          Scan QR code for full medical history and current medications.
        </p>
      </div>
    </div>
  );
}
