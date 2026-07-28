"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, Lock, Mail, Stethoscope, User } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/protected/dashboard`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn("flex flex-col gap-0 w-full max-w-md mx-auto", className)}
      {...props}
    >
      {/* Header branding */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
            <Heart className="h-2.5 w-2.5 text-white fill-white" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Clinic Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crear nueva cuenta
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Registro</h2>
          <p className="text-sm text-muted-foreground mt-1">
            El primer usuario registrado obtendrá rol de Administrador
          </p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email institucional
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinica.com"
                required
                className="pl-10 rounded-xl h-11 border-border/60 bg-background/50 focus:border-emerald-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                className="pl-10 rounded-xl h-11 border-border/60 bg-background/50 focus:border-emerald-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="repeat-password" className="text-sm font-semibold">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="repeat-password"
                type="password"
                placeholder="Repetí la contraseña"
                required
                className="pl-10 rounded-xl h-11 border-border/60 bg-background/50 focus:border-emerald-500 transition-all"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando cuenta...
              </span>
            ) : (
              "Crear cuenta"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/auth/login"
              className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        © {new Date().getFullYear()} Clinic Control · Acceso restringido al personal autorizado
      </p>
    </div>
  );
}
