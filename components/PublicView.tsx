import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { CONSTANTS, AppSettings, GroupLink } from '../types';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

// Icons
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
);
const ExternalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

const AnimatedCounter = ({ value = 0 }: { value: number }) => {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 20 });
  const display = useTransform(spring, (current) => Math.round(current));
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
};

export const PublicView: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeGroup, setActiveGroup] = useState<GroupLink | undefined>(undefined);
  const [countdown, setCountdown] = useState<string>('');

  const fetchData = async () => {
      const s = await StorageService.getSettings();
      setSettings(s);
      
      const g = await StorageService.getActiveGroup();
      setActiveGroup(g);

      if (s.isCountdownActive && s.countdownStartTime) {
        StorageService.checkCountdownStatus();
        const remaining = Math.max(0, CONSTANTS.COUNTDOWN_DURATION_MS - (Date.now() - s.countdownStartTime));
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Polling every 2s to catch updates from other users
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    
    try {
      const result = await StorageService.addUser(name, phone);
      if (result.success) {
          setSubmitted(true);
          fetchData();
      } else {
          setError(result.message);
      }
    } catch (e) {
        setError("Connection failed.");
    } finally {
        setLoading(false);
    }
  };

  const handleShare = async () => {
    const data = { title: 'Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀™', text: 'Secure your spot in the next VCF drop.', url: window.location.href };
    if (navigator.share) try { await navigator.share(data); } catch { /* ignore */ }
    else { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }
  };

  if (!settings) return null;

  const currentCount = settings.totalCollected;
  const targetCount = settings.targetCount;
  const progressPercent = Math.min(100, (currentCount / targetCount) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8 relative">
      <button onClick={() => window.location.hash = 'admin'} className="absolute top-4 right-4 z-40 p-2 text-white/5 hover:text-axis-neon transition-all opacity-40 hover:opacity-100">
        <ShieldIcon />
      </button>

      {/* Community Aura Header Badge */}
      <motion.a 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        href="https://whatsapp.com/channel/0029VbC0knY72WU0QUNAid3B"
        target="_blank"
        className="mb-8 flex items-center gap-3 px-5 py-2 bg-white/5 border border-white/10 rounded-full hover:border-axis-neon/50 transition-all group"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-axis-neon animate-pulse shadow-[0_0_8px_rgba(0,243,255,0.6)]" />
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Join Official Community</span>
        <ExternalIcon />
      </motion.a>

      <AnimatePresence>
        {settings.isCountdownActive && (
          <motion.div initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }} className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 backdrop-blur-xl text-white py-3 px-4 text-center font-mono font-bold text-[10px] tracking-[0.3em] border-b border-red-400/20">
            [ EMERGENCY ] SYSTEM LOCKDOWN INITIATED : {countdown}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-8 max-w-xl w-full flex flex-col items-center">
        <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-7xl md:text-9xl font-black mb-2 text-white font-mono tracking-tighter drop-shadow-2xl">
          Λ𝗫𝗜𝗦
        </motion.h1>
        <p className="text-axis-neon font-mono text-[11px] tracking-[0.6em] mb-12 opacity-80 font-bold uppercase">
          Elite Intelligence Node ⚡
        </p>

        {/* Sleek, Smaller Progress Bar */}
        <div className="w-full max-w-[320px] bg-black/40 border border-white/5 px-6 py-4 rounded-2xl">
            <div className="flex justify-between items-end mb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 font-bold">Network Capacity</span>
                <div className="text-right">
                    <span className="text-xl font-bold font-mono text-white tracking-tighter"><AnimatedCounter value={currentCount} /></span>
                    <span className="text-gray-600 font-mono text-[10px]"> / {targetCount}</span>
                </div>
            </div>
            <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ${progressPercent >= 100 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-axis-neon shadow-[0_0_10px_rgba(0,243,255,0.5)]'}`}
                />
            </div>
        </div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl relative overflow-hidden border border-white/10">
        {settings.isSystemLocked ? (
          <div className="text-center py-8">
            <div className="flex justify-center text-red-500 mb-6 scale-150 opacity-40"><LockIcon /></div>
            <h2 className="text-2xl font-black text-white mb-2 font-mono tracking-tight uppercase">Access Locked</h2>
            <p className="text-gray-500 text-xs mb-8 font-mono leading-relaxed">Network saturation reached 100%. Master protocol entries are currently encrypted.</p>
            <a href="https://whatsapp.com/channel/0029VbC0knY72WU0QUNAid3B" target="_blank" className="block w-full py-4 bg-white/5 border border-axis-neon text-axis-neon rounded-xl font-black text-[10px] tracking-[0.3em] uppercase hover:bg-axis-neon hover:text-black transition-all">Monitor Community Feed</a>
          </div>
        ) : submitted ? (
          <div className="text-center py-6 space-y-8">
            <motion.div initial={{ scale: 0.5, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="w-20 h-20 bg-axis-neon/10 rounded-full flex items-center justify-center mx-auto text-axis-neon border border-axis-neon/30">
              <CheckCircleIcon />
            </motion.div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white font-mono tracking-tighter uppercase">Entry Verified</h2>
              <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase">Node successfully indexed.</p>
            </div>
            {activeGroup && (
              <a href={activeGroup.url} target="_blank" className="block w-full py-5 bg-axis-neon hover:bg-axis-neon/90 text-black rounded-xl font-black transition-all shadow-2xl flex items-center justify-center gap-2 text-xs tracking-[0.3em] uppercase">
                {activeGroup.emoji} JOIN {activeGroup.name.toUpperCase()}
              </a>
            )}
            <button onClick={handleShare} className="w-full py-2 text-gray-500 hover:text-white transition-colors text-[9px] font-mono uppercase tracking-[0.5em] flex items-center justify-center gap-2">
                <ShareIcon /> Share Node Link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] block ml-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white focus:border-axis-neon focus:bg-white/5 outline-none transition-all placeholder:text-gray-800 font-mono text-sm" placeholder="INPUT_IDENTIFIER" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] block ml-1">WhatsApp Contact Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white focus:border-axis-neon focus:bg-white/5 outline-none transition-all placeholder:text-gray-800 font-mono text-sm" placeholder="+234..." required />
            </div>
            {error && <div className="text-red-400 text-[9px] bg-red-900/10 p-4 rounded-xl border border-red-500/20 font-mono text-center uppercase tracking-widest">{error}</div>}
            <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl font-black tracking-[0.5em] transition-all relative overflow-hidden text-[11px] uppercase shadow-2xl ${loading ? 'bg-gray-800 text-gray-600' : 'bg-white text-black hover:bg-axis-neon'}`}>
                {loading ? <LoaderIcon /> : 'Secure Spot'}
            </button>
            <p className="text-[9px] text-gray-700 text-center font-mono uppercase tracking-[0.2em] leading-relaxed px-4">
                By securing your spot, you consent to encrypted data indexing for future distribution.
            </p>
          </form>
        )}
      </motion.div>

      {/* Footer Branding Subtitle */}
      <div className="mt-12 opacity-20 group hover:opacity-100 transition-opacity">
        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.8em] text-center">Protocol_AES_256_Active</p>
      </div>
    </div>
  );
};