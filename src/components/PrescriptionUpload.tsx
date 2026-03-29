import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, Check, X, Loader2, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageOptimizer';


// Brand-to-generic mapping for realistic display
const brandMapping: Record<string, string> = {
  'Metformin': 'Glycomet-SR',
  'Amoxicillin': 'Amoxil',
  'Atorvastatin': 'Lipitor',
  'Omeprazole': 'Prilosec',
  'Lisinopril': 'Zestril',
  'Azithromycin': 'Zithromax',
  'Amlodipine': 'Norvasc',
  'Ciprofloxacin': 'Cipro',
  'Levothyroxine': 'Synthroid',
  'Pantoprazole': 'Protonix',
  'Cetirizine': 'Zyrtec',
  'Ibuprofen': 'Advil',
  'Clopidogrel': 'Plavix',
  'Montelukast': 'Singulair',
  'Warfarin': 'Coumadin',
  'Losartan': 'Cozaar',
  'Gabapentin': 'Neurontin',
  'Prednisone': 'Deltasone',
  'Sertraline': 'Zoloft',
  'Escitalopram': 'Lexapro',
  'Doxycycline': 'Vibramycin',
  'Ranitidine': 'Zantac',
  'Hydrochlorothiazide': 'Microzide',
  'Alprazolam': 'Xanax',
  'Furosemide': 'Lasix',
  'Tramadol': 'Ultram',
  'Metoprolol': 'Lopressor',
  'Rosuvastatin': 'Crestor',
  'Esomeprazole': 'Nexium',
  'Duloxetine': 'Cymbalta',
};

function getBrandName(genericName: string): string {
  // Check if the drug name contains any known generic
  for (const [generic, brand] of Object.entries(brandMapping)) {
    if (genericName.toLowerCase().includes(generic.toLowerCase())) {
      return brand;
    }
  }
  // If brand is already in parentheses like "Metformin (Glucophage)", extract it
  const match = genericName.match(/\(([^)]+)\)/);
  if (match) return match[1];
  return genericName.split(' ')[0]; // fallback: use first word
}

export default function PrescriptionUpload({ profileId, onComplete, onTriAlert }: { profileId: string; onComplete: () => void; onTriAlert?: (alert: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isCritical, setIsCritical] = useState(false);
  const [isManual, setIsManual] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // ⚡️ Optimize Large Images Before Upload
      const base64 = await compressImage(file);
      
      const res = await fetch('/api/patient/upload-prescription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      setExtractedData(data);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload or AI analysis failed');
    } finally {
      setLoading(false);
    }
  };


  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/patient/confirm-medication', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          profileId,
          name: extractedData.drugName,
          dose: extractedData.dosage,
          schedule: extractedData.frequency,
          isCritical,
          status: 'pending'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.interactionAlert) {
          // Fire the Tri-Alert modal via parent callback
          if (onTriAlert && data.interactionAlert.triAlertId) {
            onTriAlert({
              id: data.interactionAlert.triAlertId,
              severity: data.interactionAlert.type,
              drugsInvolved: JSON.stringify(data.interactionAlert.drugs),
              message: data.interactionAlert.message,
              newDrug: extractedData.drugName,
              existingDrugs: '[]',
              patientName: '',
              timestamp: new Date().toISOString()
            });
          }
          toast.error(`⚠️ DRUG INTERACTION: ${data.interactionAlert.message}`, { duration: 10000 });
        } else {
          toast.success('Submitted for Doctor Verification');
        }
        onComplete();
      }
    } catch (err) {
      toast.error('Confirmation failed');
    }
  };

  // Derive the brand name dynamically from the extracted drug name
  const scannedBrand = extractedData?.drugName ? getBrandName(extractedData.drugName) : '';

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Pill className="text-primary" size={24} />
        {isManual ? 'Manual Entry' : 'Upload Prescription'}
      </h2>
      
      {!extractedData && !isManual ? (
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Drag & drop prescription photo, or click to select</p>
          </div>

          {preview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
              <button 
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                setIsManual(true);
                setExtractedData({ drugName: '', dosage: '', frequency: '', confidence: 1 });
              }}
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Enter Manually
            </button>
            <button
              disabled={!file || loading}
              onClick={handleUpload}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {loading ? 'Analyzing...' : 'Extract Details'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <Check className="text-blue-600 dark:text-blue-400" size={18} />
              {isManual ? 'Enter Medication Details' : 'Verify Extracted Details'}
            </h3>
            <div className="space-y-4">
              {!isManual && scannedBrand && (
                <div className="flex justify-between border-b border-blue-100 dark:border-blue-800/50 pb-3">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Scanned Brand Name</span>
                  <span className="font-bold text-slate-500 line-through decoration-slate-400 opacity-70">{scannedBrand}</span>
                </div>
              )}
              <div className="flex flex-col gap-1 border-b border-blue-100 dark:border-blue-800/50 pb-3">
                <label className="text-blue-700 dark:text-blue-300 font-medium text-sm flex items-center gap-2">Generic Composition {!isManual && <span className="bg-blue-200 dark:bg-blue-800 text-[10px] text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Converted</span>}</label>
                <input 
                  type="text" 
                  autoFocus={isManual}
                  value={extractedData?.drugName || ''} 
                  onChange={(e) => setExtractedData({...extractedData, drugName: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Metformin"
                />
              </div>
              <div className="flex flex-col gap-1 border-b border-blue-100 dark:border-blue-800/50 pb-3">
                <label className="text-blue-700 dark:text-blue-300 font-medium text-sm">Dosage</label>
                <input 
                  type="text" 
                  value={extractedData?.dosage || ''} 
                  onChange={(e) => setExtractedData({...extractedData, dosage: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 500mg"
                />
              </div>
              <div className="flex flex-col gap-1 border-b border-blue-100 dark:border-blue-800/50 pb-3">
                <label className="text-blue-700 dark:text-blue-300 font-medium text-sm">Frequency</label>
                <input 
                  type="text" 
                  value={extractedData?.frequency || ''} 
                  onChange={(e) => setExtractedData({...extractedData, frequency: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Twice daily"
                />
              </div>
              {!isManual && (
                <div className="flex justify-between mt-4">
                  <span className="text-blue-700 dark:text-blue-300 font-medium tracking-wide">AI Confidence <span className={`font-bold ml-2 ${(extractedData.confidence * 100) > 80 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{(extractedData.confidence * 100).toFixed(0)}%</span></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
            <input 
              type="checkbox" 
              id="isCritical" 
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
            />
            <label htmlFor="isCritical" className="text-sm font-bold text-red-700 dark:text-red-400 cursor-pointer">
              Mark as Critical Medication
              <span className="block text-[10px] font-normal text-red-500 dark:text-red-300/80 mt-0.5">Alerts will be sent to your doctor and emergency contacts if a dose is skipped.</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setExtractedData(null);
                setIsManual(false);
              }}
              className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
            >
              {isManual ? 'Cancel' : 'Re-Scan Image'}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Check className="w-5 h-5" />
              Send for Approval
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
