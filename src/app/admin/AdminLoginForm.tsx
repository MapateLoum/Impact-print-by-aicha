"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setMessage("Connexion impossible : vérifiez votre adresse e-mail et votre mot de passe.");
      setIsSubmitting(false);
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      const { error: signOutError } = await supabase.auth.signOut();
      setMessage(signOutError
        ? `Impossible de vérifier le compte et de fermer la session : ${signOutError.message}`
        : "Impossible de vérifier le compte connecté. Réessayez.");
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || !["admin", "staff"].includes(profile.role)) {
      const { error: signOutError } = await supabase.auth.signOut();
      const reason = profileError
        ? `Impossible de vérifier les droits du compte : ${profileError.message}`
        : "Ce compte n’a pas accès à l’administration.";
      setMessage(signOutError ? `${reason} La fermeture de session a échoué : ${signOutError.message}` : reason);
      setIsSubmitting(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <Link className="admin-login-brand" href="/">
          <img src="/logo-impact-print.svg?v=3" alt="Impact Print by Aicha" />
        </Link>
        <span className="admin-icon"><LockKeyhole size={24} /></span>
        <span className="eyebrow">Espace sécurisé</span>
        <h1>Administration</h1>
        <p>Connectez-vous avec le compte autorisé pour gérer la boutique.</p>
        <label className="admin-field">
          Adresse e-mail
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <div className="admin-field">
          <label htmlFor="admin-password">Mot de passe</label>
          <div className="admin-password-input">
            <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
            <button
              className="admin-password-toggle"
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>
        {message && <p className="admin-feedback admin-feedback-error" role="alert">{message}</p>}
        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </button>
        <Link className="admin-back-link" href="/">Retour à la boutique</Link>
      </form>
    </main>
  );
}
