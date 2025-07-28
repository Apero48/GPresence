import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function AttendanceHistory() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const employees = useQuery(api.employees.getAllEmployees);
  const attendanceHistory = useQuery(api.attendance.getAttendanceHistory, {
    employeeId: selectedEmployee ? (selectedEmployee as Id<"employees">) : undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
  });

  if (!employees || !attendanceHistory) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter by type
  const filteredHistory = typeFilter 
    ? attendanceHistory.filter(record => record.type === typeFilter)
    : attendanceHistory;

  const exportToCSV = () => {
    const headers = ['Date', 'Heure', 'Employé', 'Type', 'Département'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(record => [
        new Date(record.timestamp).toLocaleDateString('fr-FR'),
        new Date(record.timestamp).toLocaleTimeString('fr-FR'),
        `"${record.employee?.firstName} ${record.employee?.lastName}"`,
        record.type === 'arrival' ? 'Arrivée' : 'Départ',
        `"${record.employee?.department || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique-pointage-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des pointages</h1>
          <p className="text-gray-600">Consultez et exportez l'historique des présences</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          📥 Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les employés</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              <option value="arrival">Arrivées</option>
              <option value="departure">Départs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Résultats ({filteredHistory.length} enregistrements)
          </h3>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun enregistrement trouvé pour les critères sélectionnés
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Département
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((record) => (
                  <tr key={record._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {new Date(record.timestamp).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-gray-500">
                          {new Date(record.timestamp).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600">
                            {record.employee?.firstName?.[0]}{record.employee?.lastName?.[0]}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee?.firstName} {record.employee?.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        record.type === 'arrival'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <span className="mr-1">
                          {record.type === 'arrival' ? '🟢' : '🔴'}
                        </span>
                        {record.type === 'arrival' ? 'Arrivée' : 'Départ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.employee?.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.location ? '📍 Vérifiée' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
