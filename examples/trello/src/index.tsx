import React from 'react';
import { createRoot } from 'react-dom/client';

import { TrelloApp as App } from './app';

createRoot(document.getElementById('root')).render(<App />);
