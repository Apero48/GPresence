import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import QRCodePdfButton from "./admin/QRCodePdfButton";

export function QRCodeGenerator() {
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const activeQRCode = useQuery(api.qrCodes.getActiveQRCode);
  const generateQRCode = useMutation(api.qrCodes.generateQRCode);

  const handleGenerate = async () => {
    try {
      await generateQRCode({ expiresInHours });
      toast.success("QR Code généré avec succès!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la génération");
    }
  };

  const qrValue = activeQRCode ? activeQRCode.code : '';

  const downloadQR = () => {
    if (!activeQRCode) return;
    
    // Get the QR code SVG from the DOM
    const qrSvg = document.querySelector('svg');
    if (!qrSvg) return;
    
    // Simple download - just download the SVG
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `qr-code-pointage-${activeQRCode.code}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const printQR = async () => {
    if (!activeQRCode) return;
    try {
      const QR = await import('qrcode');
      // Génère une image haute résolution pour une impression nette
      const dataUrl: string = await QR.toDataURL(qrValue, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 1024, // haute résolution pour l'impression
        color: { dark: '#000000', light: '#ffffff' },
      } as any);

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = `
        <html>
          <head>
            <title>QR Code Pointage</title>
            <style>
              @page { size: A4; margin: 16mm; }
              body { font-family: Arial, sans-serif; text-align: center; }
              .wrapper { display: flex; flex-direction: column; align-items: center; }
              h1 { margin: 0 0 8mm; font-size: 18pt; }
              .meta { margin-top: 6mm; font-size: 11pt; }
              img.qr { width: 120mm; height: 120mm; object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <h1>QR Code Pointage</h1>
              <img class="qr" src="${dataUrl}" alt="QR Code" />
              <div class="meta"><strong>Code:</strong> ${activeQRCode.code}</div>
              <div class="meta"><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function(){ window.print(); window.close(); }, 300);
              };
            </script>
          </body>
        </html>`;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (e) {
      console.error('Erreur impression QR:', e);
      alert("Impossible d'imprimer correctement le QR. Essayez l'export PDF.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Génération QR Code</h1>
        <p className="text-gray-600">Générez et gérez les QR codes pour le pointage</p>
      </div>

      {/* Generate New QR Code */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Générer un nouveau QR Code</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée de validité (heures)
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 heure</option>
              <option value={8}>8 heures</option>
              <option value={24}>24 heures</option>
              <option value={168}>1 semaine</option>
              <option value={0}>Permanent</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            🔄 Générer nouveau QR Code
          </button>
        </div>
      </div>

      {/* Current QR Code */}
      {activeQRCode && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code actuel</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Display */}
            <div className="text-center">
              <div className="w-64 h-64 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-4 p-4">
                <QRCodeSVG 
                  value={qrValue}
                  size={224}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              <div className="space-y-2">
                <QRCodePdfButton
                  title="QR de Pointage"
                  subtitle={`Code: ${activeQRCode.code}`}
                  qrText={qrValue}
                  fileName={`qr-${activeQRCode.code}`}
                  buttonText="📄 Télécharger PDF"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center"
                />
                <button
                  onClick={printQR}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  🖨️ Imprimer
                </button>
              </div>
            </div>

            {/* QR Code Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code QR:</label>
                <div className="p-2 bg-gray-50 rounded border font-mono text-sm">
                  {activeQRCode.code}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut:</label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🟢 Actif
                  </span>
                </div>
              </div>

              {activeQRCode.expiresAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expire le:</label>
                  <div className="text-sm text-gray-600">
                    {new Date(activeQRCode.expiresAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Créé le:</label>
                <div className="text-sm text-gray-600">
                  {new Date(activeQRCode._creationTime).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">📋 Instructions d'utilisation</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Imprimez le QR code et affichez-le à l'entrée de votre entreprise</p>
          <p>• Les employés peuvent scanner le code avec leur téléphone</p>
          <p>• Le système enregistre automatiquement les arrivées et départs</p>
          <p>• Générez un nouveau QR code régulièrement pour plus de sécurité</p>
        </div>
      </div>
    </div>
  );
}
