import QRScanConfirmation from "./QRScanConfirmation";
import React, { useState } from "react";

interface EmployeeConfirmationProps {
  employeeName: string;
  action: "arrival" | "mid" | "departure";
  timestamp: Date;
  location?: { lat: number; lng: number };
  midType?: "pause" | "intervention" | "commission";
  onDone: () => void;
}

const EmployeeConfirmation = ({ employeeName, action, timestamp, location, midType, onDone }: EmployeeConfirmationProps) => {
  const [visible, setVisible] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onDone();
      }, 600); // temps pour l'animation fade-out
    }, 8000); // 8 secondes
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <QRScanConfirmation
        employeeName={employeeName}
        action={action}
        timestamp={timestamp}
        location={location}
        midType={midType}
      />
    </div>
  );
};

export default EmployeeConfirmation;