import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function EmployeeView({ setCurrentView }: { 
  setCurrentView: (view: 'dashboard' | 'employee' | 'scanner' | 'confirmation') => void;
}) {
  const employee = useQuery(api.employees.getCurrentEmployee);
  const myAttendance = useQuery(api.attendance.getMyAttendance, { limit: 20 });

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
                    {record.type === 'arrival' ? '🟢' : '🔴'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.type === 'arrival' ? 'Arrivée' : 'Départ'}
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
                    {record.type === 'arrival' ? '🟢' : '🔴'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.type === 'arrival' ? 'Arrivée' : 'Départ'}
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
    </div>
  );
}
