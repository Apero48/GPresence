import { Authenticated, Unauthenticated, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { EmployeeView } from "./components/EmployeeView";
import { QRScanner } from "./components/QRScanner";
import { AttendanceConfirmation } from "./components/AttendanceConfirmation";
import OfflineNotice from "./components/OfflineNotice";
import ModernNavBar from "./components/ModernNavBar";
import { AttendanceHistory } from "./components/AttendanceHistory";
import { EmployeeManagement } from "./components/EmployeeManagement";
import { QRCodeGenerator } from "./components/QRCodeGenerator";
import PersonnelList from "./components/PersonnelList";
import { EmployeeSimpleHistory } from "./components/EmployeeSimpleHistory";
import EmployeeMonthlySheet from "./components/EmployeeMonthlySheet";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/feuille-employe/:id" element={<EmployeeMonthlySheet />} />
        <Route path="/*" element={<LegacyApp />} />
      </Routes>
    </BrowserRouter>
  );
}

// L'ancien contenu de App est déplacé dans LegacyApp pour la compatibilité
function LegacyApp() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'employes' | 'qrcode' | 'history' | 'employee' | 'scanner' | 'confirmation' | 'personnel'>('dashboard');
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const employee = useQuery(api.employees.getCurrentEmployee);
  const initializeAdmin = useMutation(api.employees.initializeAdmin);
  const associateUserIdToEmployee = useMutation(api.employees.associateUserIdToEmployee);
  const { isAuthenticated } = useConvexAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check URL for QR code scanning
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrCode = urlParams.get('qr');
    if (qrCode) {
      setCurrentView('scanner');
    }
  }, []);

  // Effet pour créer automatiquement le profil admin si besoin
  useEffect(() => {
    if (employee === null) {
      // Si l'utilisateur est authentifié mais n'a pas de profil employé, on tente de créer le profil admin
      initializeAdmin();
    }
  }, [employee, initializeAdmin]);

  // Effet pour associer automatiquement le userId à l'employé lors de la première connexion
  useEffect(() => {
    if (
      employee &&
      typeof employee === 'object' &&
      'needsUserIdAssociation' in employee &&
      employee.needsUserIdAssociation &&
      employee._id &&
      isAuthenticated
    ) {
      // On tente d'associer le userId côté backend, qui saura le retrouver via getAuthUserId
      associateUserIdToEmployee({ employeeId: employee._id, userId: undefined });
    }
  }, [employee, associateUserIdToEmployee, isAuthenticated]);

  // Effet pour détecter l'état de la connexion réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return <OfflineNotice />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex items-center border-b shadow-sm px-4">
        <img src="/logo-msa.png" alt="Logo MSA Inter" className="h-10 w-auto" />
        <span className="text-xl font-bold text-blue-700 ml-4">GPE</span>
        <div className="flex-1" />
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
        <Authenticated>
          <Content 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            attendanceRecord={attendanceRecord}
            setAttendanceRecord={setAttendanceRecord}
          />
        </Authenticated>
        <Unauthenticated>
          <div className="relative min-h-screen flex flex-col sm:justify-center items-center bg-gray-100 py-8">
            <div className="relative sm:max-w-sm w-full">
              <div className="card bg-blue-400 shadow-lg w-full h-full rounded-3xl absolute transform -rotate-6"></div>
              <div className="card bg-red-400 shadow-lg w-full h-full rounded-3xl absolute transform rotate-6"></div>
              <div className="relative w-full rounded-3xl px-6 py-8 bg-gray-100 shadow-md">
                <label className="block mt-3 text-xl text-gray-700 text-center font-semibold">
                  Système de Pointage
                </label>
                <p className="text-gray-600 text-center mb-4">Connectez-vous pour pointer votre présence</p>
                <div className="mt-8">
                  <SignInForm />
                </div>
              </div>
            </div>
          </div>
        </Unauthenticated>
      </main>
      {employee && (
        <ModernNavBar
          role={employee.role}
          currentView={currentView}
          setCurrentView={(view: string) => setCurrentView(view as typeof currentView)}
        />
      )}
      <Toaster />
    </div>

  );
}

function Content({ 
  currentView, 
  setCurrentView, 
  attendanceRecord, 
  setAttendanceRecord 
}: {
  currentView: string;
  setCurrentView: (view: 'dashboard' | 'employes' | 'qrcode' | 'personnel' | 'history' | 'employee' | 'scanner' | 'confirmation') => void;
  attendanceRecord: any;
  setAttendanceRecord: (record: any) => void;
}) {
  const employee = useQuery(api.employees.getCurrentEmployee);

  if (employee === undefined) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Profil employé non trouvé. Contactez votre administrateur.</p>
      </div>
    );
  }

  // ADMIN
  if (employee.role === 'admin') {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'employes':
        return <EmployeeManagement />;
      case 'qrcode':
        return <QRCodeGenerator />;
      case 'personnel':
        return <PersonnelList setCurrentView={setCurrentView} />;
      case 'history':
        return <AttendanceHistory />;
      default:
        return <Dashboard />;
    }
  }
  // EMPLOYE
  switch (currentView) {
    case 'dashboard':
      return <EmployeeView setCurrentView={setCurrentView} />;
    case 'employee':
      return <EmployeeView setCurrentView={setCurrentView} />;
    case 'scanner':
      return (
        <QRScanner 
          setCurrentView={setCurrentView}
          setAttendanceRecord={setAttendanceRecord}
        />
      );
    case 'confirmation':
      return (
        <AttendanceConfirmation 
          attendanceRecord={attendanceRecord}
          setCurrentView={setCurrentView}
        />
      );
    case 'history':
      return <EmployeeSimpleHistory />;
    default:
      return <EmployeeView setCurrentView={setCurrentView} />;
  }
}
