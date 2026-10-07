import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App.jsx';
import ShowcaseGate from './components/ShowcaseGate.jsx';
import store from './store/store';
import './assets/index.css';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ShowcaseGate><App /></ShowcaseGate>
    </Provider>
  </StrictMode>
);
