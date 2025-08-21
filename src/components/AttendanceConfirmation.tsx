import React from 'react';

export function AttendanceConfirmation({ 
  attendanceRecord, 
  setCurrentView 
}: { 
  attendanceRecord: any;
  setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation') => void;
}) {
  if (!attendanceRecord) {
    return (
      <div className="max-w-md mx-auto text-center">
        <p className="text-gray-600">Aucun enregistrement de pointage</p>
        <button
          onClick={() => setCurrentView('employee')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retour
        </button>
      </div>
    );
  }

  // Auto-retour vers l'accueil après 8s
  React.useEffect(() => {
    const t = setTimeout(() => setCurrentView('employee'), 8000);
    return () => clearTimeout(t);
  }, [setCurrentView]);

  const type: 'arrival' | 'mid' | 'departure' = attendanceRecord.type;
  const midType: 'pause' | 'intervention' | 'commission' | undefined = attendanceRecord.midType;
  const isArrival = type === 'arrival';
  const isDeparture = type === 'departure';
  const isMid = type === 'mid';
  const timestamp = new Date(typeof attendanceRecord.timestamp === 'number' || typeof attendanceRecord.timestamp === 'string' ? attendanceRecord.timestamp : Date.now());

  const actionLabel = isArrival
    ? 'Arrivée'
    : isDeparture
      ? 'Départ'
      : midType === 'pause'
        ? 'Pause'
        : midType === 'intervention'
          ? 'Intervention'
          : midType === 'commission'
            ? 'Commission'
            : 'Mouvement';

  const actionEmoji = isArrival ? '🟢' : isDeparture ? '🔴' : '🟡';
  const badgeClass = isArrival
    ? 'bg-green-100 text-green-800'
    : isDeparture
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Success Animation */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-pulse">
          <span className="text-4xl">{actionEmoji}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pointage enregistré avec succès!
        </h1>
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${badgeClass}`}>
          ✅ {actionLabel} confirmée
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-lg shadow border p-6 space-y-4">
        <div className="text-center border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {attendanceRecord.employee?.firstName} {attendanceRecord.employee?.lastName}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Type de pointage:</span>
            <span className="font-medium text-gray-900">{actionEmoji} {actionLabel}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Heure:</span>
            <span className="font-medium text-gray-900">
              {timestamp.toLocaleTimeString('fr-FR')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium text-gray-900">
              {timestamp.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {attendanceRecord.location && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Position:</span>
              <span className="font-medium text-green-600">📍 Vérifiée</span>
            </div>
          )}
          {attendanceRecord.reason && (
            <div className="flex justify-between items-start">
              <span className="text-gray-600 mt-0.5">Raison:</span>
              <span className="font-medium text-gray-900 text-left whitespace-pre-wrap">{attendanceRecord.reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-green-600 text-xl mr-3">✅</span>
          <div>
            <p className="font-medium text-green-800">Pointage enregistré avec succès</p>
            <p className="text-sm text-green-600">Votre {actionLabel.toLowerCase()} a été enregistré dans le système</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => setCurrentView('employee')}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Retour à mon profil
        </button>
        
        <button
          onClick={() => setCurrentView('scanner')}
          className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Scanner un autre QR code
        </button>
      </div>
    </div>
  );
}
