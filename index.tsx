import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StorageService } from './services/storageService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Ensure storage is initialized before any components try to access it
StorageService.init();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);