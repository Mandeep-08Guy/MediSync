import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, User, Navigation, Loader2 } from 'lucide-react';
import { PRESETS } from '../lib/cache';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: 'hospital' | 'clinic' | 'doctor' | 'specialty';
  rating?: number;
  reviews?: number;
  phone?: string;
  specialties?: string[];
}


const OfflineMap: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>(PRESETS.HOSPITALS as any);
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default to Bangalore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.warn("Geolocation failed, using default.");
        }
      );
    }

    // Fetch nearby hospitals from API
    const fetchHospitals = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/nearby', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error("Failed to fetch hospitals:", error);
        // Fallback to presets already set in initial state
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const LocationMarker = () => {
    const map = useMap();
    useEffect(() => {
      map.flyTo(userLocation, map.getZoom());
    }, [userLocation, map]);

    return (
      <Marker position={userLocation}>
        <Popup>You are here</Popup>
      </Marker>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading map...</div>;

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <MapContainer center={userLocation} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup minWidth={200}>
              <div className="p-2 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-900 leading-tight">{loc.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500">
                    <span className="text-xs font-bold mr-1">{loc.rating || '4.5'}</span>
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loc.reviews || '0'} reviews</span>
                </div>

                {loc.specialties && (
                  <div className="flex flex-wrap gap-1">
                    {loc.specialties.map((s, i) => (
                      <span key={i} className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s}</span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <a href={`tel:${loc.phone}`} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase text-center py-2 rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-1">
                    Call Now
                  </a>
                  <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all">
                    <Navigation size={14} />
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
      
      <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md border border-gray-100 max-w-[200px]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Nearby Facilities</h4>
        <div className="space-y-2">
          {locations.map(loc => (
            <div key={loc.id} className="flex items-center gap-2 text-sm">
              <Hospital size={14} className="text-blue-600" />
              <span className="truncate">{loc.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfflineMap;
