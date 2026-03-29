import React, { useState, useEffect } from 'react';
import { Activity, Search, MapPin, AlertTriangle, Navigation, Loader2, Thermometer, ChevronRight, Hospital as HospitalIcon, Phone, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';

interface Hospital {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  specialty?: string;
  distance?: number;
  phone?: string;
  address?: string;
}

const PRESET_SYMPTOMS = [
  "Chest pain radiating to left arm",
  "Shortness of breath and fatigue",
  "Severe headache and blurred vision",
  "High fever and persistent cough",
  "Sharp abdominal pain",
  "Dizziness and lightheadedness",
  "Nausea and vomiting",
  "Chronic lower back pain",
  "Joint pain and stiffness",
  "Sudden skin rash or hives",
  "Sore throat and difficulty swallowing",
  "Extreme fatigue and weakness",
  "Numbness or tingling in limbs",
  "Persistent earache",
  "Heart palpitations or irregular heartbeat",
  "Frequent urination",
  "Sudden unexplained weight loss",
  "Difficulty sleeping (Insomnia)",
  "Severe anxiety or panic attack symptoms",
  "Frequent muscle cramps",
  "Persistent heartburn or acid reflux",
  "Chronic constipation",
  "Persistent diarrhea",
  "Blood in stool or urine",
  "Swelling in legs or ankles"
];

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location access denied")
      );
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these symptoms: "${symptoms}". 
        Provide a risk assessment including:
        1. Risk Level (Low, Medium, High, Emergency)
        2. Potential conditions (matching dangerous diseases if applicable)
        3. Recommended specialist type (e.g. Cardiologist, General Physician)
        4. Urgency explanation.
        Format as JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING },
              potentialConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              specialistType: { type: Type.STRING },
              urgencyExplanation: { type: Type.STRING },
              probabilityOfSeriousProblem: { type: Type.NUMBER, description: "Percentage 0-100" }
            },
            required: ["riskLevel", "potentialConditions", "specialistType", "urgencyExplanation", "probabilityOfSeriousProblem"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setAnalysis(result);

      // Fetch hospitals and filter/sort by distance and specialty
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hospitals/nearby', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        let hospitals: Hospital[] = await res.json();
        
        // Add mock details for demo if missing
        hospitals = hospitals.map(h => ({
          ...h,
          phone: "+91 80 2222 3333",
          address: "123 Health Ave, Bangalore",
          specialty: h.type === 'hospital' ? 'Multi-specialty' : (h.type === 'doctor' ? 'Specialist' : 'General Care')
        }));

        if (userLocation) {
          hospitals = hospitals.map(h => ({
            ...h,
            distance: calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng)
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        
        setNearbyHospitals(hospitals);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze symptoms. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Symptom Checker</h1>
        <p className="text-slate-500 dark:text-slate-400">Describe how you're feeling for an instant risk assessment and local care options.</p>
      </header>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SYMPTOMS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSymptoms(preset)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-accent hover:text-primary text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-100 dark:border-slate-700/50 transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">What symptoms are you experiencing?</label>
          <div className="relative">
            <Thermometer className="absolute left-4 top-4 text-slate-400" size={24} />
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. I have a sharp chest pain that radiates to my left arm, and I feel short of breath..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px] text-lg"
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={analyzing || !symptoms.trim()}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {analyzing ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Analyzing Symptoms...</span>
              </>
            ) : (
              <>
                <Activity size={24} />
                <span>Check Symptoms</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

      <AnimatePresence>
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Risk Assessment Card */}
            <div className={`p-6 rounded-3xl border-l-8 shadow-lg ${
              analysis.riskLevel === 'Emergency' || analysis.riskLevel === 'High' 
                ? 'bg-red-50 border-red-500 text-red-900' 
                : analysis.riskLevel === 'Medium' 
                  ? 'bg-amber-50 border-amber-500 text-amber-900' 
                  : 'bg-green-50 border-green-500 text-green-900'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${
                  analysis.riskLevel === 'Emergency' || analysis.riskLevel === 'High' ? 'bg-red-100' : 'bg-white/50'
                }`}>
                  <AlertTriangle size={32} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Risk Level: {analysis.riskLevel}</h2>
                    <span className="text-3xl font-black">{analysis.probabilityOfSeriousProblem}%</span>
                  </div>
                  <p className="mt-2 font-medium opacity-80">{analysis.urgencyExplanation}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {analysis.potentialConditions.map((c: string) => (
                      <span key={c} className="px-3 py-1 bg-white/40 rounded-full text-xs font-bold uppercase tracking-wider">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Action & Nearby Hospitals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="text-primary" size={20} />
                  Recommended Specialist
                </h3>
                <div className="bg-accent p-4 rounded-2xl border border-blue-100">
                  <p className="text-primary font-bold text-xl">{analysis.specialistType}</p>
                  <p className="text-sm text-primary mt-1">We recommend consulting this type of specialist for a professional diagnosis.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <MapPin className="text-red-500" size={20} />
                  Nearby Care Options
                </h3>
                <div className="space-y-3">
                  {nearbyHospitals.slice(0, 3).map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-primary transition-colors">
                          <HospitalIcon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{h.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{h.distance?.toFixed(1)} km away • {h.specialty}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Hospital List */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Recommended Facilities for You</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {nearbyHospitals.map(hospital => (
                  <div key={hospital.id} className="p-6 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0">
                        <HospitalIcon size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{hospital.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin size={14} /> {hospital.address}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                            <Phone size={12} /> {hospital.phone}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                            <Clock size={12} /> Open 24/7
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{hospital.distance?.toFixed(1)} km</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
                      </div>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-200"
                      >
                        <Navigation size={18} />
                        <span>Get Directions</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Medical Disclaimer</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          This AI Symptom Checker is for informational purposes only and does not provide medical diagnosis or treatment. 
          If you are experiencing a life-threatening emergency, please call your local emergency services immediately.
        </p>
      </footer>
    </div>
  );
}
