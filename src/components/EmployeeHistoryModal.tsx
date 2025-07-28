import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

export function EmployeeHistoryModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const startDate = new Date(`${month}-01T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const attendance = useQuery(api.attendance.getAttendanceHistory, {
    employeeId: employee._id,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  // Regrouper par jour
  function groupByDay(records: any[]) {
    const days: Record<string, { date: string, arrival?: any, departure?: any }> = {};
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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full relative overflow-hidden"
          initial={{ scale: 0.8, y: 100, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl transition-colors"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-blue-700 mb-1 animate-fade-in">Historique de {employee.firstName} {employee.lastName}</h2>
            <p className="text-gray-500 text-sm">{employee.department || "-"}</p>
            <div className="mt-2">
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="mb-4 flex flex-col items-center">
            <span className="text-4xl mb-2 animate-bounce">⏱️</span>
            <p className="text-lg font-semibold text-gray-700">Total heures travaillées :</p>
            <p className="text-2xl font-bold text-green-600 animate-pulse">
              {msToHrsMin(totalWorked)}
            </p>
            <button
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              // onClick={handleExport}
              title="Exporter les données (à venir)"
              disabled
            >
              🟢 Word <span className="text-xs">.docx</span>
              🟡 Excel <span className="text-xs">.xlsx</span>
              🔴 PDF <span className="text-xs">.pdf</span>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto animate-fade-in">
            {attendance ? (
              grouped.length === 0 ? (
                <p className="text-gray-400 text-center">Aucune donnée pour ce mois.</p>
              ) : (
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr>
                      <th className="text-left py-1">Date</th>
                      <th className="text-left py-1">Heure d'arrivée</th>
                      <th className="text-left py-1">Heure de départ</th>
                      <th className="text-left py-1">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((day: any) => {
                      const date = new Date(day.date).toLocaleDateString("fr-FR");
                      const arrival = day.arrival ? new Date(day.arrival.timestamp).toLocaleTimeString("fr-FR") : "-";
                      const departure = day.departure ? new Date(day.departure.timestamp).toLocaleTimeString("fr-FR") : "-";
                      let type = "Absence";
                      let color = "bg-gray-100 text-gray-700";
                      let icon = "❌";
                      if (day.arrival && day.departure) {
                        type = "Présence";
                        color = "bg-green-100 text-green-800";
                        icon = "🟢";
                      } else if (day.arrival && !day.departure) {
                        type = "Retard";
                        color = "bg-yellow-100 text-yellow-800";
                        icon = "🟡";
                      }
                      return (
                        <tr key={day.date} className="hover:bg-blue-50 transition-colors">
                          <td>{date}</td>
                          <td>{arrival}</td>
                          <td>{departure}</td>
                          <td>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${color}`}>
                              <span>{icon}</span> {type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


function msToHrsMin(ms: number) {
  if (!ms) return "0h 00min";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}
