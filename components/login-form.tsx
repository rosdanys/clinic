"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Lock, Mail } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [year, setYear] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected/dashboard");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos"
            : error.message
          : "Ocurrió un error al iniciar sesión"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-0 w-full max-w-md mx-auto",
        className
      )}
      {...props}
    >
      {/* Header branding */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
            <Activity className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Clinic Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de gestión médica
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground font-display">Iniciar sesión</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresá tus credenciales para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinica.com"
                required
                className="pl-10 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold">
                Contraseña
              </Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="pl-10 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            className="w-full h-11 rounded-xl font-semibold text-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ingresando...
              </span>
            ) : (
              "Ingresar al sistema"
            )}
          </Button>

          {/* <div className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link
              href="/auth/sign-up"
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Registrarse
            </Link>
          </div> */}
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        © {year} Clinic Control · Acceso restringido al personal autorizado
      </p>
    </div>
  );
}
