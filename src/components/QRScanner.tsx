import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import EmployeeConfirmation from "./EmployeeConfirmation";
import { Html5Qrcode } from "html5-qrcode";

export function QRScanner({ setCurrentView, setAttendanceRecord }: { setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation' | 'personnel') => void; setAttendanceRecord: (record: any) => void; }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState<any>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-scanner-html5";
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const recordAttendance = useMutation(api.attendance.recordAttendance);

  // Démarre la caméra et le scanner
  const startQRScanner = async () => {
    setStatus("");
    setIsScanning(true);
  };

  // Arrête la caméra et le scanner QR
  const stopQRScanner = () => {
    if (html5QrCodeRef.current) {
      (async () => {
        try { await html5QrCodeRef.current!.stop(); } catch {}
        try { await html5QrCodeRef.current!.clear(); } catch {}
        html5QrCodeRef.current = null;
      })();
    }
    setIsScanning(false);
  };

  // Initialisation du scanner QR
  useEffect(() => {
    if (!isScanning) return;

    const qrCodeSuccessCallback = (decodedText: string) => {
      if (!isProcessing && html5QrCodeRef.current) {
        stopQRScanner();
        onScan(decodedText);
      }
    };

    const qrCodeErrorCallback = (error: any) => {
      // Ignore les erreurs de décodage
    };

    const initializeScanner = async () => {
      try {
        // Calculer la taille du conteneur
        const container = scannerContainerRef.current;
        if (!container) return;
        
        const size = Math.min(container.offsetWidth - 40, 400); // Taille maximale de 400px
        
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
        
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: size, height: size },
            aspectRatio: 1.0 
          },
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        
        setStatus("");
      } catch (e) {
        let msg = "❌ Impossible d'accéder à la caméra : ";
        if (typeof e === "object" && e && "message" in e) {
          msg += e.message;
        } else {
          msg += String(e);
        }
        
        if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
          msg +=
            "\n\n🔒 Il semble que le mode Lockdown (Isolement) d'iOS soit activé. Ce mode bloque l'accès à la caméra pour toutes les applications web.\n" +
            "Pour utiliser le scan QR, désactivez temporairement le mode Lockdown dans Réglages > Confidentialité et sécurité > Mode Isolement.";
        }
        setStatus(msg);
        setIsScanning(false);
      }
    };

    initializeScanner();

    return () => {
      stopQRScanner();
    };
  }, [isScanning]);

  // Ajout : synchronisation hors-ligne à la reconnexion
  useEffect(() => {
    const syncOfflineAttendances = async () => {
      if (navigator.onLine) {
        const offline = localStorage.getItem("offline_attendance");
        if (offline) {
          const records = JSON.parse(offline);
          if (Array.isArray(records) && records.length > 0) {
            for (const rec of records) {
              try {
                await recordAttendance({ qrCodeId: rec.qrCodeId });
              } catch {}
            }
            localStorage.removeItem("offline_attendance");
            toast.success("Pointages hors-ligne synchronisés !");
          }
        }
      }
    };
    window.addEventListener("online", syncOfflineAttendances);
    // Synchronise aussi au montage si déjà en ligne
    syncOfflineAttendances();
    return () => {
      window.removeEventListener("online", syncOfflineAttendances);
    };
  }, [recordAttendance]);

  // Action à effectuer après scan
  const onScan = async (result: string) => {
    if (!result) return;
    setIsProcessing(true);
    if (!navigator.onLine) {
      // Mode hors-ligne : stocke le pointage localement
      const offline = localStorage.getItem("offline_attendance");
      const records = offline ? JSON.parse(offline) : [];
      records.push({ qrCodeId: result, timestamp: Date.now() });
      localStorage.setItem("offline_attendance", JSON.stringify(records));
      setStatus("✅ Pointage enregistré hors-ligne !");
      setShowConfirmation(true);
      setConfirmationProps({
        employeeName: "Employé",
        action: "arrival",
        timestamp: new Date(),
        location: undefined,
        onDone: () => {
          setShowConfirmation(false);
          setCurrentView('personnel');
        },
        offline: true,
      });
      setIsProcessing(false);
      return;
    }
    // Supprime la redirection automatique vers une URL
    // Le scan déclenche toujours le pointage
    try {
      const attendance = await recordAttendance({ qrCodeId: result });
      setAttendanceRecord(attendance);
      setStatus("✅ Pointage enregistré !");
      setShowConfirmation(true);
      setConfirmationProps({
        employeeName: attendance?.employee ? attendance.employee.firstName + ' ' + attendance.employee.lastName : "Employé",
        action: attendance?.type === "departure" ? "departure" : "arrival",
        timestamp: attendance?.timestamp ? new Date(attendance.timestamp) : new Date(),
        location: attendance?.location ? { lat: attendance.location.latitude, lng: attendance.location.longitude } : undefined,
        onDone: () => {
          setShowConfirmation(false);
          setCurrentView('personnel');
        },
      });
    } catch (error) {
      setStatus("❌ Erreur lors du pointage");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-white p-4 pt-8">
      {!isScanning && !showConfirmation && (
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
          <button 
            onClick={startQRScanner}
            className="relative w-64 h-64 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white 
                     flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse"></div>
            <span className="text-2xl font-bold">Scanner un QR Code</span>
          </button>
          
          <p className="mt-8 text-center text-gray-600">
            Appuyez sur le bouton pour lancer le scan d'un QR code de pointage
          </p>
        </div>
      )}

      {isScanning && !showConfirmation && (
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full relative" ref={scannerContainerRef}>
            <div id={scannerId} className="w-full rounded-lg overflow-hidden bg-black" 
                 style={{ aspectRatio: '1/1', maxHeight: '80vh' }} />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-green-400 rounded-lg w-4/5 h-4/5 animate-pulse"></div>
            </div>
            
            <button
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={stopQRScanner}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="mt-4 text-center text-gray-700">
            {status || "Scannez le QR code dans le cadre"}
          </p>
        </div>
      )}
      
      {showConfirmation && confirmationProps && (
        <div className="w-full max-w-md mx-auto">
          <EmployeeConfirmation {...confirmationProps} />
        </div>
      )}
    </div>
  );
}
