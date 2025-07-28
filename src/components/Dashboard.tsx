import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { EmployeeManagement } from "./EmployeeManagement";
import { AttendanceHistory } from "./AttendanceHistory";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'qr' | 'history'>('overview');
  const todayAttendance = useQuery(api.attendance.getTodayAttendance);
  const employees = useQuery(api.employees.getAllEmployees);
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
      <OverviewTab todayAttendance={todayAttendance} employees={employees} />
    </div>
  );
}

function OverviewTab({ todayAttendance, employees }: { todayAttendance: any; employees: any }) {
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Arrivées</p>
              <p className="text-2xl font-bold text-gray-900">{arrivals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">🔴</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Départs</p>
              <p className="text-2xl font-bold text-gray-900">{departures.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Présents</p>
              <p className="text-2xl font-bold text-gray-900">{present}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-2xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total employés</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Activité récente</h3>
        </div>
        <div className="p-6">
          {todayAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {todayAttendance.slice(0, 10).map((record: any) => (
                <div key={record._id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {record.type === 'arrival' ? '🟢' : '🔴'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.type === 'arrival' ? 'Arrivée' : 'Départ'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(record.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.timestamp).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
