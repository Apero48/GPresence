"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button className="Btn-logout" onClick={() => void signOut()} title="Déconnexion">
      <span className="sign">
        <svg viewBox="0 0 24 24"><path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-8c-1.1 0-2 .9-2 2v4h2V5h8v14h-8v-4h-2v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
      </span>
      <span className="text">Déconnexion</span>
      <style>{`
        .Btn-logout {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 45px;
          height: 45px;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition-duration: .3s;
          box-shadow: 2px 2px 10px rgba(76,110,245,0.13);
          background: linear-gradient(135deg, #4f8cff 60%, #7c3aed 100%);
        }
        .sign {
          width: 100%;
          transition-duration: .3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sign svg {
          width: 20px;
        }
        .sign svg path {
          fill: white;
        }
        .text {
          position: absolute;
          right: 0%;
          width: 0%;
          opacity: 0;
          color: white;
          font-size: 1.1em;
          font-weight: 600;
          transition-duration: .3s;
        }
        .Btn-logout:hover {
          width: 130px;
          border-radius: 40px;
          transition-duration: .3s;
        }
        .Btn-logout:hover .sign {
          width: 30%;
          transition-duration: .3s;
          padding-left: 18px;
        }
        .Btn-logout:hover .text {
          opacity: 1;
          width: 70%;
          transition-duration: .3s;
          padding-right: 10px;
        }
        .Btn-logout:active {
          transform: translate(2px ,2px);
        }
      `}</style>
    </button>
  );
}
