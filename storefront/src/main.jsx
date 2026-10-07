import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./assets/all.scss";
import "./assets/layout-tokens.css";
import './interview.css';

import App from "./App.jsx";
import ShowcaseGate from './components/ShowcaseGate.jsx';
import { store } from "./store/store.js";

import "bootstrap/dist/js/bootstrap.bundle.min.js";
//引入swiper scss
import "swiper/css";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <ShowcaseGate><App /></ShowcaseGate>
    </Provider>
  </StrictMode>,
);
