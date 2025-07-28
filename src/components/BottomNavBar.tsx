import { HomeIcon, QrCodeIcon } from '@heroicons/react/24/outline';

interface BottomNavBarProps {
  role: string;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export default function BottomNavBar({ role, currentView, setCurrentView }: BottomNavBarProps) {
  // ADMIN : Tableau de bord, Employés, QR Code, Personnel
  const adminNav = [
    { key: 'dashboard', icon: <span className="text-xl">📊</span>, label: 'Tableau de bord' },
    { key: 'employes', icon: <span className="text-xl">👥</span>, label: 'Employés' },
    { key: 'qrcode', icon: <span className="text-xl">📱</span>, label: 'QR Code', isCenter: true },
    { key: 'personnel', icon: <span className="text-xl">👤</span>, label: 'Personnel' },
  ];
  // EMPLOYE : Dashboard à gauche, Scanner au centre, Historique à droite
  const employeeNav = [
    { key: 'dashboard', icon: <span className="text-xl">📊</span>, label: 'Dashboard' },
    { key: 'scanner', icon: <span className="text-xl">📱</span>, label: 'Scanner', isCenter: true },
    { key: 'history', icon: <span className="text-xl">📋</span>, label: 'Historique' },
  ];
  const navItems = role === 'admin' ? adminNav : employeeNav;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg flex px-4 py-2 items-center justify-between w-[370px] border border-blue-100 z-50">
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`flex flex-col items-center justify-center transition text-xs font-medium ${
            item.isCenter
              ? `bg-blue-500 text-white rounded-full p-3 -mt-6 shadow-lg ${currentView === item.key ? 'ring-4 ring-blue-200' : ''}`
              : `${currentView === item.key ? 'text-blue-600 font-bold' : 'text-blue-500'} p-2`
          }`}
          onClick={() => setCurrentView(item.key)}
        >
          {item.icon}
          <span className="mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
} 