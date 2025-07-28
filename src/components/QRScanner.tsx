import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import EmployeeConfirmation from "./EmployeeConfirmation";
import { Html5Qrcode } from "html5-qrcode";

export function QRScanner({ setCurrentView, setAttendanceRecord }: { setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation') => void; setAttendanceRecord: (record: any) => void; }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState<any>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-scanner-html5";

  const recordAttendance = useMutation(api.attendance.recordAttendance);

  // Démarre la caméra et ouvre la modale
  const startQRScanner = async () => {
    setStatus("");
    setScanResult(null);
    setModalOpen(true);
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
    setModalOpen(false);
  };

  // Initialisation du scanner QR quand la modale s'ouvre
  useEffect(() => {
    if (modalOpen && !showConfirmation) {
      const config = { fps: 10, qrbox: 250, aspectRatio: 1.0 };
      const qrCodeSuccessCallback = (decodedText: string) => {
        if (!isProcessing && html5QrCodeRef.current) {
          // Stoppe le scanner immédiatement
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
            setModalOpen(false); // ferme la modale après avoir affiché la confirmation
            setScanResult(decodedText);
            onScan(decodedText); // La suite (confirmation) est gérée dans onScan
          });
        }
      };
      const qrCodeErrorCallback = (error: any) => {
        // Ignore les erreurs de décodage
      };
      try {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
        html5QrCodeRef.current.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        setStatus("");
      } catch (e) {
        // Ajout : message Lockdown
        let msg = "❌ Impossible d'accéder à la caméra : ";
        if (typeof e === "object" && e && "message" in e) {
          msg += e.message;
        } else {
          msg += String(e);
        }
        // Détection Lockdown (Safari iOS)
        if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
          msg +=
            "\n\n🔒 Il semble que le mode Lockdown (Isolement) d'iOS soit activé. Ce mode bloque l'accès à la caméra pour toutes les applications web.\n" +
            "Pour utiliser le scan QR, désactivez temporairement le mode Lockdown dans Réglages > Confidentialité et sécurité > Mode Isolement.";
        }
        setStatus(msg);
      }
    }
    return () => {
      if (html5QrCodeRef.current) {
        (async () => {
          try { await html5QrCodeRef.current!.stop(); } catch {}
          try { await html5QrCodeRef.current!.clear(); } catch {}
          html5QrCodeRef.current = null;
        })();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, showConfirmation]);

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
          setCurrentView('employee');
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
          setCurrentView('employee');
        },
      });
    } catch (error) {
      setStatus("❌ Erreur lors du pointage");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      {/* Loader animé avant le scan */}
      {!modalOpen && !showConfirmation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-100 bg-opacity-95">
          <button className="loader-wrapper" onClick={startQRScanner} style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, cursor: 'pointer' }}>
            <div className="loader"></div>
            <span className="loader-text">Démarrer</span>
            <style>{`
              .loader-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 220px;
                height: 220px;
                font-family: 'Inter', sans-serif;
                border-radius: 50%;
                background-color: transparent;
                user-select: none;
                border: none;
                box-shadow: 0 8px 32px 0 #ad5fff22;
                transition: box-shadow 0.2s;
                overflow: hidden;
              }
              .loader-wrapper:active {
                box-shadow: 0 2px 8px 0 #ad5fff44;
              }
              .loader {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                aspect-ratio: 1 / 1;
                border-radius: 50%;
                background-color: transparent;
                animation: loader-rotate 2s linear infinite;
                z-index: 0;
              }
              @keyframes loader-rotate {
                0% {
                  transform: rotate(90deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 30px 0 #ad5fff inset,
                    0 60px 60px 0 #471eec inset;
                }
                50% {
                  transform: rotate(270deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 10px 0 #d60a47 inset,
                    0 40px 60px 0 #311e80 inset;
                }
                100% {
                  transform: rotate(450deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 30px 0 #ad5fff inset,
                    0 60px 60px 0 #471eec inset;
                }
              }
              .loader-text {
                position: relative;
                z-index: 1;
                font-size: 2.1rem;
                font-weight: 700;
                color: #222;
                text-align: center;
                letter-spacing: 0.01em;
                width: 100%;
                line-height: 1.1;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
              }
            `}</style>
          </button>
        </div>
      )}
      {/* Modale plein écran pour le scan */}
      {modalOpen && !showConfirmation && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
          <div className="relative w-full max-w-md mx-auto flex flex-col items-center">
            {/* Loader animé moderne */}
            <div className="loader-wrapper mb-6">
              <div className="loader"></div>
              {"Démarrer le scan".split("").map((l, i) => (
                <span className="loader-letter" key={i}>{l === ' ' ? '\u00A0' : l}</span>
              ))}
            </div>
            {/* Zone d'affichage du scanner QR */}
            <div id={scannerId} className="w-full h-80 bg-black rounded-lg border-4 border-blue-500 flex items-center justify-center" />
            {/* Cadre visuel pour aligner le QR code */}
            <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 border-4 border-green-400 rounded-lg pointer-events-none animate-pulse" />
            {/* Bouton pour fermer */}
            <button
              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-40 rounded-full p-2 hover:bg-opacity-70"
              onClick={stopQRScanner}
            >
              ✕
            </button>
            {/* Statut et confirmation */}
            <div className="mt-6 text-center text-white text-lg min-h-[2em]">
              {status || "Alignez le QR code dans le cadre"}
            </div>
            <style>{`
              .loader-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 180px;
                height: 180px;
                font-family: 'Inter', sans-serif;
                font-size: 1.2em;
                font-weight: 300;
                color: white;
                border-radius: 50%;
                background-color: transparent;
                user-select: none;
              }
              .loader {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                aspect-ratio: 1 / 1;
                border-radius: 50%;
                background-color: transparent;
                animation: loader-rotate 2s linear infinite;
                z-index: 0;
              }
              @keyframes loader-rotate {
                0% {
                  transform: rotate(90deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 30px 0 #ad5fff inset,
                    0 60px 60px 0 #471eec inset;
                }
                50% {
                  transform: rotate(270deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 10px 0 #d60a47 inset,
                    0 40px 60px 0 #311e80 inset;
                }
                100% {
                  transform: rotate(450deg);
                  box-shadow:
                    0 10px 20px 0 #fff inset,
                    0 20px 30px 0 #ad5fff inset,
                    0 60px 60px 0 #471eec inset;
                }
              }
              .loader-letter {
                display: inline-block;
                opacity: 0.4;
                transform: translateY(0);
                animation: loader-letter-anim 2s infinite;
                z-index: 1;
                border-radius: 50ch;
                border: none;
              }
              .loader-letter:nth-child(1) { animation-delay: 0s; }
              .loader-letter:nth-child(2) { animation-delay: 0.1s; }
              .loader-letter:nth-child(3) { animation-delay: 0.2s; }
              .loader-letter:nth-child(4) { animation-delay: 0.3s; }
              .loader-letter:nth-child(5) { animation-delay: 0.4s; }
              .loader-letter:nth-child(6) { animation-delay: 0.5s; }
              .loader-letter:nth-child(7) { animation-delay: 0.6s; }
              .loader-letter:nth-child(8) { animation-delay: 0.7s; }
              .loader-letter:nth-child(9) { animation-delay: 0.8s; }
              .loader-letter:nth-child(10) { animation-delay: 0.9s; }
              .loader-letter:nth-child(11) { animation-delay: 1.0s; }
              .loader-letter:nth-child(12) { animation-delay: 1.1s; }
              .loader-letter:nth-child(13) { animation-delay: 1.2s; }
              .loader-letter:nth-child(14) { animation-delay: 1.3s; }
              .loader-letter:nth-child(15) { animation-delay: 1.4s; }
              .loader-letter:nth-child(16) { animation-delay: 1.5s; }
              .loader-letter:nth-child(17) { animation-delay: 1.6s; }
              .loader-letter:nth-child(18) { animation-delay: 1.7s; }
              .loader-letter:nth-child(19) { animation-delay: 1.8s; }
              @keyframes loader-letter-anim {
                0%, 100% {
                  opacity: 0.4;
                  transform: translateY(0);
                }
                20% {
                  opacity: 1;
                  transform: scale(1.15);
                }
                40% {
                  opacity: 0.7;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        </div>
      )}
      {showConfirmation && confirmationProps && (
        <EmployeeConfirmation {...confirmationProps} />
      )}
    </div>
  );
}
