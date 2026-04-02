import { RouterProvider } from 'react-router-dom';

import router from './router.jsx';
//路由配置
// App為用程式入口;
function App() {
  return <RouterProvider router={router} />;
}
export default App;
