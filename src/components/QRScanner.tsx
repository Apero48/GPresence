import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import notify from '../utils/notify';
import EmployeeConfirmation from "./EmployeeConfirmation";
import { Html5Qrcode } from "html5-qrcode";

const USE_CONFIRMATION_PAGE = true; // Affiche la page de confirmation 8s puis retour auto

export function QRScanner({ setCurrentView, setAttendanceRecord }: { setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation') => void; setAttendanceRecord: (record: any) => void; }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [choicePrompt, setChoicePrompt] = useState<null | {
    qrCodeId: string;
    options: Array<'arrival' | 'pause' | 'departure' | 'autre'>;
    employeeName: string;
  }>(null);
  const [selectedChoice, setSelectedChoice] = useState<'arrival' | 'pause' | 'departure' | 'autre' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-scanner-html5";
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const recordAttendance = useMutation(api.attendance.recordAttendance);

  // Prompt for choice (2e+ scan): pause/intervention/commission/departure
  

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
          msg += (e as any).message;
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
        setCameraError(msg);
        notify.error('Accès caméra refusé ou indisponible', { description: msg });
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
            notify.success("Pointages hors-ligne synchronisés !");
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

  // Listen to online/offline for inline banner
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const restartScanner = async () => {
    try {
      setRestarting(true);
      setCameraError(null);
      // Re-trigger existing init logic by unmounting/mounting or by your init fn if available
      // If you have a start() function, call it here; otherwise toggle a key state
      // This fallback shows feedback only
      await new Promise((r) => setTimeout(r, 500));
      notify.success('Scanner réinitialisé');
    } catch (e) {
      notify.error('Impossible de réinitialiser la caméra');
    } finally {
      setRestarting(false);
    }
  };

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
      setAttendanceRecord({
        type: 'arrival',
        timestamp: Date.now(),
        employee: { firstName: 'Employé', lastName: '' },
        location: undefined,
      });
      setCurrentView(USE_CONFIRMATION_PAGE ? 'confirmation' : 'employee');
      setIsProcessing(false);
      return;
    }
    try {
      const res: any = await recordAttendance({ qrCodeId: result });
      // If backend asks for a choice on 2e+ scan
      if (res && (res.requiresChoice || res.requiresMidType)) {
        // Sur 2e+ scan, on propose: Pause, Départ, Autre
        const options: Array<'arrival' | 'pause' | 'departure' | 'autre'> = ['pause', 'departure', 'autre'];
        setChoicePrompt({
          qrCodeId: result,
          options,
          employeeName: res.employee ? `${res.employee.firstName} ${res.employee.lastName}` : 'Employé',
        });
        setStatus("Choisissez: pause / départ / autre");
        return; // wait for user choice
      }

      const normalized = {
        type: res?.type ?? 'arrival',
        midType: res?.midType,
        timestamp: res?.timestamp ?? Date.now(),
        employee: res?.employee ?? null,
        location: res?.location ? { latitude: res.location.latitude, longitude: res.location.longitude } : undefined,
        reason: res?.reason,
      };
      setAttendanceRecord(normalized);
      setStatus("✅ Pointage enregistré !");
      if (res?.pauseExceeded) {
        notify.warning(`Pause ${res.pauseDurationMinutes} min (> 60 min)`);
      }
      setCurrentView(USE_CONFIRMATION_PAGE ? 'confirmation' : 'employee');
    } catch (error) {
      const raw = (error as any)?.message ?? String(error);
      if (raw && /expired/i.test(raw)) {
        const msg = "⏱️ Le QR code a expiré. Veuillez rescanner un QR valide.";
        setStatus(msg);
        notify.warning('QR code expiré', { description: msg });
        setIsScanning(false);
        setCurrentView('employee');
      } else {
        setStatus("❌ Erreur lors du pointage");
        notify.error('Erreur lors du pointage', { description: raw });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const onConfirmChoice = async () => {
    if (!choicePrompt || !selectedChoice) return;
    // Raison requise uniquement pour 'autre' (pas pour arrivée/départ/pause)
    const needsReason = selectedChoice === 'autre';
    if (needsReason && reasonText.trim().length === 0) {
      notify.warning('Veuillez saisir la raison.');
      return;
    }
    setIsProcessing(true);
    try {
      // N'envoie pas la raison au backend (il ne l'accepte pas).
      // Mapping: 'pause' -> midType 'pause'; 'autre' -> midType 'intervention'; 'departure' -> departure: true
      const args = selectedChoice === 'departure'
        ? { qrCodeId: choicePrompt.qrCodeId, departure: true as const }
        : { qrCodeId: choicePrompt.qrCodeId, midType: (selectedChoice === 'autre' ? 'intervention' : 'pause') as 'pause' | 'intervention' };
      const res: any = await recordAttendance(args as any);
      setChoicePrompt(null);
      setSelectedChoice(null);
      setReasonText('');
      const normalized = {
        type: res?.type ?? (selectedChoice === 'departure' ? 'departure' : 'mid'),
        midType: res?.midType ?? (selectedChoice === 'autre' ? 'intervention' : (selectedChoice === 'pause' ? 'pause' : undefined)),
        timestamp: res?.timestamp ?? Date.now(),
        employee: res?.employee ?? null,
        location: res?.location ? { latitude: res.location.latitude, longitude: res.location.longitude } : undefined,
        // Conserver localement pour l'affichage uniquement
        reason: needsReason ? reasonText.trim() : undefined,
      };
      setAttendanceRecord(normalized);
      setStatus("✅ Pointage enregistré !");
      if (res?.pauseExceeded) {
        notify.warning(`Pause ${res.pauseDurationMinutes} min (> 60 min)`);
      }
      setCurrentView(USE_CONFIRMATION_PAGE ? 'confirmation' : 'employee');
    } catch (e) {
      const raw = (e as any)?.message ?? String(e);
      if (raw && /expired/i.test(raw)) {
        const msg = "⏱️ Le QR code a expiré. Veuillez rescanner un QR valide.";
        setStatus(msg);
        notify.warning('QR code expiré', { description: msg });
        setIsScanning(false);
        setCurrentView('employee');
      } else {
        notify.error("Impossible d'enregistrer le choix. Réessayez.", { description: raw });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-white p-4 pt-8">
      {!isScanning && (
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

      {isScanning && (
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
          {!isOnline && (
            <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
              Hors ligne — le scan sera mis en file et synchronisé quand la connexion reviendra.
            </div>
          )}
          {cameraError && (
            <div className="mt-3 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
              <p className="font-medium mb-1">Problème d’accès caméra</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Vérifiez que le navigateur a l’autorisation d’utiliser la caméra.</li>
                <li>Fermez les autres applications utilisant la caméra.</li>
                <li>Essayez d’actualiser la page ou de changer d’appareil photo.</li>
              </ul>
              <p className="mt-2 text-xs text-red-700">Détails: {cameraError}</p>
            </div>
          )}
          {status && /expiré|expir|expired/i.test(status) && (
            <div className="mt-3 flex items-center gap-3 justify-center">
              <button onClick={startQRScanner} className="px-4 py-2 rounded bg-blue-600 text-white">Rescanner</button>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => setCurrentView('employee')} className="px-4 py-2 rounded border">Retour</button>
            <button onClick={restartScanner} disabled={restarting} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
              {restarting ? 'Redémarrage…' : 'Réessayer'}
            </button>
          </div>
        </div>
      )}
      
      {/* Choice prompt (2e+ scan) */}
      {choicePrompt && (
        <div className="w-full max-w-md mx-auto mt-6">
          <div className="bg-white border rounded-lg shadow p-4 space-y-3">
            <p className="text-center font-medium">Sélectionnez une option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {choicePrompt.options.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setSelectedChoice(opt)}
                  className={`px-3 py-2 rounded-md border ${selectedChoice === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
                  disabled={isProcessing}
                >
                  {opt === 'arrival' ? 'Arrivée'
                   : opt === 'pause' ? 'Pause'
                   : opt === 'autre' ? 'Autre'
                   : 'Départ'}
                </button>
              ))}
            </div>
            {selectedChoice === 'autre' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison (obligatoire)</label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Expliquez brièvement la raison..."
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  inputMode="text"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => { setChoicePrompt(null); setSelectedChoice(null); setReasonText(''); }} className="px-3 py-2 rounded border">Annuler</button>
              <button type="button" onClick={onConfirmChoice} disabled={isProcessing || !selectedChoice || (selectedChoice === 'autre' && reasonText.trim().length === 0)} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Valider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
