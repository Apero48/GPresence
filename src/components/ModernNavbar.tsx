import { motion } from "framer-motion";

interface NavBarProps {
  role: string;
  currentView: string;
  setCurrentView: (view: string) => void;
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
  const adminNav = [
    { key: 'dashboard', icon: '📊', label: 'Tableau' },
    { key: 'employes', icon: '👥', label: 'Employés' },
    { key: 'qrcode', icon: '📱', label: 'QR Code', isCenter: true },
    { key: 'personnel', icon: '👤', label: 'Personnel' },
    { key: 'history', icon: '📋', label: 'Historique' },
  ];
  
  const employeeNav = [
    { key: 'dashboard', icon: '📊', label: 'Accueil' },
    { key: 'scanner', icon: '📱', label: 'Scanner', isCenter: true },
    { key: 'history', icon: '📋', label: 'Historique' },
  ];
  
  const navItems = role === 'admin' ? adminNav : employeeNav;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50"
      variants={navVariants}
      initial="initial"
      animate="animate"
      style={{
        // Ajout d'un padding en bas pour les appareils avec des encoches
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // Hauteur minimale pour les appareils tactiles
        minHeight: '4rem',
      }}
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
            >
              {item.isCenter ? (
                <motion.span 
                  className="absolute -top-5 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon}
                </motion.span>
              ) : (
                <span className="text-2xl sm:text-2xl mb-1">{item.icon}</span>
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
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
