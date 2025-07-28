import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmployeeHistoryModal } from "./EmployeeHistoryModal";

export default function PersonnelList({ setCurrentView }: { setCurrentView: (view: string, employeeId?: string) => void }) {
  const navigate = useNavigate();
  const employees = useQuery(api.employees.getAllEmployees);
  const todayAttendance = useQuery(api.attendance.getTodayAttendance);
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!employees || !todayAttendance) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  // Vérifie la présence réelle aujourd'hui (arrivée non suivie d'un départ)
  const isActive = (emp: any) => {
    const records = todayAttendance.filter((rec: any) => rec.employee?._id === emp._id);
    if (records.length === 0) return false;
    // On considère "actif" si le dernier pointage du jour est une arrivée
    const last = records.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
    return last?.type === 'arrival';
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Liste du personnel</h2>
      <div className="space-y-2">
        {employees.map((emp: any) => (
          <button
            key={emp._id}
            onClick={() => navigate(`/feuille-employe/${emp._id}`)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl bg-white shadow border transition hover:scale-[1.02] hover:shadow-lg ${selected === emp._id ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-gray-200 ${isActive(emp) ? 'ring-4 ring-green-400 animate-pulse' : ''}`}>
                {emp.photoUrl ? (
                  <img src={emp.photoUrl} alt={emp.firstName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  (emp.firstName?.[0]?.toUpperCase() || '') + (emp.lastName?.[0]?.toUpperCase() || '?')
                )}
              </div>
              {isActive(emp) && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-ping"></span>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 text-lg">{emp.firstName} {emp.lastName}</div>
              <div className="text-xs text-gray-500">{emp.role === 'admin' ? 'Administrateur' : 'Employé'}</div>
            </div>
            {isActive(emp) && <span className="text-green-600 font-bold animate-pulse">Actif</span>}
          </button>
        ))}
      </div>
      {/* Plus de modal, navigation vers la fiche mensuelle */}
    </div>
  );
}