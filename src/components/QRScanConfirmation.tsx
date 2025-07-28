import React from "react";
import { CheckCircle, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QRScanConfirmationProps {
  employeeName: string;
  action: "arrival" | "departure";
  timestamp: Date;
  location?: { lat: number; lng: number };
  onClose?: () => void;
}

const QRScanConfirmation = ({
  employeeName,
  action,
  timestamp,
  location,
  onClose,
}: QRScanConfirmationProps) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const actionText = action === "arrival" ? "Arrivée" : "Départ";
  const actionEmoji = action === "arrival" ? "🟢" : "🔴";
  const bgColor = action === "arrival" ? "bg-green-500" : "bg-blue-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 border-0 shadow-2xl bg-white rounded-xl animate-scale-in animate-success">
        <div className="p-8 text-center">
          <div
            className={`w-20 h-20 ${bgColor} rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg`}
          >
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {actionEmoji} {actionText} Confirmée
              </h2>
              <p className="text-lg font-medium text-gray-500">
                {employeeName}
              </p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-gray-900">
                <Clock className="h-5 w-5" />
                <span className="text-xl font-bold">
                  {format(timestamp, "HH:mm:ss")}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {format(timestamp, "EEEE d MMMM yyyy", { locale: fr })}
              </div>
              {location && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Position vérifiée</span>
                </div>
              )}
            </div>
            <div className="bg-green-100 text-green-700 border border-green-200 px-4 py-2 text-base font-medium rounded-lg">
              ✅ Pointage enregistré avec succès
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanConfirmation; 