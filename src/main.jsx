import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // React Router qo'shildi
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// Google Cloud Console'dan olgan Client ID
const GOOGLE_CLIENT_ID = "747437008618-mdehjakbkdr2r5s38eb0tj5qmj58s8vn.apps.googleusercontent.com"; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);