"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const createEmployee = useMutation(api.employees.createEmployeeOnSignup);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {flow === "signIn" ? "Connexion" : "Créer un compte"}
      </h2>
      
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          
          const formData = new FormData(e.target as HTMLFormElement);
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          const name = formData.get("name") as string;

          try {
            if (flow === "signUp") {
              // 1. Créer le compte utilisateur
              await signIn("password", { 
                email, 
                password,
                name,
                signUp: true
              });
              
              // 2. Se connecter automatiquement
              await signIn("password", { email, password });
              
              toast.success("Compte créé avec succès !");
            } else {
              // Connexion standard
              await signIn("password", { email, password });
            }
          } catch (error: any) {
            console.error("Erreur d'authentification :", error);
            let errorMessage = "Erreur lors de la création du compte";
            
            if (error.data?.code === 'UserAlreadyExists') {
              errorMessage = "Un compte avec cet email existe déjà";
            } else if (error.data?.code === 'InvalidSignup') {
              errorMessage = "Informations d'inscription invalides";
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            toast.error(errorMessage);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {flow === "signUp" && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Jean Dupont"
              disabled={submitting}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="votre@email.com"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            {flow === "signIn" && (
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800">
                Mot de passe oublié ?
              </a>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
            disabled={submitting}
          />
          {flow === "signUp" && (
            <p className="mt-1 text-xs text-gray-500">
              Le mot de passe doit contenir au moins 8 caractères.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {flow === "signIn" ? "Connexion en cours..." : "Création du compte..."}
            </>
          ) : (
            flow === "signIn" ? "Se connecter" : "Créer un compte"
          )}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <p className="text-gray-600">
          {flow === "signIn" 
            ? "Pas encore de compte ? " 
            : "Déjà un compte ? "}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              // Reset form state
              const form = document.querySelector('form');
              if (form) form.reset();
            }}
            disabled={submitting}
          >
            {flow === "signIn" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
