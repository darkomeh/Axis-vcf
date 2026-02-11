import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { VcfService } from '../services/vcfService';
import { User, AppSettings, GroupLink } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
const RefreshIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>);

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [groups, setGroups] = useState<GroupLink[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'contacts'>('dashboard');
  const [targetInput, setTargetInput] = useState<string>('');
  const [isCloud, setIsCloud] = useState(false);

  useEffect(() => {
    setIsCloud(StorageService.isCloudEnabled());
    if (isAuthenticated) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => { 
      if (settings) setTargetInput(String(settings.targetCount)); 
  }, [settings?.targetCount]);

  const refreshData = async () => {
    const u = await StorageService.getUsers();
    setUsers(u);
    const s = await StorageService.getSettings();
    setSettings(s);
    const g = await StorageService.getGroups();
    setGroups(g);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1') { setIsAuthenticated(true); setLoginError(''); }
    else { setLoginError('INVALID_ACCESS_KEY'); setPassword(''); }
  };

  const downloadVcfBatch = (batchIndex: number, batchUsers: User[]) => {
    const content = VcfService.generateFileContent(batchUsers);
    VcfService.downloadBlob(content, `Λ𝗫𝗜𝗦_VCF_BATCH_${batchIndex + 1}.vcf`);
  };

  const downloadAll = () => {
    const content = VcfService.generateFileContent(users);
    VcfService.downloadBlob(content, `Λ𝗫𝗜𝗦_VCF_COMPLETE_EXPORT.vcf`);
  };

  const updateTargetCount = async () => {
      const val = parseInt(targetInput);
      if (!isNaN(val)) { await StorageService.updateSettings({ targetCount: val }); refreshData(); }
  };

  const handleGroupUpdate = async (id: string, field: keyof GroupLink, value: any) => {
    const updated = groups.map(g => {
        if (g.id === id) return { ...g, [field]: value };
        if (field === 'isActive' && value === true) return { ...g, isActive: false };
        return g;
    });
    setGroups(updated); // Optimistic UI
    await StorageService.updateGroups(updated);
  };

  const handleReset = async () => {
      const confirm = window.confirm("⚠️ DANGER: SYSTEM PURGE \n\nThis will PERMANENTLY DELETE all collected numbers and reset the campaign statistics.\n\nAre you sure you want to initialize a new VCF drop?");
      if (confirm) {
          await StorageService.resetCampaign();
          refreshData();
          alert("System Purged. Protocol Reset Complete.");
      }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-axis-dark">
        <motion.form initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleLogin} className="glass-panel p-10 rounded-3xl w-full max-w-sm text-center">
          <div className="text-3xl font-black mb-1 font-mono tracking-tighter text-white">Λ𝗫𝗜𝗦 <span className="text-axis-neon">CMD</span></div>
          <p className="text-[10px] text-gray-500 mb-8 font-mono tracking-widest">AUTHENTICATION_V3_REQUIRED</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 mb-4 rounded-xl focus:border-axis-neon outline-none text-center font-mono text-white tracking-[0.5em]" placeholder="••••" autoFocus />
          {loginError && <div className="text-red-400 text-[10px] mb-4 font-mono">{loginError}</div>}
          <button className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-axis-neon transition-all tracking-widest uppercase text-xs">Authorize Access</button>
          <button type="button" onClick={() => window.location.hash = ''} className="mt-8 text-[10px] text-gray-600 hover:text-white uppercase tracking-widest">Abort Process</button>
        </motion.form>
      </div>
    );
  }

  if (!settings) return <div className="p-10 text-center">LOADING DATA STREAM...</div>;

  const regularUsers = users.filter(u => !u.isOverflow);
  const overflowUsers = users.filter(u => u.isOverflow);
  const batches: User[][] = [];
  for (let i = 0; i < regularUsers.length; i += 100) batches.push(regularUsers.slice(i, i + 100));

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-white/10 gap-6">
        <div>
            <h1 className="text-3xl font-black text-white font-mono tracking-tighter">Λ𝗫𝗜𝗦 COMMAND CENTER</h1>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-axis-neon font-mono tracking-widest uppercase">Administrator Session: [ONLINE]</p>
                {!isCloud && <span className="text-[9px] bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-500/30">OFFLINE MODE (NO SYNC)</span>}
            </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all border ${activeTab === 'dashboard' ? 'bg-axis-neon text-black border-axis-neon' : 'bg-white/5 border-white/10 text-gray-500'}`}>Stats</button>
            <button onClick={() => setActiveTab('contacts')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all border ${activeTab === 'contacts' ? 'bg-axis-neon text-black border-axis-neon' : 'bg-white/5 border-white/10 text-gray-500'}`}>Nodes</button>
            <button onClick={() => setActiveTab('groups')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all border ${activeTab === 'groups' ? 'bg-axis-neon text-black border-axis-neon' : 'bg-white/5 border-white/10 text-gray-500'}`}>Groups</button>
            <button onClick={() => setIsAuthenticated(false)} className="px-5 py-2.5 text-red-500 text-xs font-bold border border-red-500/20 rounded-xl hover:bg-red-500/10">Exit</button>
        </div>
      </header>
      
      {!isCloud && (
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-center">
              <h3 className="text-yellow-500 font-bold text-xs uppercase tracking-widest mb-1">Database Not Connected</h3>
              <p className="text-gray-400 text-[10px] font-mono">Data is only saved on this device. To sync with other users, configure <code>SUPABASE_CONFIG</code> in <code>types.ts</code>.</p>
          </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-4">Node Count</div>
                    <div className="text-6xl font-black text-white font-mono tracking-tighter">{users.length}</div>
                    <div className="mt-6 flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/5 pt-4">
                        <span>Standard: {regularUsers.length}</span>
                        <span className="text-red-400">Overflow: {overflowUsers.length}</span>
                    </div>
                </div>

                <div className="glass-panel p-8 rounded-3xl col-span-1 md:col-span-2">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-6">System Control</div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-mono text-gray-400">Target Capacity</span>
                            <div className="flex items-center gap-2">
                                <input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="bg-transparent text-white font-mono w-16 text-right outline-none border-b border-white/20 focus:border-axis-neon" />
                                <button onClick={updateTargetCount} className="px-3 py-1 bg-axis-neon/10 text-axis-neon text-[10px] font-bold rounded-lg border border-axis-neon/20 uppercase">Update</button>
                            </div>
                        </div>
                        <button onClick={async () => { await StorageService.updateSettings({ isSystemLocked: !settings.isSystemLocked }); refreshData(); }} className={`flex-1 p-4 rounded-2xl font-black tracking-widest uppercase text-xs transition-all ${settings.isSystemLocked ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}>
                            {settings.isSystemLocked ? 'Unlock Entry' : 'Lock Entry'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-gray-400 text-xs font-mono uppercase tracking-[0.3em]">Distribution Packages</h3>
                    <button onClick={downloadAll} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black rounded-lg hover:bg-axis-neon transition-all uppercase tracking-widest">
                        <DownloadIcon /> Export All
                    </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {batches.map((batch, idx) => (
                        <button key={idx} onClick={() => downloadVcfBatch(idx, batch)} className="flex flex-col items-center justify-center p-6 border border-white/10 rounded-2xl bg-black/20 hover:border-axis-neon transition-all group">
                            <div className="text-axis-neon mb-3 group-hover:scale-125 transition-transform"><DownloadIcon /></div>
                            <span className="font-mono text-xs text-white">PK_0{idx + 1}</span>
                            <span className="text-[9px] text-gray-600 mt-1 uppercase">({batch.length} nodes)</span>
                        </button>
                    ))}
                    {users.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <p className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">Database Clean. Awaiting Input.</p>
                        </div>
                    )}
                    {overflowUsers.length > 0 && (
                        <button onClick={() => { const content = VcfService.generateFileContent(overflowUsers); VcfService.downloadBlob(content, `Λ𝗫𝗜𝗦_VCF_OVERFLOW.vcf`); }} className="flex flex-col items-center justify-center p-6 border border-red-500/20 rounded-2xl bg-red-900/5 hover:bg-red-900/20 transition-all group">
                            <div className="text-red-400 mb-3 group-hover:scale-125 transition-transform"><DownloadIcon /></div>
                            <span className="font-mono text-xs text-red-400 uppercase">Overflow</span>
                            <span className="text-[9px] text-gray-600 mt-1 uppercase">({overflowUsers.length} nodes)</span>
                        </button>
                    )}
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="border border-red-500/10 rounded-3xl p-8 bg-red-900/5 mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-red-500 text-xs font-mono uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><TrashIcon /> Protocol Reset</h3>
                        <p className="text-[10px] text-gray-500 font-mono">Irreversible action. Clears all collected node data to start a fresh VCF cycle.</p>
                    </div>
                    <button onClick={handleReset} className="px-8 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                         Reset System (Delete Data)
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'contacts' && (
          <div className="glass-panel rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-white/5 text-gray-500 font-mono uppercase tracking-widest border-b border-white/5">
                          <tr>
                              <th className="p-6">Index</th>
                              <th className="p-6">Identifier</th>
                              <th className="p-6">Node</th>
                              <th className="p-6">Timestamp</th>
                              <th className="p-6 text-right">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                          {users.map((user, idx) => (
                              <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-6 text-gray-600">#{idx + 1}</td>
                                  <td className="p-6 text-white font-bold group-hover:text-axis-neon">{user.name}</td>
                                  <td className="p-6 text-gray-400">{user.phone}</td>
                                  <td className="p-6 text-[10px] text-gray-700">{new Date(user.timestamp).toLocaleString()}</td>
                                  <td className="p-6 text-right">
                                      {user.isOverflow ? <span className="text-red-500">O_FLOW</span> : <span className="text-axis-neon">VALID</span>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'groups' && (
        <div className="glass-panel p-8 rounded-3xl space-y-6">
            <h3 className="text-gray-400 text-xs font-mono uppercase tracking-[0.3em] mb-4">Node Destination Manager</h3>
            <div className="space-y-4">
                {groups.map((group) => (
                    <div key={group.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border border-white/5 rounded-2xl bg-black/40">
                        <div className="md:col-span-3 space-y-4">
                            <div className="flex gap-4">
                                <input className="bg-transparent border-b border-white/10 text-3xl focus:border-axis-neon outline-none w-16 text-center" value={group.emoji} onChange={(e) => handleGroupUpdate(group.id, 'emoji', e.target.value)} />
                                <input className="flex-1 bg-transparent border-b border-white/10 p-2 focus:border-axis-neon outline-none text-xl font-bold" value={group.name} onChange={(e) => handleGroupUpdate(group.id, 'name', e.target.value)} placeholder="Target Name" />
                            </div>
                            <input className="w-full bg-transparent border-b border-white/10 p-2 text-xs font-mono text-gray-500 focus:text-axis-neon outline-none" value={group.url} onChange={(e) => handleGroupUpdate(group.id, 'url', e.target.value)} placeholder="PROTOCOL_URL_HTTPS" />
                        </div>
                        <div className="flex items-center justify-end">
                            <button onClick={() => handleGroupUpdate(group.id, 'isActive', true)} className={`w-full py-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all ${group.isActive ? 'bg-axis-neon text-black' : 'bg-white/5 text-gray-600 border border-white/5 hover:border-white/20'}`}>
                                {group.isActive ? 'Active Node' : 'Set Active'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};