/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ManageProfiles from './pages/ManageProfiles';
import HealthReports from './pages/HealthReports';
import AIChatbot from './pages/AIChatbot';
import SymptomChecker from './pages/SymptomChecker';
import LiveConsultation from './pages/LiveConsultation';
import Emergency from './pages/Emergency';
import Navbar from './components/Navbar';
import Header from './components/Header';
import VoiceChatbot from './components/VoiceChatbot';
import OfflineMap from './components/OfflineMap';
import Sidebar from './components/Sidebar';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const mode = localStorage.getItem('mode') || 'light';
    const theme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-mode', mode);
    document.documentElement.setAttribute('data-theme', theme);
    
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen font-sans text-slate-900 dark:text-slate-100 bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
          {!user ? (
            <Navbar user={user} onMenuOpen={() => setIsSidebarOpen(true)} />
          ) : (
            <Header user={user} onLogout={handleLogout} onMenuOpen={() => setIsSidebarOpen(true)} />
          )}
          
          {/* Sidebar remains for secondary/tablet navigation if needed, but primary is Header */}
          <Sidebar 
            user={user} 
            onLogout={handleLogout} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
          
          <main className={`container mx-auto px-4 ${user ? 'pt-24 pb-8' : 'py-8'}`}>
            <Routes>
              <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to={user.role === 'doctor' ? '/doctor' : '/patient'} />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              
              <Route path="/patient" element={user?.role === 'patient' ? <PatientDashboard /> : <Navigate to="/login" />} />
              <Route path="/patient/map" element={user?.role === 'patient' ? <div className="space-y-6"><h1 className="text-3xl font-bold">Nearby Facilities</h1><OfflineMap /></div> : <Navigate to="/login" />} />
              <Route path="/patient/profiles" element={user?.role === 'patient' ? <ManageProfiles /> : <Navigate to="/login" />} />
              <Route path="/patient/reports" element={user?.role === 'patient' ? <HealthReports /> : <Navigate to="/login" />} />
              <Route path="/patient/chat" element={user?.role === 'patient' ? <AIChatbot /> : <Navigate to="/login" />} />
              <Route path="/patient/symptoms" element={user?.role === 'patient' ? <SymptomChecker /> : <Navigate to="/login" />} />
              <Route path="/patient/consultation" element={user?.role === 'patient' ? <LiveConsultation /> : <Navigate to="/login" />} />
              <Route path="/patient/emergency" element={user?.role === 'patient' ? <Emergency /> : <Navigate to="/login" />} />
              
              <Route path="/doctor/*" element={user?.role === 'doctor' ? <DoctorDashboard /> : <Navigate to="/login" />} />
              
              <Route path="/" element={<Navigate to={user ? (user.role === 'doctor' ? '/doctor' : '/patient') : '/login'} />} />
            </Routes>
          </main>
          <VoiceChatbot />
          <Toaster position="top-right" richColors />
        </div>
      </Router>
    </LanguageProvider>
  );
}
