/**
 * Utility for caching data in localStorage to enable "offline" feel and faster loads.
 */

export const cache = {
  set: (key: string, data: any, ttl: number = 3600000) => { // Default TTL 1 hour
    const item = {
      data,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(`medisync_cache_${key}`, JSON.stringify(item));
  },

  get: (key: string) => {
    const itemStr = localStorage.getItem(`medisync_cache_${key}`);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(`medisync_cache_${key}`);
      return null;
    }
    return item.data;
  },

  remove: (key: string) => {
    localStorage.removeItem(`medisync_cache_${key}`);
  },

  clear: () => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('medisync_cache_'))
      .forEach(key => localStorage.removeItem(key));
  }
};

// Presets for faster initial experience
export const PRESETS = {
  HOSPITALS: [
    { id: 1, name: "Aster Ramesh Hospital", lat: 16.3067, lng: 80.4365, type: "hospital", rating: 4.8, phone: "+91 863 237 7777" },
    { id: 2, name: "KIMS-SIKHARA Hospitals", lat: 16.3120, lng: 80.4420, type: "hospital", rating: 4.8, phone: "+91 76996 99499" },
    { id: 4, name: "Sreshta Hospitals", lat: 16.2950, lng: 80.4450, type: "specialty", rating: 4.9, phone: "+91 863 352 5252" }
  ]
};

