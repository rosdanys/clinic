"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser, UserRole } from "@/components/providers/app-providers";
import {
  Settings,
  Users,
  Building,
  Shield,
  CreditCard,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<"usuarios" | "catalogos" | "clinica">("usuarios");

  // Estado para creación de usuario
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("Recepción");
  const [userPhone, setUserPhone] = useState("");
  const [userSpecialty, setUserSpecialty] = useState("");

  // Cargar lista de usuarios/perfiles del sistema
  const { data: usersList, isLoading: usersLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Cargar aseguradoras
  const { data: insurances } = useQuery({
    queryKey: ["settings-insurances"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_providers").select("*");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Cargar procedimientos
  const { data: procedures } = useQuery({
    queryKey: ["settings-procedures"],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("*");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Mutación para invitar/registrar nuevo usuario en perfiles
  // Nota: En producción esto crearía en auth.users, pero aquí creamos el perfil público mock o asociamos
  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Simulamos la creación insertando un perfil con un UUID aleatorio
      const tempId = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
        id: tempId,
        email: userEmail,
        name: userName,
        role: userRole,
        phone: userPhone,
        specialty: userSpecialty || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      setShowUserModal(false);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      setUserSpecialty("");
      alert("Usuario registrado con éxito en los perfiles.");
    }
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    createUserMutation.mutate();
  };

  // Protección de página
  if (profile?.role !== "Admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm max-w-sm font-medium">
          Solo los Administradores de la clínica tienen permisos para configurar catálogos, horarios y usuarios del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Administración de accesos, roles, aseguradoras y datos maestros.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md shadow-sm w-fit">
        {[
          { id: "usuarios", name: "Usuarios y Roles", icon: Users },
          { id: "catalogos", name: "Catálogos Maestros", icon: Shield },
          { id: "clinica", name: "Datos de la Clínica", icon: Building },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-2"
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Tab 1: Usuarios y Roles */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                onClick={() => setShowUserModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Registrar Usuario
              </Button>
            </div>

            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-4 px-6">Nombre</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6">Rol</th>
                        <th className="py-4 px-6">Teléfono</th>
                        <th className="py-4 px-6">Especialidad</th>
                        <th className="py-4 px-6">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-muted-foreground">
                            Cargando usuarios...
                          </td>
                        </tr>
                      ) : usersList?.map((u: any) => (
                        <tr key={u.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-foreground">{u.name}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.email}</td>
                          <td className="py-4 px-6">
                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.phone || "N/A"}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.specialty || "N/A"}</td>
                          <td className="py-4 px-6">
                            <Badge className={`border-0 font-bold ${u.is_active ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                              {u.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Catálogos Maestros */}
        {activeTab === "catalogos" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Aseguradoras */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
                <div>
                  <CardTitle className="text-base font-bold">Aseguradoras médicas</CardTitle>
                  <CardDescription>Catálogo de seguros autorizados.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {insurances?.map((ins: any) => (
                  <div key={ins.id} className="flex justify-between items-center py-3.5 px-6 hover:bg-muted/10 transition-colors">
                    <span className="font-semibold text-foreground">{ins.name}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Procedimientos */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
                <div>
                  <CardTitle className="text-base font-bold">Procedimientos y Costos</CardTitle>
                  <CardDescription>Catálogo de servicios y aranceles.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {procedures?.map((proc: any) => (
                  <div key={proc.id} className="flex justify-between items-center py-3.5 px-6 hover:bg-muted/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{proc.name}</span>
                      <span className="text-xs text-muted-foreground font-bold text-green-500">${proc.cost.toFixed(2)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Datos de la Clínica */}
        {activeTab === "clinica" && (
          <Card className="border-border/60 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Datos Generales de la Clínica</CardTitle>
              <CardDescription>Información institucional y comercial para facturas y recibos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="cli-name">Nombre Comercial</Label>
                <Input id="cli-name" type="text" className="rounded-xl font-semibold" defaultValue="Centro Médico Antigravity" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cli-address">Dirección Física</Label>
                <Input id="cli-address" type="text" className="rounded-xl" defaultValue="Av. del Libertador 4500, Palermo, CABA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cli-phone">Teléfono de Atención</Label>
                  <Input id="cli-phone" type="text" className="rounded-xl" defaultValue="(011) 4899-0000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cli-hours">Horarios de Atención</Label>
                  <Input id="cli-hours" type="text" className="rounded-xl" defaultValue="Lunes a Viernes 08:00 - 18:00 hs" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border/40">
                <Button className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold px-6">
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Registrar Perfil de Usuario
              </CardTitle>
              <CardDescription>Agregar un nuevo personal al sistema.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateUser}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="user-name">Nombre Completo</Label>
                  <Input
                    id="user-name"
                    type="text"
                    placeholder="Ej: Lic. Mariana López"
                    className="rounded-xl"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="mariana.lopez@clinica.com"
                    className="rounded-xl"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Rol / Acceso</Label>
                  <select
                    id="user-role"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                  >
                    <option value="Recepción">Recepción</option>
                    <option value="Médico">Médico / Especialista</option>
                    <option value="Especialista">Especialista Externo</option>
                    <option value="Admin">Administrador (Acceso Total)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-phone">Teléfono</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    placeholder="11-2233-4455"
                    className="rounded-xl"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>
                {(userRole === "Médico" || userRole === "Especialista") && (
                  <div className="grid gap-2 animate-fadeIn">
                    <Label htmlFor="user-spec">Especialidad</Label>
                    <Input
                      id="user-spec"
                      type="text"
                      placeholder="Cardiología, Pediatría..."
                      className="rounded-xl"
                      value={userSpecialty}
                      onChange={(e) => setUserSpecialty(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border/80"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                  disabled={createUserMutation.isPending}
                >
                  Registrar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
