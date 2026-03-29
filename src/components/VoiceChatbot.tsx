import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Mic, Send, X, Bot, Globe, Activity, Volume2, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from '../context/LanguageContext';

export default function VoiceChatbot() {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<any>(null);

  // Initialize greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = t('bot_greeting');
      setMessages([{ id: 1, text: greeting, sender: 'bot' }]);
      speakText(greeting);
    }
  }, [isOpen, language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopVAD();
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      // Map 'hi' to hi-IN, 'en' to en-US
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsgId = Date.now();
    const newMessages = [...messages, { id: userMsgId, text, sender: 'user' }];
    setMessages(newMessages);
    setInput('');

    // Show thinking state
    const botMsgId = Date.now() + 1;
    setMessages(prev => [...prev, { id: botMsgId, text: t('bot_analyzing'), sender: 'bot', isLoading: true }]);

    try {
      const token = localStorage.getItem('token');
      // Construct history for Gemini
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text, history })
      });

      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, { id: Date.now() + 2, text: data.text, sender: 'bot' }];
      });

      speakText(data.text);
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI assistant");
      setMessages(prev => prev.filter(m => !m.isLoading));
    }
  };

  const startVAD = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const vol = Math.min(100, (average / 128) * 100);
        setVolume(vol);

        // VAD Logic: If volume is above threshold, reset the silence timer
        if (vol > 15) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (!silenceTimerRef.current && isListening) {
          // If silence detected for 1.5 seconds, auto-stop and send
          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              silenceTimerRef.current = null;
            }
          }, 1500);
        }

        if (isListening) requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("VAD initialization failed", err);
    }
  };

  const stopVAD = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    window.speechSynthesis.cancel(); // Stop talking when user starts talking

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      startVAD();
      toast.info(t('bot_vad_active'));
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setInput(event.results[i][0].transcript);
        }
      }
      if (finalTranscript) {
        setInput(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      stopVAD();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopVAD();
      // Auto-send if we have input
      setInput(prev => {
        if (prev.trim()) {
          handleSend(prev);
          return '';
        }
        return prev;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 group"
      >
        <AnimatePresence mode="wait">
          {isSpeaking ? (
            <motion.div
              key="speaking"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Volume2 className="w-8 h-8 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <MessageSquare className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-96 h-[560px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
          >
            <div className="p-5 bg-primary text-white flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-lg">{t('bot_name')}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Gemini Powered</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setIsOpen(false); window.speechSynthesis.cancel(); if (recognitionRef.current) recognitionRef.current.stop(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="flex items-center justify-between bg-white/10 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
                  <Globe size={14} /> {t('bot_language')}
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-white text-primary' : 'bg-white/10 text-white'}`}
                   >EN</button>
                   <button 
                    onClick={() => setLanguage('hi')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'hi' ? 'bg-white text-primary' : 'bg-white/10 text-white'}`}
                   >हिं</button>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    m.isLoading ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 animate-pulse rounded-bl-sm' :
                    m.sender === 'user' ? 'bg-primary text-white rounded-br-sm shadow-lg shadow-primary/10' :
                    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm rounded-bl-sm border border-slate-100 dark:border-slate-800'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 gap-3 flex flex-col">
              {isListening && (
                <div className="flex items-center gap-4 px-2 py-1">
                   <div className="flex items-end gap-1 h-8 flex-1">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: `${Math.max(10, volume * (0.3 + Math.random() * 0.7))} %` }}
                          className="w-1 bg-primary rounded-full"
                        />
                      ))}
                   </div>
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">VAD ACTIVE</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-4 rounded-2xl transition-all relative ${isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`}
                >
                  <Mic className="w-5 h-5" />
                  {isListening && <motion.div layoutId="mic-active" className="absolute inset-0 border-4 border-red-500 rounded-2xl scale-125 opacity-30" animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity }} />}
                </button>
                <input
                  type="text"
                  placeholder={t('bot_placeholder')}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100 transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim()}
                  className="p-4 bg-primary text-white rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
