import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      <Header />
      <main className="ml-56 mt-14 p-6">
        <Outlet />
      </main>
    </div>
  );
}
