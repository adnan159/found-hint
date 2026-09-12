import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store";

const mountEl = document.getElementById("fhint-app");

if (mountEl) {
  const root = createRoot(mountEl);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}
