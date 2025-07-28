import { spring } from "motion";
import { useState } from "react";

export default function WelcomeWidget() {
  const [state, setState] = useState(false);

  return (
    <div className="example-container mb-8">
      <div className="box" data-state={state} />
      <button onClick={() => setState(!state)} className="font-semibold shadow-md hover:scale-105 transition-transform">Surprends-moi !</button>
      <style>{`
        .example-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .example-container .box {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #8df0cc 40%, #4f8cff 100%);
          border-radius: 20px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
          transition: transform ${spring(0.5, 0.8)};
          transform: translateX(-100%);
        }
        .example-container .box[data-state="true"] {
          transform: translateX(100%) rotate(180deg) scale(1.1);
        }
        .example-container button {
          background: linear-gradient(90deg, #8df0cc 60%, #4f8cff 100%);
          color: #0f1115;
          border-radius: 10px;
          padding: 12px 28px;
          margin: 10px;
          font-size: 1rem;
          box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.1);
        }
      `}</style>
    </div>
  );
}
