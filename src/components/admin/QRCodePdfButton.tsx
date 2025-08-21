import React from 'react';

// Lazy import to keep bundle small and avoid SSR issues
async function loadDeps() {
  const [{ jsPDF }, QR] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);
  return { jsPDF, QR } as { jsPDF: any; QR: any };
}

export type QRCodePdfButtonProps = {
  title?: string;
  subtitle?: string;
  qrText: string; // the content encoded in the QR (e.g., QR code id / URL)
  footerNote?: string;
  fileName?: string; // default derived from title or 'qr-code'
  className?: string;
  buttonText?: string;
};

export default function QRCodePdfButton({
  title = 'QR Code',
  subtitle,
  qrText,
  footerNote = 'Présentez ce QR au scanner pour enregistrer le pointage.',
  fileName,
  className,
  buttonText = 'Exporter en PDF',
}: QRCodePdfButtonProps) {
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    try {
      setBusy(true);
      const { jsPDF, QR } = await loadDeps();

      // Generate QR as data URL
      const qrDataUrl: string = await QR.toDataURL(qrText, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 800,
        color: { dark: '#000000', light: '#ffffff' },
      });

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48; // 48pt ~ 16mm

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(title, pageW / 2, margin, { align: 'center' });

      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(subtitle, pageW / 2, margin + 20, { align: 'center' });
      }

      // QR area (square, centered)
      const qrSize = Math.min(pageW - 2 * margin, pageH - 2 * margin - 120); // leave room for header/footer
      const qrX = (pageW - qrSize) / 2;
      const qrY = (pageH - qrSize) / 2 - 20;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');

      // Footer: human-readable content + note
      const footerY = qrY + qrSize + 28;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const readable = `Contenu: ${qrText}`;
      const splitReadable = doc.splitTextToSize(readable, pageW - 2 * margin);
      doc.text(splitReadable, margin, footerY);

      doc.setFontSize(10);
      const noteY = footerY + (Array.isArray(splitReadable) ? splitReadable.length * 14 : 16) + 8;
      const splitNote = doc.splitTextToSize(footerNote, pageW - 2 * margin);
      doc.text(splitNote, margin, noteY);

      // Save
      const safeTitle = (fileName || title || 'qr-code')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      doc.save(`${safeTitle || 'qr-code'}.pdf`);
    } catch (e) {
      console.error('QR PDF generation failed', e);
      alert("Impossible de générer le PDF du QR. Vérifiez la console pour plus d'informations.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={className || 'px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50'}
    >
      {busy ? 'Génération…' : (buttonText || 'Exporter en PDF')}
    </button>
  );
}
