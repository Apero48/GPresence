import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { EmployeeManagement } from "./EmployeeManagement";
import { AttendanceHistory } from "./AttendanceHistory";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'qr' | 'history'>('overview');
  const todayAttendance = useQuery(api.attendance.getTodayAttendance);
  const employees = useQuery(api.employees.getAllEmployees);
  const overages = useQuery(api.attendance.getTodayOverages);
  const settings = useQuery(api.companySettings.getSettings);
  const updateSettings = useMutation(api.companySettings.updateSettings);
  const correctAttendance = useMutation(api.attendance.adminCorrectAttendance);
  const initializeAdmin = useMutation(api.employees.initializeAdmin);

  useEffect(() => {
    initializeAdmin();
  }, [initializeAdmin]);

  // On affiche toujours la vue d'ensemble, la navigation se fait par la BottomNavBar
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de bord administrateur</h1>
        <p className="text-gray-600">Gérez les présences et les employés</p>
      </div>
      <OverviewTab 
        todayAttendance={todayAttendance} 
        employees={employees} 
        overages={overages}
        settings={settings}
        onSaveSettings={async (vals) => {
          await updateSettings(vals);
        }}
        onDeleteRecord={async (id: string) => {
          await correctAttendance({ action: 'delete', recordId: id });
        }}
        onInsertRecord={async (payload) => {
          await correctAttendance({ action: 'insert', ...payload });
        }}
      />
    </div>
  );
}

function OverviewTab({ 
  todayAttendance, 
  employees, 
  overages,
  settings,
  onSaveSettings,
  onDeleteRecord,
  onInsertRecord,
}: { 
  todayAttendance: any; 
  employees: any; 
  overages: any;
  settings: any;
  onSaveSettings: (vals: { workingHours: { start: string; end: string }; toleranceMinutes: number; requireLocation: boolean }) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onInsertRecord: (payload: { employeeId: string; type: 'arrival' | 'mid' | 'departure'; timestamp: number; qrCodeId: string; midType?: 'pause' | 'intervention' | 'commission'; midDirection?: 'start' | 'end'; isLate?: boolean; }) => Promise<void>;
 }) {
  const [start, setStart] = useState(settings?.workingHours?.start || '08:00');
  const [end, setEnd] = useState(settings?.workingHours?.end || '19:00');
  const [tol, setTol] = useState<number>(settings?.toleranceMinutes ?? 16);
  const [requireLoc, setRequireLoc] = useState<boolean>(settings?.requireLocation ?? false);

  useEffect(() => {
    if (settings) {
      setStart(settings.workingHours?.start || '08:00');
      setEnd(settings.workingHours?.end || '19:00');
      setTol(settings.toleranceMinutes ?? 16);
      setRequireLoc(settings.requireLocation ?? false);
    }
  }, [settings]);

  // Insert form state
  const [insertData, setInsertData] = useState({
    employeeId: '', type: 'arrival' as 'arrival' | 'mid' | 'departure', timestamp: '', qrCodeId: 'admin', midType: 'pause' as 'pause' | 'intervention' | 'commission', midDirection: 'start' as 'start' | 'end', isLate: false,
  });

  if (!todayAttendance || !employees) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const arrivals = todayAttendance.filter((record: any) => record.type === 'arrival');
  const departures = todayAttendance.filter((record: any) => record.type === 'departure');
  const present = arrivals.length - departures.length;

  // Late arrivals (after 08:15:59)
  const lateArrivals = arrivals.filter((r: any) => {
    const d = new Date(r.timestamp);
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    return h > 8 || (h === 8 && (m > 15 || (m === 15 && s > 59)));
  });

  // CSV helpers
  const downloadCSV = (rows: any[], fileName: string) => {
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOverages = () => {
    const rows = (overages || []).map((o: any) => ({
      employee: `${o.employee.firstName} ${o.employee.lastName}`,
      pauseMinutes: o.pauseMinutes,
    }));
    downloadCSV(rows, 'depassements_pause.csv');
  };

  const exportLate = () => {
    const rows = lateArrivals.map((r: any) => ({
      employee: `${r.employee?.firstName} ${r.employee?.lastName}`,
      time: new Date(r.timestamp).toLocaleTimeString('fr-FR'),
      date: new Date(r.timestamp).toLocaleDateString('fr-FR'),
    }));
    downloadCSV(rows, 'retards.csv');
  };

  const exportActivity = () => {
    const rows = todayAttendance.map((r: any) => ({
      employee: `${r.employee?.firstName} ${r.employee?.lastName}`,
      type: r.type,
      midType: r.midType || '',
      midDirection: r.midDirection || '',
      time: new Date(r.timestamp).toLocaleTimeString('fr-FR'),
      date: new Date(r.timestamp).toLocaleDateString('fr-FR'),
    }));
    downloadCSV(rows, 'activite_du_jour.csv');
  };

  // KPIs for simple overview
  const totalEmployees = employees.length;
  const absents = Math.max(totalEmployees - present, 0);
  const presenceRate = totalEmployees ? Math.round((present / totalEmployees) * 100) : 0;
  const isLateTs = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    return h > 8 || (h === 8 && (m > 15 || (m === 15 && s > 59)));
  };

  const todaysByEmployee = employees.map((emp: any) => {
    const firstArrival = todayAttendance
      .filter((r: any) => r.employee?._id === emp._id && r.type === 'arrival')
      .sort((a: any, b: any) => a.timestamp - b.timestamp)[0];
    return { emp, arrival: firstArrival };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg"><span className="text-2xl">👥</span></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nombre total d'employés</p>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg"><span className="text-2xl">✅</span></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Employés présents aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg"><span className="text-2xl">❌</span></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Employés absents</p>
              <p className="text-2xl font-bold text-gray-900">{absents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg"><span className="text-2xl">↗️</span></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taux de présence</p>
              <p className="text-2xl font-bold text-gray-900">{presenceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vue rapide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vue rapide</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1"><span>Présents</span><span className="font-semibold">{present}</span></div>
              <div className="w-full h-3 bg-gray-100 rounded">
                <div className="h-3 bg-green-400 rounded" style={{ width: `${totalEmployees ? (present / totalEmployees) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1"><span>Absents</span><span className="font-semibold">{absents}</span></div>
              <div className="w-full h-3 bg-gray-100 rounded">
                <div className="h-3 bg-red-400 rounded" style={{ width: `${totalEmployees ? (absents / totalEmployees) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des présences du jour */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tableau des présences du jour</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2">Employé</th>
                  <th className="px-4 py-2">Heure d'arrivée</th>
                  <th className="px-4 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {todaysByEmployee.slice(0, 10).map(({ emp, arrival }: any) => {
                  const time = arrival ? new Date(arrival.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Absent';
                  const status = !arrival ? 'Absent' : isLateTs(arrival.timestamp) ? 'Retard' : 'Présent';
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-2">{time}</td>
                      <td className="px-4 py-2">
                        {status === 'Absent' && <span className="inline-flex items-center gap-1 text-red-600">❌ Absent</span>}
                        {status === 'Retard' && <span className="inline-flex items-center gap-1 text-yellow-700">🕒 Retard</span>}
                        {status === 'Présent' && <span className="inline-flex items-center gap-1 text-green-700">✅ Présent</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Dépassements de pause (&gt; 60 min)</h3>
            <div className="flex items-center gap-3">
              <button onClick={exportOverages} className="text-sm text-blue-600 hover:underline">Exporter CSV</button>
               <span className="text-sm text-gray-500">{overages ? overages.length : 0}</span>
            </div>
          </div>
          <div className="p-6">
            {!overages || overages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun dépassement aujourd'hui</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {overages.map((o: any) => (
                  <li key={o.employee._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-3">⏱️</span>
                      <span className="font-medium text-gray-900">{o.employee.firstName} {o.employee.lastName}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{o.pauseMinutes} min</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Retards d'arrivée</h3>
            <div className="flex items-center gap-3">
              <button onClick={exportLate} className="text-sm text-blue-600 hover:underline">Exporter CSV</button>
               <span className="text-sm text-gray-500">{lateArrivals.length}</span>
            </div>
          </div>
          <div className="p-6">
            {lateArrivals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun retard aujourd'hui</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lateArrivals.map((r: any) => (
                  <li key={r._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-3">⏰</span>
                      <span className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</span>
                    </div>
                    <span className="text-sm text-orange-600">{new Date(r.timestamp).toLocaleTimeString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Activité récente</h3>
          <button onClick={exportActivity} className="text-sm text-blue-600 hover:underline">Exporter CSV</button>
        </div>
        <div className="p-6">
          {todayAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {todayAttendance.slice(0, 20).map((record: any) => (
                <div key={record._id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {record.type === 'arrival' ? '🟢' : record.type === 'departure' ? '🔴' : '🟡'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.type === 'arrival' ? 'Arrivée' : record.type === 'departure' ? 'Départ' : `${record.midType} ${record.midDirection}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(record.timestamp).toLocaleTimeString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.timestamp).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteRecord(record._id)}
                      className="text-sm text-red-600 hover:underline"
                      title="Supprimer"
                    >Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {false && (
        /* Company Settings */
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Paramètres entreprise</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Début journée</label>
              <input value={start} onChange={(e) => setStart(e.target.value)} type="time" className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fin journée</label>
              <input value={end} onChange={(e) => setEnd(e.target.value)} type="time" className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tolérance retard (minutes)</label>
              <input value={tol} onChange={(e) => setTol(parseInt(e.target.value || '0', 10))} type="number" min={0} className="border rounded px-3 py-2 w-full" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="reqLoc" checked={requireLoc} onChange={(e) => setRequireLoc(e.target.checked)} type="checkbox" />
              <label htmlFor="reqLoc" className="text-sm text-gray-700">Exiger la localisation</label>
            </div>
            <div className="md:col-span-2">
              <button
                onClick={() => onSaveSettings({ workingHours: { start, end }, toleranceMinutes: tol, requireLocation: requireLoc })}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {false && (
        /* Corrections */
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Corrections manuelles</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Employé</label>
              <select
                value={insertData.employeeId}
                onChange={(e) => setInsertData({ ...insertData, employeeId: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Choisir...</option>
                {employees.map((emp: any) => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={insertData.type}
                onChange={(e) => setInsertData({ ...insertData, type: e.target.value as any })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="arrival">Arrivée</option>
                <option value="mid">Mid</option>
                <option value="departure">Départ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Horodatage</label>
              <input
                type="datetime-local"
                value={insertData.timestamp}
                onChange={(e) => setInsertData({ ...insertData, timestamp: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            {insertData.type === 'mid' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Mid Type</label>
                  <select
                    value={insertData.midType}
                    onChange={(e) => setInsertData({ ...insertData, midType: e.target.value as any })}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="pause">Pause</option>
                    <option value="intervention">Intervention</option>
                    <option value="commission">Commission</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Direction</label>
                  <select
                    value={insertData.midDirection}
                    onChange={(e) => setInsertData({ ...insertData, midDirection: e.target.value as any })}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="start">Début</option>
                    <option value="end">Fin</option>
                  </select>
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <button
                onClick={() => {
                  if (!insertData.employeeId || !insertData.timestamp) return;
                  onInsertRecord({
                    employeeId: insertData.employeeId,
                    type: insertData.type,
                    timestamp: new Date(insertData.timestamp).getTime(),
                    qrCodeId: 'admin',
                    midType: insertData.type === 'mid' ? insertData.midType : undefined,
                    midDirection: insertData.type === 'mid' ? insertData.midDirection : undefined,
                  });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >Ajouter un pointage</button>
            </div>
          </div>
        </div>
      )}

      {/* Per-employee activity section removed from Dashboard (now in EmployeeManagement). */}
    </div>
  );
}
