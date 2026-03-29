import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, MessageSquare, Bot, User, Loader2, Play, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { toast } from 'sonner';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const PRESETS = [
  "I'm feeling very anxious lately.",
  "I have a persistent headache.",
  "Can you explain my recent blood test results?",
  "I missed my medication dose today.",
  "What are the side effects of Metformin?"
];

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Spanish', code: 'es' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' }
];

export default function LiveConsultation() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current || !audioContextRef.current || !isAudioEnabled) {
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    
    source.start();
  }, [isAudioEnabled]);

  const startConsultation = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setTranscripts([]);

    try {
      // Check for API key if needed
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
        // Proceed after selection
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: `You are a professional medical consultant. Provide empathetic, clear, and helpful advice. 
          Current language: ${selectedLanguage.name}. Please respond in ${selectedLanguage.name}.
          Always include a disclaimer that you are an AI and not a replacement for a human doctor.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            toast.success("Consultation started");
          },
          onmessage: async (message: any) => {
            // Handle Audio Output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const base64Data = part.inlineData.data;
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const pcmData = new Int16Array(bytes.buffer);
                  audioQueueRef.current.push(pcmData);
                  playNextInQueue();
                }
                
                if (part.text) {
                  setTranscripts(prev => {
                    if (prev.length === 0) return [{ role: 'bot', text: part.text! }];
                    const last = prev[prev.length - 1];
                    if (last.role === 'bot') {
                      return [...prev.slice(0, -1), { role: 'bot', text: last.text + part.text }];
                    }
                    return [...prev, { role: 'bot', text: part.text! }];
                  });
                }
              }
            }

            // Handle User Transcription
            if (message.serverContent?.userTurn?.parts) {
              for (const part of message.serverContent.userTurn.parts) {
                if (part.text) {
                  setTranscripts(prev => {
                    if (prev.length === 0) return [{ role: 'user', text: part.text! }];
                    const last = prev[prev.length - 1];
                    if (last.role === 'user') {
                      return [...prev.slice(0, -1), { role: 'user', text: last.text + part.text }];
                    }
                    return [...prev, { role: 'user', text: part.text! }];
                  });
                }
              }
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => cleanup(),
          onerror: (err) => {
            console.error("Live API Error:", err);
            toast.error("Connection error. Please try again.");
            cleanup();
          }
        }
      });

      sessionRef.current = session;

      // Start Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isConnected || isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error("Setup Error:", err);
      toast.error("Could not access microphone or connect to AI.");
      cleanup();
    }
  };

  const sendText = (text: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({ text });
      setTranscripts(prev => [...prev, { role: 'user', text }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 dark:text-white">Live AI Consultation</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Real-time voice interaction for immediate health guidance.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedLanguage.code}
            onChange={(e) => setSelectedLanguage(LANGUAGES.find(l => l.code === e.target.value)!)}
            disabled={isConnected || isConnecting}
            className="bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          {isConnected ? (
            <button 
              onClick={cleanup}
              className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              <PhoneOff size={20} />
              End Session
            </button>
          ) : (
            <button 
              onClick={startConsultation}
              disabled={isConnecting}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isConnecting ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
              Start Consultation
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        {/* Main Interaction Area */}
        <div className="md:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  {isConnected ? 'Live Session Active' : 'Waiting to Connect'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!isConnected}
                  className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  disabled={!isConnected}
                  className={`p-2 rounded-xl transition-all ${!isAudioEnabled ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  {!isAudioEnabled ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <Bot size={40} className="text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 dark:text-slate-400 dark:text-slate-300">No active conversation</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Start a session to begin your consultation.</p>
                  </div>
                </div>
              ) : (
                transcripts.map((t, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${t.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-300'}`}>
                        {t.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${t.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700/50 dark:border-slate-700'}`}>
                        {t.text}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {isConnected && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    className="flex-1 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        sendText(target.value);
                        target.value = '';
                      }
                    }}
                  />
                  <button className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all">
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Presets & Info Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Quick Presets</h3>
            <div className="space-y-2">
              {PRESETS.map((preset, i) => (
                <button 
                  key={i}
                  onClick={() => sendText(preset)}
                  disabled={!isConnected}
                  className="w-full text-left p-3 rounded-xl text-sm text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 dark:text-slate-400 disabled:hover:border-transparent"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30 space-y-3">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Real-time Processing
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
              Our AI uses high-performance streaming to ensure zero-latency responses. Your audio is processed in real-time for immediate feedback.
            </p>
          </div>

          <div className="bg-slate-900 dark:bg-black p-6 rounded-3xl text-white space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Privacy Note</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This session is encrypted and private. Transcriptions are only used to improve the current consultation and are not stored permanently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
