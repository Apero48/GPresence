import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function EmployeeView({ setCurrentView }: { 
  setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation') => void;
}) {
  const employee = useQuery(api.employees.getCurrentEmployee);
  const myAttendance = useQuery(api.attendance.getMyAttendance, { limit: 20 });
  const myDaySummary = useQuery(api.attendance.getMyDaySummary);
  const settings = useQuery(api.companySettings.getSettings);
  const myWeekStats = useQuery(api.attendance.getMyWeekStats);
  const recordAttendance = useMutation(api.attendance.recordAttendance);
  const [now, setNow] = useState(Date.now());

  if (!employee || !myAttendance) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendance = myAttendance.filter(record => 
    record.timestamp >= today.getTime() && record.timestamp < tomorrow.getTime()
  );

  const lastRecord = todayAttendance[0];
  const isPresent = lastRecord?.type === 'arrival';

  // Compute first arrival, last departure, open pause
  const { firstArrivalTs, lastDepartureTs, openPauseStartTs } = useMemo(() => {
    const sorted = [...todayAttendance].sort((a, b) => a.timestamp - b.timestamp);
    const firstArrival = sorted.find(r => r.type === 'arrival');
    const lastDeparture = [...sorted].reverse().find(r => r.type === 'departure');
    let lastPauseStart: number | null = null;
    for (const r of sorted) {
      if (r.type === 'mid' && r.midType === 'pause') {
        if (r.midDirection === 'start') lastPauseStart = r.timestamp;
        if (r.midDirection === 'end') lastPauseStart = null;
      }
    }
    return {
      firstArrivalTs: firstArrival?.timestamp ?? null,
      lastDepartureTs: lastDeparture?.timestamp ?? null,
      openPauseStartTs: lastPauseStart,
    };
  }, [todayAttendance]);

  // Update clock for live pause display and effective presence
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Compute lateness and effective presence
  const lateness = useMemo(() => {
    if (!firstArrivalTs) return null;
    const whStart = settings?.workingHours?.start ?? '08:00';
    const tol = settings?.toleranceMinutes ?? 16;
    const [hStr, mStr] = whStart.split(':');
    const base = new Date(today);
    base.setHours(parseInt(hStr || '8', 10), parseInt(mStr || '0', 10), 0, 0);
    const threshold = new Date(base.getTime() + tol * 60000);
    return firstArrivalTs > threshold.getTime();
  }, [firstArrivalTs, today, settings]);

  const presenceMinutes = useMemo(() => {
    if (!firstArrivalTs) return 0;
    const endTs = lastDepartureTs ?? now;
    const total = Math.max(0, Math.round((endTs - firstArrivalTs) / 60000));
    const pause = myDaySummary?.pauseMinutes ?? 0;
    return Math.max(0, total - pause);
  }, [firstArrivalTs, lastDepartureTs, now, myDaySummary]);

  const openPauseMinutes = useMemo(() => {
    if (!openPauseStartTs) return 0;
    return Math.max(0, Math.round((now - openPauseStartTs) / 60000));
  }, [openPauseStartTs, now]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Employee Info */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600">{employee.department || 'Aucun département'}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isPresent 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <span className="mr-1">{isPresent ? '🟢' : '⚪'}</span>
              {isPresent ? 'Présent' : 'Absent'}
            </div>
          </div>
        </div>
      </div>

      {/* Pause du jour */}
      {myDaySummary && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Résumé de la journée</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-700">Pause totale</p>
              <p className={`font-semibold ${myDaySummary.exceeded ? 'text-red-600' : 'text-gray-900'}`}>
                {myDaySummary.pauseMinutes} min {myDaySummary.exceeded ? '(> 60 min)' : ''}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-700">Présence effective</p>
              <p className="font-semibold text-gray-900">{presenceMinutes} min</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-700">Arrivée</p>
              <p className="font-medium text-gray-900">{firstArrivalTs ? new Date(firstArrivalTs).toLocaleTimeString('fr-FR') : '-'}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-700">Départ</p>
              <p className="font-medium text-gray-900">{lastDepartureTs ? new Date(lastDepartureTs).toLocaleTimeString('fr-FR') : '-'}</p>
            </div>
          </div>
          {lateness !== null && (
            <div className={`mt-3 text-sm ${lateness ? 'text-red-600' : 'text-gray-600'}`}>
              {lateness ? 'En retard' : 'À l’heure'}
            </div>
          )}
          {isPresent && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    await recordAttendance({ qrCodeId: 'manual', departure: true as const });
                    toast.success('Départ enregistré');
                    setCurrentView('employee');
                  } catch (e) {
                    toast.error('Impossible d\'enregistrer le départ');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Pointer départ
              </button>
            </div>
          )}
          {openPauseStartTs && (
            <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm ${openPauseMinutes > 60 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
              🕒 Pause en cours · {openPauseMinutes} min
            </div>
          )}
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('scanner')}
            className="flex items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">📱</span>
              <p className="font-medium text-blue-600">Scanner QR Code</p>
              <p className="text-sm text-gray-500">Pointer votre présence</p>
            </div>
          </button>
          
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <span className="text-3xl mb-2 block">📊</span>
              <p className="font-medium text-gray-600">Statistiques</p>
              <p className="text-sm text-gray-500">{myAttendance.length} pointages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité d'aujourd'hui</h2>
        {todayAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucune activité aujourd'hui</p>
        ) : (
          <div className="space-y-3">
            {todayAttendance.map((record) => (
              <div key={record._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {record.type === 'arrival' ? '🟢' : record.type === 'departure' ? '🔴' : '🟡'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.type === 'arrival'
                        ? 'Arrivée'
                        : record.type === 'departure'
                        ? 'Départ'
                        : record.midType === 'pause'
                        ? `Pause ${record.midDirection === 'start' ? 'début' : 'fin'}`
                        : record.midType === 'intervention'
                        ? `Intervention ${record.midDirection === 'start' ? 'début' : 'fin'}`
                        : `Commission ${record.midDirection === 'start' ? 'début' : 'fin'}`
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(record.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique récent</h2>
        {myAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun historique</p>
        ) : (
          <div className="space-y-3">
            {myAttendance.slice(0, 10).map((record) => (
              <div key={record._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <span className="text-xl mr-3">
                    {record.type === 'arrival' ? '🟢' : record.type === 'departure' ? '🔴' : '🟡'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.type === 'arrival'
                        ? 'Arrivée'
                        : record.type === 'departure'
                        ? 'Départ'
                        : record.midType === 'pause'
                        ? `Pause ${record.midDirection === 'start' ? 'début' : 'fin'}`
                        : record.midType === 'intervention'
                        ? `Intervention ${record.midDirection === 'start' ? 'début' : 'fin'}`
                        : `Commission ${record.midDirection === 'start' ? 'début' : 'fin'}`
                      }
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(record.timestamp).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(record.timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mini-stats semaine */}
      {myWeekStats && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Mini-stats (7 derniers jours)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Présence effective</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.floor((myWeekStats.totalPresenceMinutes || 0) / 60)} h {Math.round((myWeekStats.totalPresenceMinutes || 0) % 60)} min
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Pauses</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.floor((myWeekStats.totalPauseMinutes || 0) / 60)} h {Math.round((myWeekStats.totalPauseMinutes || 0) % 60)} min
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Jours en retard</p>
              <p className="text-xl font-semibold text-gray-900">{myWeekStats.lateDays || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
