import { motion } from "framer-motion";

type ViewType = 'dashboard' | 'employes' | 'qrcode' | 'personnel' | 'history' | 'scanner';

interface NavItem {
  key: ViewType;
  icon: string;
  label: string;
  isCenter?: boolean;
}

interface NavBarProps {
  role: 'admin' | 'employee';
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const navVariants = {
  initial: { y: 80, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 200, 
      damping: 20 
    } 
  },
};

export default function ModernNavBar({ role, currentView, setCurrentView }: NavBarProps) {
  const adminNav: NavItem[] = [
    { key: 'dashboard', icon: '📊', label: 'Tableau' },
    { key: 'employes', icon: '👥', label: 'Employés' },
    { key: 'qrcode', icon: '📱', label: 'QR Code', isCenter: true },
    { key: 'personnel', icon: '👤', label: 'Personnel' },
    { key: 'history', icon: '📋', label: 'Historique' },
  ];
  
  const employeeNav: NavItem[] = [
    { key: 'dashboard', icon: '📊', label: 'Accueil' },
    { key: 'scanner', icon: '📱', label: 'Scanner', isCenter: true },
    { key: 'history', icon: '📋', label: 'Historique' },
  ];
  
  const navItems = role === 'admin' ? adminNav : employeeNav;

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50"
      variants={navVariants}
      initial="initial"
      animate="animate"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        minHeight: '4rem',
      }}
      aria-label="Navigation principale"
    >
      <div className="max-w-md mx-auto px-2">
        <div className="flex justify-between items-center h-16">
          {navItems.map((item) => (
            <motion.button
              key={item.key}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center h-full px-1 sm:px-2 w-full ${
                currentView === item.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              } ${item.isCenter ? 'flex-[1.5]' : 'flex-1'}`}
              onClick={() => setCurrentView(item.key)}
              aria-label={item.label}
              aria-current={currentView === item.key ? 'page' : undefined}
            >
              {item.isCenter ? (
                <motion.span 
                  className="absolute -top-5 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-hidden="true"
                >
                  {item.icon}
                </motion.span>
              ) : (
                <span className="text-2xl sm:text-2xl mb-1" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              
              <span className={`text-xs sm:text-xs font-medium ${
                currentView === item.key ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
              
              {currentView === item.key && (
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full"
                  layoutId="activeNav"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
