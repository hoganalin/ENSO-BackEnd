import { Outlet } from 'react-router-dom';
import MessageToast from '../components/MessageToast';

export default function FrontendLayout() {
  return (
    <>
      <MessageToast />
      <Outlet />
    </>
  );
}
