import React from "react";

export default function OfflineNotice() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
      <img src="/logo-msa.png" alt="Logo" className="w-32 mb-6 drop-shadow-lg" />
      <h1 className="text-2xl font-bold mb-2">Vous êtes hors-ligne</h1>
      <p className="text-gray-600 mb-4">
        Cette application nécessite une connexion Internet pour fonctionner.<br />
        Veuillez vérifier votre connexion réseau.<br />
        Les actions réalisées hors-ligne seront synchronisées automatiquement à la reconnexion.
      </p>
      <span className="text-xs text-gray-400">Mode déconnecté</span>
    </div>
  );
} 