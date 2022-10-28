import React from 'react';
import { createRoot } from 'react-dom/client';

import { DndExampleApp as App } from './example';

const root = createRoot(document.getElementById('root'));

root.render(<App />);
