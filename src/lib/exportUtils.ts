// Utilitaires d'export pour Excel et PDF
import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Feuille');
  XLSX.writeFile(wb, filename);
}

export function exportToCSV(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Pour PDF, on utilisera jsPDF
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToPDF(data: any[], filename: string) {
  const doc = new jsPDF();
  if (data.length === 0) {
    doc.text('Aucune donnée à exporter', 10, 10);
  } else {
    const columns = Object.keys(data[0]);
    const rows = data.map(row => columns.map(col => row[col]));
    doc.autoTable({ head: [columns], body: rows });
  }
  doc.save(filename);
}
