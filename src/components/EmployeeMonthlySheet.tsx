import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";

export default function EmployeeMonthlySheet() {

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const employees = useQuery(api.employees.getAllEmployees);
  const employee = useMemo(() => employees?.find((e: any) => e._id === id), [employees, id]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const startDate = new Date(`${month}-01T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const attendance = useQuery(api.attendance.getAttendanceHistory, {
    employeeId: id,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  // Group by day
  function groupByDay(records) {
    const days = {};
    records.forEach((rec) => {
      const d = new Date(rec.timestamp);
      const key = d.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { date: key };
      if (rec.type === "arrival") days[key].arrival = rec;
      if (rec.type === "departure") days[key].departure = rec;
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }

  let totalWorked = 0;
  let grouped: any[] = [];
  if (attendance && attendance.length > 0) {
    grouped = groupByDay(attendance);
    grouped.forEach(day => {
      if (day.arrival && day.departure) {
        totalWorked += day.departure.timestamp - day.arrival.timestamp;
      }
    });
  }

  function msToHrsMin(ms) {
    if (!ms) return "0h 00min";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, "0")}min`;
  }

  // Préparer les données à exporter (tableau à plat)
  const exportData = grouped.map(day => ({
    Date: new Date(day.date).toLocaleDateString("fr-FR"),
    "Heure d'arrivée": day.arrival ? new Date(day.arrival.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "-",
    "Heure de départ": day.departure ? new Date(day.departure.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "-",
    Type: day.arrival && day.departure ? "Présence" : day.arrival && !day.departure ? "Retard" : "Absence"
  }));

  function handleExportExcel() {
    exportToExcel(exportData, `Feuille-${employee?.firstName || ''}-${employee?.lastName || ''}-${month}.xlsx`);
  }
  // PDF export supprimé
  function handleExportCSV() {
    exportToCSV(exportData, `Feuille-${employee?.firstName || ''}-${employee?.lastName || ''}-${month}.csv`);
  }

  if (!employee) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-4 sm:p-6 md:p-8 mt-4 sm:mt-6 md:mt-8">
      <div className="flex flex-col gap-4 mb-6">
        {/* Bouton retour style dégradé + ombre */}
        <button
          onClick={() => {
            // Utilisation de navigate avec state pour forcer la vue 'personnel'
            navigate('/', { 
              state: { view: 'personnel' },
              replace: true  // Empêche d'ajouter une nouvelle entrée dans l'historique
            });
          }}
          className="w-fit px-4 sm:px-6 py-2 rounded-2xl font-bold text-base sm:text-lg shadow-lg transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{
            background: 'linear-gradient(120deg, #99f6e4 0%, #60a5fa 100%)',
            color: '#111',
            boxShadow: '0 4px 24px 0 rgba(80,180,255,0.10)'
          }}
        >
          ← Retour
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-teal-200 to-blue-400 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-md">
            {(employee.firstName?.[0]?.toUpperCase() || "") + (employee.lastName?.[0]?.toUpperCase() || "")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{employee.firstName} {employee.lastName}</div>
            <div className="text-gray-500 text-sm sm:text-base">{employee.role === 'admin' ? 'Administrateur' : 'Employé'}</div>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
              <select
                className="border rounded px-3 py-1 text-lg font-semibold"
                value={month}
                onChange={e => setMonth(e.target.value)}
              >
                {/* Générer les 12 derniers mois */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  return <option key={val} value={val}>{d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</option>;
                })}
              </select>
              <span className="text-lg font-semibold text-gray-700">Total heures travaillées : {msToHrsMin(totalWorked)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Heure d'arrivée</th>
              <th className="px-4 py-2">Heure de départ</th>
              <th className="px-4 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-6">Aucune donnée pour ce mois.</td></tr>
            ) : (
              grouped.map((day) => {
                const date = new Date(day.date).toLocaleDateString("fr-FR");
                const arrival = day.arrival ? new Date(day.arrival.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "-";
                const departure = day.departure ? new Date(day.departure.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "-";
                let type = "Absence";
                if (day.arrival && day.departure) type = "Présence";
                else if (day.arrival && !day.departure) type = "Retard";
                return (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{date}</td>
                    <td className="px-4 py-2">{arrival}</td>
                    <td className="px-4 py-2">{departure}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${type === 'Présence' ? 'bg-green-100 text-green-700' : type === 'Retard' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{type}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 justify-end mt-6">
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
        >
          <span>📊</span> Exporter Excel
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>🗂️</span> Exporter CSV
        </button>
      </div>
    </div>
  );
}
