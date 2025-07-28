
import { motion } from "framer-motion";

interface BottomNavBarProps {
  role: string;
  currentView: string;
  setCurrentView: (view: string) => void;
}

const navVariants = {
  initial: { y: 80, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 200, damping: 20 } },
};

export default function ModernBottomNavBar({ role, currentView, setCurrentView }: BottomNavBarProps) {
  const adminNav = [
    { key: 'dashboard', icon: <span className="text-2xl">📊</span>, label: 'Tableau de bord' },
    { key: 'employes', icon: <span className="text-2xl">👥</span>, label: 'Employés' },
    { key: 'qrcode', icon: <span className="text-2xl">📱</span>, label: 'QR Code', isCenter: true },
    { key: 'personnel', icon: <span className="text-2xl">👤</span>, label: 'Personnel' },
  ];
  const employeeNav = [
    { key: 'dashboard', icon: <span className="text-2xl">📊</span>, label: 'Dashboard' },
    { key: 'scanner', icon: <span className="text-2xl">📱</span>, label: 'Scanner', isCenter: true },
    { key: 'history', icon: <span className="text-2xl">📋</span>, label: 'Historique' },
  ];
  const navItems = role === 'admin' ? adminNav : employeeNav;

  return (
    <motion.nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      variants={navVariants}
      initial="initial"
      animate="animate"
    >
      <div className="button-container-navbar">
        {navItems.map((item) => (
          <motion.button
            key={item.key}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.12 }}
            className={`button-navbar ${item.isCenter ? 'button-navbar-center' : ''} ${currentView === item.key ? 'button-navbar-active' : ''}`}
            onClick={() => setCurrentView(item.key)}
            title={item.label}
          >
            <span className="icon-navbar">{item.icon}</span>
          </motion.button>
        ))}
      </div>
      <style>{`
        .button-container-navbar {
          display: flex;
          background: linear-gradient(90deg, #4f8cff 60%, #7c3aed 100%);
          width: 270px;
          height: 56px;
          align-items: center;
          justify-content: space-around;
          border-radius: 16px;
          box-shadow: rgba(0,0,0,0.18) 0px 5px 15px, rgba(76, 110, 245, 0.25) 5px 10px 15px;
          padding: 0 10px;
        }
        .button-navbar {
          outline: 0 !important;
          border: 0 !important;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.3s cubic-bezier(.4,2,.6,1);
          cursor: pointer;
          box-shadow: none;
        }
        .button-navbar-center {
          background: #fff;
          color: #4f8cff;
          box-shadow: 0 2px 8px 0 rgba(76, 110, 245, 0.15);
          border: 2px solid #7c3aed22;
        }
        .button-navbar:hover {
          transform: translateY(-4px) scale(1.08);
          background: rgba(255,255,255,0.08);
        }
        .button-navbar-active {
          background: rgba(255,255,255,0.18);
          color: #fff;
        }
        .icon-navbar {
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 500px) {
          .button-container-navbar { width: 98vw; min-width: 0; }
        }
      `}</style>
    </motion.nav>
  );
}
