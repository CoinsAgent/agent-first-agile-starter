import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './bootstrap/app';
import './styles/style.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
