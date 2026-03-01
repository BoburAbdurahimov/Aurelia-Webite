import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-marble text-espresso font-heading text-2xl">Aurelia...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
