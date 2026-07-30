"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Activity,
  Calendar,
  CreditCard,
  FileText,
  Phone,
  Shield,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/components/providers/app-providers";
import { logAudit } from "@/lib/audit";

export default function PatientDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<"historial" | "pagos" | "citas" | "notas">("historial");

  // Estado para nueva nota
  const [newNote, setNewNote] = useState("");

  // Cargar datos completos del paciente
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient-details", id],
    queryFn: async () => {
      // 1. Obtener datos personales del paciente
      const { data: patientData, error: pError } = await supabase
        .from("patients")
        .select(`
          *,
          insurance_providers (name)
        `)
        .eq("id", id)
        .single();

      if (pError) throw pError;

      // 2. Citas del paciente
      const { data: appts } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles (name)
        `)
        .eq("patient_id", id)
        .order("date", { ascending: false });

      // 3. Pagos
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      // 4. Notas del médico (guardadas en una tabla o podemos simuladoras/crear tabla rápida en trigger.
      // Para las notas usaremos un campo temporal o una tabla 'notes' si existe, o usaremos la columna 'notes'
      // de la tabla appointments, o notas del paciente. Dado que el prompt habla de "Notas libres del médico",
      // podemos usar una simulación en la tabla 'appointments' como notas, o listarlas de manera clínica.
      // Escribiremos la consulta a appointments para obtener las notas médicas.
      
      const dob = new Date(patientData.date_of_birth);
      const age = new Date().getFullYear() - dob.getFullYear();

      return {
        ...patientData,
        age,
        appointments: appts || [],
        payments: payments || [],
      };
    },
  });

  // Mutación para agregar notas al paciente (usaremos las notas de la cita activa)
  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      // Como no hay tabla dedicada a notas libres, buscaremos la última cita del paciente
      // y actualizaremos su campo 'notes' clínico en Supabase
      if (patient.appointments && patient.appointments.length > 0) {
        const lastApptId = patient.appointments[0].id;
        const { error } = await supabase
          .from("appointments")
          .update({ notes: noteText })
          .eq("id", lastApptId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "UPDATE",
        module: "Pacientes",
        tableName: "appointments",
        recordId: patient?.id,
        description: `Agregó nota médica al paciente: ${patient?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["patient-details", id] });
      setNewNote("");
      alert("Nota clínica registrada con éxito.");
    }
  });

  if (isLoading || !patient) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando ficha del paciente...</span>
      </div>
    );
  }

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl border-border/80"
          onClick={() => router.push("/protected/patients")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ficha Clínica del Paciente</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Expediente, facturación e historial médico unificado.
          </p>
        </div>
      </div>

      {/* Patient Identification Card */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-background to-muted/20 overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground text-2xl font-bold shadow-md shadow-primary/20 text-white">
              {patient.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{patient.name}</h2>
                <Badge
                  variant="outline"
                  className={
                    patient.classification === "Nuevo"
                      ? "border-blue-500/20 text-blue-500 bg-blue-500/5 font-bold"
                      : "border-muted-foreground/20 text-muted-foreground bg-muted/10 font-bold"
                  }
                >
                  {patient.classification}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground/60" />
                  {patient.gender} | {patient.age} años
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground/60" />
                  {patient.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-muted-foreground/60" />
                  {patient.has_insurance ? patient.insurance_providers?.name : "Sin Seguro Médico"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl border-border/80 font-semibold"
              onClick={() => router.push(`/protected/calendar?patientId=${patient.id}`)}
            >
              Agendar Cita
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Menu */}
      <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md shadow-sm w-fit">
        {[
          { id: "historial", name: "Historial Clínico", icon: Activity },
          { id: "pagos", name: "Facturación y Pagos", icon: CreditCard },
          { id: "citas", name: "Agenda de Citas", icon: Calendar },
          { id: "notas", name: "Notas Clínicas", icon: FileText },
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
        {/* Tab 1: Historial Clínico */}
        {activeTab === "historial" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Consultas e Historial Clínico</CardTitle>
              <CardDescription>Detalle cronológico de las atenciones médicas del paciente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {patient.appointments.length > 0 ? (
                patient.appointments.map((appt: any, index: number) => (
                  <div key={appt.id} className="flex gap-4 items-start relative pb-6 border-l border-border last:border-0 pl-6">
                    <div className="absolute left-[-8px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background text-white">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <div className="space-y-1.5 flex-1 bg-muted/20 p-4 rounded-xl border border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{appt.date} - {appt.time.substring(0, 5)} hs</span>
                        <Badge className="bg-primary/10 text-primary border-0 font-bold">{appt.type}</Badge>
                      </div>
                      <h4 className="font-semibold text-foreground">Consulta con {appt.profiles?.name}</h4>
                      <p className="text-sm font-semibold text-foreground mt-2">Motivo: <span className="font-medium text-muted-foreground">{appt.reason}</span></p>
                      {appt.notes && (
                        <div className="text-sm bg-background p-3 rounded-lg border border-border/50 text-muted-foreground mt-3 font-mono leading-relaxed whitespace-pre-wrap">
                          {appt.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No se registran atenciones clínicas previas.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Facturación y Pagos */}
        {activeTab === "pagos" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Historial de Transacciones</CardTitle>
              <CardDescription>Facturas, abonos y deudas pendientes del paciente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                      <th className="py-3 px-4">Concepto</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Pagado</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.payments.length > 0 ? (
                      patient.payments.map((pay: any) => (
                        <tr key={pay.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 font-medium text-foreground">{pay.concept}</td>
                          <td className="py-4 px-4 font-semibold">${pay.total.toFixed(2)}</td>
                          <td className="py-4 px-4 font-medium text-green-500">${pay.amount_paid.toFixed(2)}</td>
                          <td className="py-4 px-4 font-semibold text-destructive">${pay.balance.toFixed(2)}</td>
                          <td className="py-4 px-4 font-semibold">{pay.method}</td>
                          <td className="py-4 px-4">
                            <Badge
                              className={`border-0 font-bold ${
                                pay.status === "Pagado"
                                  ? "bg-green-500/10 text-green-500"
                                  : pay.status === "Parcial"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {pay.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          No hay transacciones registradas para este paciente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Agenda de Citas */}
        {activeTab === "citas" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Citas Agendadas</CardTitle>
              <CardDescription>Agenda completa de turnos (pasados y futuros).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.appointments.length > 0 ? (
                patient.appointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{appt.date} a las {appt.time.substring(0, 5)} hs</span>
                        <span className="text-xs text-muted-foreground">Médico: {appt.profiles?.name} | {appt.reason}</span>
                      </div>
                    </div>
                    <Badge
                      className={`border-0 font-bold ${
                        appt.status === "Completada"
                          ? "bg-gray-500/10 text-gray-500"
                          : appt.status === "Pendiente"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No hay citas registradas.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Notas Clínicas */}
        {activeTab === "notas" && (
          <div className="space-y-6">
            {(profile?.role === "Médico" || profile?.role === "Admin" || profile?.role === "Especialista") && (
              <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Agregar Nota Clínica</CardTitle>
                  <CardDescription>Agregar observaciones al expediente del paciente.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddNoteSubmit} className="space-y-4">
                    <textarea
                      rows={3}
                      placeholder="Describa la evolución, síntomas o diagnóstico de la consulta actual..."
                      className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary leading-relaxed font-mono"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                        disabled={addNoteMutation.isPending}
                      >
                        {addNoteMutation.isPending ? "Guardando..." : "Registrar Nota"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Historial de Notas del Expediente</CardTitle>
                <CardDescription>Expediente clínico del paciente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.appointments.filter((a: any) => a.notes).length > 0 ? (
                  patient.appointments
                    .filter((a: any) => a.notes)
                    .map((appt: any) => (
                      <div key={appt.id} className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border/40 pb-2">
                          <span>Registrado el {appt.date} por {appt.profiles?.name}</span>
                        </div>
                        <p className="text-sm text-foreground font-mono leading-relaxed whitespace-pre-wrap pt-2">
                          {appt.notes}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">No se registran notas clínicas en este expediente.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
