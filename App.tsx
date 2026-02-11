import React, { useState, useEffect } from 'react';
import { PublicView } from './components/PublicView';
import { AdminPanel } from './components/AdminPanel';
import { BackgroundParticles } from './components/BackgroundParticles';
import { StorageService } from './services/storageService';

const App: React.FC = () => {
  // Always start at home route
  const [currentRoute, setCurrentRoute] = useState<string>('home');

  useEffect(() => {
    // Initialize storage
    StorageService.init();

    // On mount, if the hash is #admin, clear it so the user starts at the landing page.
    // This prevents the app from getting stuck in the admin view on refresh.
    if (window.location.hash === '#admin') {
      try {
        // Attempt to clear hash without adding history entry.
        // We use ' ' (space) as the URL which acts as a relative path to clear the hash
        // without triggering complex origin checks that fail in Blob/Sandbox environments.
        window.history.replaceState(null, document.title, ' ');
      } catch (e) {
        // Fallback: This works everywhere but might add a history entry.
        // It effectively removes #admin, ensuring the user sees the PublicView.
        window.location.hash = '';
      }
    }

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen relative font-sans text-gray-200 selection:bg-axis-neon selection:text-black overflow-x-hidden">
      <BackgroundParticles />
      
      <main className="relative z-10 w-full min-h-screen flex flex-col">
        {currentRoute === 'admin' ? (
          <AdminPanel />
        ) : (
          <PublicView />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 py-6 text-center text-xs text-gray-600 border-t border-white/5 bg-black/50 backdrop-blur-sm">
        <p>Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀™ &copy; {new Date().getFullYear()} — Where Tech meets Innovation ⚡🛠️</p>
      </footer>
    </div>
  );
};

export default App;