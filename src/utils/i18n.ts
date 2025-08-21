type Dict = Record<string, string>;

const fr: Dict = {
  'admin.dashboard.title': 'Tableau de bord administrateur',
  'admin.dashboard.subtitle': 'Gérez les présences et les employés',
  'report.print': 'Imprimer PDF',
  'report.title': 'Rapport de présence',
  'report.generatedAt': 'Généré le',
  'report.kpis': 'Indicateurs du jour',
  'report.arrivals': 'Arrivées',
  'report.departures': 'Départs',
  'report.present': 'Présents',
  'report.totalEmployees': 'Total employés',
  'report.settings': 'Paramètres entreprise',
  'report.workingHours': 'Heures de travail (début)',
  'report.workingHoursEnd': 'Heures de travail (fin)',
  'report.tolerance': 'Tolérance retard (min)',
  'report.requireLocation': 'Exiger la localisation',
  'report.lateArrivals': "Retards d'arrivée",
  'report.overages': 'Dépassements de pause (> 60 min)',
  'report.activity': "Activité du jour",
  'report.employee': 'Employé',
  'report.pauseMinutes': 'Minutes de pause',
  'report.type': 'Type',
  'report.timestamp': 'Horodatage',
  'report.exportCSV': 'Exporter CSV',
  'report.noOverages': "Aucun dépassement aujourd'hui",
  'report.noLateArrivals': "Aucun retard aujourd'hui",
  'report.noActivity': "Aucune activité aujourd'hui",
  'report.saveSettings': 'Enregistrer',
  'report.corrections': 'Corrections manuelles',
  'report.arrival': 'Arrivée',
  'report.mid': 'Mid',
  'report.departure': 'Départ',
  'report.midType': 'Type de mid',
  'report.midDirection': 'Direction',
  'report.pause': 'Pause',
  'report.intervention': 'Intervention',
  'report.commission': 'Commission',
  'report.start': 'Début',
  'report.end': 'Fin',
  'report.addPointage': 'Ajouter un pointage',
  'report.overview': "Vue d'ensemble",
};

let current: Dict = fr;

export function t(key: string, params?: Record<string, string | number>): string {
  let str = current[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
  }
  return str;
}

export function setLocaleDict(dict: Dict) {
  current = { ...fr, ...dict };
}

export default t;
