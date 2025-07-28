import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function EmployeeSimpleHistory() {
  const myAttendance = useQuery(api.attendance.getMyAttendance, { limit: 100 });

  if (!myAttendance) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 mt-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Mon historique de pointage</h2>
      {myAttendance.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Aucune activité enregistrée</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Heure</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {myAttendance.map((record: any) => (
                <tr key={record._id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-2">{new Date(record.timestamp).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{new Date(record.timestamp).toLocaleTimeString('fr-FR')}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.type === 'arrival' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {record.type === 'arrival' ? 'Arrivée' : 'Départ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
