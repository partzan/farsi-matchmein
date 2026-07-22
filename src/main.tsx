import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, minimum: 0.2 });

let activeRequests = 0;
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  activeRequests++;
  if (activeRequests === 1) {
    NProgress.start();
  }
  try {
    return await originalFetch(...args);
  } finally {
    activeRequests--;
    if (activeRequests === 0) {
      setTimeout(() => {
        if (activeRequests === 0) {
          NProgress.done();
        }
      }, 200);
    }
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
