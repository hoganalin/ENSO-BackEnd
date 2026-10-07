import { RouterProvider } from "react-router";

import MessageToast from "./components/MessageToast";
import routes from "./router/index.jsx";
function App() {
  return (
    <>
      <MessageToast />
      <RouterProvider router={routes}></RouterProvider>
    </>
  );
}

export default App;
