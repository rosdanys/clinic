"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Activity,
  Check,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/components/providers/app-providers";

export default function CalendarPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Estado para el modal de nueva cita
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [apptDate, setApptDate] = useState(new Date().toISOString().split("T")[0]);
  const [apptTime, setApptTime] = useState("09:00");
  const [apptReason, setApptReason] = useState("");
  const [apptType, setApptType] = useState("Primera vez");
  const [localTime, setLocalTime] = useState("");

  useEffect(() => {
    setLocalTime(new Date().toLocaleTimeString("es-US", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // Cargar citas y catálogos
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments-calendar", currentDate.toISOString(), viewMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (id, name, phone, classification),
          profiles!appointments_doctor_id_fkey (id, name)
        `);
      if (error) throw error;

      return data || [];
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name");
      return data || [];
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors-catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .or("role.eq.Médico,role.eq.Especialista");
      return data || [];
    },
  });

  // Mutación para agendar cita
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("appointments").insert({
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId || doctors?.[0]?.id,
        date: apptDate,
        time: apptTime + ":00",
        reason: apptReason,
        type: apptType,
        status: "Pendiente",
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
      setShowAddModal(false);
      setApptReason("");
    },
  });

  // Mutación para actualizar estado
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
    },
  });

  // Navegar fechas
  const handlePrevDate = () => {
    const copy = new Date(currentDate);
    if (viewMode === "day") copy.setDate(copy.getDate() - 1);
    else if (viewMode === "week") copy.setDate(copy.getDate() - 7);
    else copy.setMonth(copy.getMonth() - 1);
    setCurrentDate(copy);
  };

  const handleNextDate = () => {
    const copy = new Date(currentDate);
    if (viewMode === "day") copy.setDate(copy.getDate() + 1);
    else if (viewMode === "week") copy.setDate(copy.getDate() + 7);
    else copy.setMonth(copy.getMonth() + 1);
    setCurrentDate(copy);
  };

  const getFormattedDateRange = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("es-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay() + 1); // Lunes
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // Domingo
      return `${start.toLocaleDateString("es-US", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("es-US", {
        month: "long",
        year: "numeric",
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !apptReason) {
      alert("Complete los campos obligatorios");
      return;
    }
    createMutation.mutate();
  };

  // Filtrar citas del día seleccionado
  const selectedDateStr = currentDate.toISOString().split("T")[0];
  const dayAppointments = appointments?.filter((a: any) => a.date === selectedDateStr) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda Médica</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Programación y control operativo de citas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md">
            {[
              { id: "day", label: "Día" },
              { id: "week", label: "Semana" },
              { id: "month", label: "Mes" },
            ].map((mode) => (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4"
                onClick={() => setViewMode(mode.id as any)}
              >
                {mode.label}
              </Button>
            ))}
          </div>
          <Button
            className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
            onClick={() => {
              if (patients && patients.length > 0) setSelectedPatientId(patients[0].id);
              if (doctors && doctors.length > 0) setSelectedDoctorId(doctors[0].id);
              setShowAddModal(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Agendar Turno
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={handlePrevDate}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={handleNextDate}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="text-sm font-semibold rounded-xl" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
        </div>
        <h2 className="text-lg font-bold tracking-tight text-foreground capitalize">
          {getFormattedDateRange()}
        </h2>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-accent/60 px-3 py-1.5 rounded-xl border border-border/50">
          <Clock className="h-3.5 w-3.5" />
          <span>Hora local: {localTime}</span>
        </div>
      </div>

      {/* Main Calendar Viewport */}
      {viewMode === "day" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Column 1 & 2: Agenda slots */}
          <div className="md:col-span-2 space-y-4">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold">Bloques Horarios de Atención</CardTitle>
                <CardDescription>Citas agendadas para el día de hoy.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {dayAppointments.length > 0 ? (
                  dayAppointments.map((appt: any) => (
                    <div key={appt.id} className="flex p-4 hover:bg-muted/20 transition-colors gap-4">
                      {/* Hora */}
                      <div className="flex flex-col items-center justify-center font-bold text-primary shrink-0 w-16">
                        <Clock className="h-4 w-4 mb-1 text-primary/70" />
                        <span className="text-sm leading-none">{appt.time.substring(0, 5)}</span>
                      </div>

                      {/* Info de la cita */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{appt.patients?.name}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold border-blue-500/20 text-blue-500 bg-blue-500/5">
                            {appt.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Médico: <span className="font-semibold">{appt.profiles?.name}</span> | Tel: {appt.patients?.phone}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium truncate mt-1">
                          Motivo: <span className="text-foreground">{appt.reason}</span>
                        </p>
                      </div>

                      {/* Acciones de estado */}
                      <div className="flex items-center gap-1.5">
                        {appt.status === "Pendiente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-green-500 hover:bg-green-500/10"
                              title="Confirmar"
                              onClick={() => statusMutation.mutate({ id: appt.id, status: "Confirmada" })}
                            >
                              <Check className="h-4.5 w-4.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                              title="Cancelar"
                              onClick={() => statusMutation.mutate({ id: appt.id, status: "Cancelada" })}
                            >
                              <X className="h-4.5 w-4.5" />
                            </Button>
                          </>
                        )}
                        {appt.status === "Confirmada" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                            onClick={() => statusMutation.mutate({ id: appt.id, status: "En curso" })}
                          >
                            Iniciar Consulta
                          </Button>
                        )}
                        {appt.status === "En curso" && (
                          <Button
                            className="h-8 rounded-lg text-xs font-bold bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => statusMutation.mutate({ id: appt.id, status: "Completada" })}
                          >
                            Completar
                          </Button>
                        )}
                        {(appt.status === "Completada" || appt.status === "Cancelada") && (
                          <div className="text-xs font-bold text-muted-foreground mr-2">
                            {appt.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground/40" />
                    <span>No hay consultas registradas para este día.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Stats/Alerts block */}
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Estado Operativo</CardTitle>
                <CardDescription>Resumen de turnos del día.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground">Total Turnos:</span>
                  <span className="font-bold">{dayAppointments.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-green-500">Completados:</span>
                  <span className="font-bold text-green-500">
                    {dayAppointments.filter((a: any) => a.status === "Completada").length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-amber-500">Pendientes:</span>
                  <span className="font-bold text-amber-500">
                    {dayAppointments.filter((a: any) => a.status === "Pendiente").length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-blue-500">En Consulta:</span>
                  <span className="font-bold text-blue-500">
                    {dayAppointments.filter((a: any) => a.status === "En curso").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Month Viewport (Grid simple) */}
      {viewMode === "month" && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-border text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 bg-muted/10">
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-border/40 text-sm">
              {Array.from({ length: 35 }).map((_, idx) => {
                // Simular un mes (por ejemplo, días del 1 al 30 y relleno)
                const dayNum = (idx % 30) + 1;
                return (
                  <div key={idx} className="min-h-[100px] p-2 hover:bg-muted/10 transition-colors flex flex-col justify-between">
                    <span className="font-semibold text-muted-foreground text-xs">{dayNum}</span>
                    {idx === 15 && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] w-fit py-0 px-1 border-0">
                        2 Citas
                      </Badge>
                    )}
                    {idx === 22 && (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold text-[9px] w-fit py-0 px-1 border-0">
                        5 Citas
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Viewport (Grid simple) */}
      {viewMode === "week" && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-border text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 bg-muted/10">
              <div>Lunes</div>
              <div>Martes</div>
              <div>Miércoles</div>
              <div>Jueves</div>
              <div>Viernes</div>
              <div>Sábado</div>
              <div>Domingo</div>
            </div>
            <div className="grid grid-cols-7 divide-x divide-border/40 text-sm h-80">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="p-3 space-y-2 hover:bg-muted/5 transition-colors">
                  {idx === 1 && (
                    <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg p-2 text-xs font-semibold">
                      <span className="block font-bold">09:00 - Estanislao</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Control Clínico</span>
                    </div>
                  )}
                  {idx === 3 && (
                    <div className="bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg p-2 text-xs font-semibold">
                      <span className="block font-bold">11:15 - Gómez</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Consulta General</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold">Agendar Turno Médico</CardTitle>
              <CardDescription>Completar los datos para registrar la cita.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="patient">Paciente</Label>
                  <select
                    id="patient"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">Seleccione un paciente...</option>
                    {patients?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doctor">Médico / Especialista</Label>
                  <select
                    id="doctor"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    {doctors?.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="appt-date">Fecha</Label>
                    <Input
                      id="appt-date"
                      type="date"
                      className="rounded-xl"
                      value={apptDate}
                      onChange={(e) => setApptDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="appt-time">Hora</Label>
                    <Input
                      id="appt-time"
                      type="time"
                      className="rounded-xl"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appt-type">Tipo de Cita</Label>
                  <select
                    id="appt-type"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={apptType}
                    onChange={(e) => setApptType(e.target.value)}
                  >
                    <option value="Primera vez">Primera vez</option>
                    <option value="Seguimiento">Seguimiento / Control</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appt-reason">Motivo de Consulta</Label>
                  <textarea
                    id="appt-reason"
                    rows={3}
                    placeholder="Describa brevemente el motivo..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    required
                    value={apptReason}
                    onChange={(e) => setApptReason(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border/80"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Agendando..." : "Guardar Turno"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
