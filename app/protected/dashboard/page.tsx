"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/app-providers";
import {
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calendar as CalendarIcon,
  CreditCard,
  Building,
  UserCheck,
  Percent,
  Plus,
  Search,
  ArrowUpRight,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import Link from "next/link";
import { useRouter } from "next/navigation";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const todayStr = () => new Date().toISOString().split("T")[0];
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
};

export default function DashboardPage() {
  const { profile } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [period, setPeriod] = useState("Hoy");
  const [searchQuery, setSearchQuery] = useState("");

  // Today's appointments
  const { data: todayAppts = [], isLoading: apptsLoading } = useQuery({
    queryKey: ["dashboard-appointments", todayStr()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, time, reason, type, status, patients(id, name, phone, classification), profiles!appointments_doctor_id_fkey(id, name)")
        .eq("date", todayStr());
      if (error) throw error;
      return data || [];
    },
  });

  // Today's payments
  const { data: todayPayments = [] } = useQuery({
    queryKey: ["dashboard-payments-today", todayStr()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("total, amount_paid, method, created_at")
        .gte("created_at", todayStr());
      if (error) throw error;
      return data || [];
    },
  });

  // Today's expenses
  const { data: todayExpenses = [] } = useQuery({
    queryKey: ["dashboard-expenses-today", todayStr()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, category_id, date, expense_categories(name)")
        .eq("date", todayStr());
      if (error) throw error;
      return data || [];
    },
  });

  // Weekly payments (for chart)
  const { data: weeklyPayments = [] } = useQuery({
    queryKey: ["dashboard-payments-weekly", weekStart()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("total, amount_paid, method, created_at")
        .gte("created_at", weekStart());
      if (error) throw error;
      return data || [];
    },
  });

  // Weekly expenses (for chart)
  const { data: weeklyExpenses = [] } = useQuery({
    queryKey: ["dashboard-expenses-weekly", weekStart()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date, expense_categories(name)")
        .gte("date", weekStart());
      if (error) throw error;
      return data || [];
    },
  });

  // All expenses with categories (for pie chart)
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["dashboard-all-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_categories(name)")
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Weekly appointments for patient classification chart
  const { data: weeklyAppts = [] } = useQuery({
    queryKey: ["dashboard-appointments-weekly", weekStart()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("date, type, patients(classification)")
        .gte("date", weekStart());
      if (error) throw error;
      return data || [];
    },
  });

  // Derive KPIs
  const stats = useMemo(() => {
    const atendidosHoy = todayAppts.filter(a => a.status === "Completada").length;
    const pendientesHoy = todayAppts.filter(a => a.status === "Pendiente" || a.status === "En curso").length;
    const nuevosHoy = todayAppts.filter((a: any) => a.patients?.classification === "Nuevo" || a.type === "Primera vez").length;
    const seguimientoHoy = todayAppts.filter((a: any) => a.patients?.classification === "Seguimiento" || a.type === "Seguimiento").length;

    const ingresosHoy = todayPayments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
    const gastosHoy = todayExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const gananciaHoy = ingresosHoy - gastosHoy;

    const ingresosSemanal = weeklyPayments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);

    const methodCount: Record<string, number> = {};
    weeklyPayments.forEach((p: any) => {
      methodCount[p.method] = (methodCount[p.method] || 0) + 1;
    });
    const metodoMasUsado = Object.entries(methodCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

    const procedureCount: Record<string, number> = {};
    todayAppts.filter((a: any) => a.type).forEach((a: any) => {
      procedureCount[a.type] = (procedureCount[a.type] || 0) + 1;
    });
    const procedimientoMasRealizado = Object.entries(procedureCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "Consulta General";

    const docCount: Record<string, string> = {};
    const docNameMap: Record<string, string> = {};
    todayAppts.forEach((a: any) => {
      const id = a.profiles?.id;
      const name = a.profiles?.name;
      if (id && name) {
        (docCount as any)[id] = ((docCount as any)[id] || 0) + 1;
        docNameMap[id] = name;
      }
    });
    const medicoMasPacientes = Object.entries(docCount).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || "";
    const medicoMasPacientesName = docNameMap[medicoMasPacientes] || "—";

    const paidCount = todayPayments.filter((p: any) => Number(p.amount_paid) > 0).length;
    const ingresoPromedio = paidCount > 0 ? ingresosHoy / paidCount : 0;

    // Charts
    const chartIngresosPeriodo = DAY_NAMES.map((name) => ({
      name,
      Ingresos: 0,
      Gastos: 0,
    }));

    weeklyPayments.forEach((p: any) => {
      const d = new Date(p.created_at);
      const dayIdx = d.getDay();
      chartIngresosPeriodo[dayIdx].Ingresos += Number(p.amount_paid);
    });
    weeklyExpenses.forEach((e: any) => {
      const d = new Date(e.date);
      const dayIdx = d.getDay();
      chartIngresosPeriodo[dayIdx].Gastos += Number(e.amount);
    });

    const categoryMap: Record<string, number> = {};
    allExpenses.forEach((e: any) => {
      const catName = e.expense_categories?.name || "Otros";
      categoryMap[catName] = (categoryMap[catName] || 0) + Number(e.amount);
    });
    const chartGastosCategoria = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    const dayClassification: Record<string, { Nuevos: number; Seguimiento: number }> = {};
    const todayDayIdx = new Date().getDay();
    for (let i = 0; i <= todayDayIdx; i++) {
      dayClassification[i] = { Nuevos: 0, Seguimiento: 0 };
    }
    weeklyAppts.forEach((a: any) => {
      const d = new Date(a.date);
      const dayIdx = d.getDay();
      if (!dayClassification[dayIdx]) return;
      const isNew = a.patients?.classification === "Nuevo" || a.type === "Primera vez";
      if (isNew) dayClassification[dayIdx].Nuevos += 1;
      else dayClassification[dayIdx].Seguimiento += 1;
    });
    const chartPacientesClasificacion = Object.entries(dayClassification).map(([dayIdx, val]) => ({
      name: DAY_NAMES[Number(dayIdx)],
      ...val,
    }));

    const payMethodCount: Record<string, number> = {};
    weeklyPayments.forEach((p: any) => {
      payMethodCount[p.method] = (payMethodCount[p.method] || 0) + 1;
    });
    const chartMetodosPago = Object.entries(payMethodCount).map(([name, value]) => ({ name, value }));

    return {
      appointments: todayAppts,
      kpis: {
        atendidosHoy,
        pendientesHoy,
        nuevosHoy,
        seguimientoHoy,
        ingresosHoy,
        gastosHoy,
        gananciaHoy,
        ingresosSemanal,
        metodoMasUsado,
        procedimientoMasRealizado,
        medicoMasPacientes: medicoMasPacientesName,
        ingresoPromedio,
      },
      charts: {
        ingresosPeriodo: chartIngresosPeriodo,
        gastosCategoria: chartGastosCategoria,
        pacientesClasificacion: chartPacientesClasificacion,
        metodosPago: chartMetodosPago,
      },
    };
  }, [todayAppts, todayPayments, todayExpenses, weeklyPayments, weeklyExpenses, allExpenses, weeklyAppts]);

  const isAppointmentDelayed = (apptTimeStr: string, status: string) => {
    if (status !== "Pendiente") return false;
    const now = new Date();
    const apptTime = new Date();
    const [hrs, mins, secs] = apptTimeStr.split(":");
    apptTime.setHours(parseInt(hrs), parseInt(mins), parseInt(secs || "0"));
    const diffMs = now.getTime() - apptTime.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    return diffMins > 15;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pendiente":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">Pendiente</Badge>;
      case "Confirmada":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">Confirmada</Badge>;
      case "En curso":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 animate-pulse">En consulta</Badge>;
      case "Completada":
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white border-0">Completada</Badge>;
      case "Cancelada":
        return <Badge className="bg-destructive text-destructive-foreground border-0">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando métricas...</span>
      </div>
    );
  }

  const searchFilter = (appt: any) => {
    if (!searchQuery) return true;
    const nameMatch = appt.patients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const docMatch = appt.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const reasonMatch = appt.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || docMatch || reasonMatch;
  };

  const atendidosList = stats.appointments.filter((a: any) => a.status === "Completada").filter(searchFilter);
  const pendientesList = stats.appointments.filter((a: any) => a.status !== "Completada" && a.status !== "Cancelada").filter(searchFilter);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            ¡Hola, {profile?.name}!
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Resumen operativo y financiero de la clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md shadow-sm">
            {["Hoy", "Semana", "Mes"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white"
            onClick={() => router.push("/protected/calendar")}
          >
            <Plus className="mr-2 h-4 w-4" /> Nueva Cita
          </Button>
        </div>
      </div>

      {apptsLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <Activity className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando métricas...</span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pacientes Atendidos
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">{stats.kpis.atendidosHoy}</div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold border-blue-500/20 text-blue-500 bg-blue-500/5">
                    Nuevos: {stats.kpis.nuevosHoy}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold border-muted-foreground/20 text-muted-foreground bg-muted/10">
                    Seguimiento: {stats.kpis.seguimientoHoy}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dinero Recibido
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">
                  ${stats.kpis.ingresosHoy.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+12.3% vs ayer</span>
                </div>
              </CardContent>
            </Card>

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Gastos Registrados
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <TrendingDown className="h-4.5 w-4.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-foreground">
                    ${stats.kpis.gastosHoy.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-muted-foreground">
                    <span>Egreso operativo diario</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ganancia Neta
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <DollarSign className="h-4.5 w-4.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-foreground">
                    ${stats.kpis.gananciaHoy.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+8.4% vs ayer</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Semanal
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <CalendarIcon className="h-4.5 w-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-foreground">
                  ${stats.kpis.ingresosSemanal.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                  <span>Corte acumulado de semana</span>
                </div>
              </CardContent>
            </Card>

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Método de Pago
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <CreditCard className="h-4.5 w-4.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold text-foreground">{stats.kpis.metodoMasUsado}</div>
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium text-muted-foreground">
                    <span>El de mayor recurrencia</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Procedimiento Frecuente
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                  <Building className="h-4.5 w-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-extrabold text-foreground truncate">{stats.kpis.procedimientoMasRealizado}</div>
                <div className="flex items-center gap-1 mt-4 text-xs font-medium text-muted-foreground">
                  <span>Atención general principal</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Médico Destacado
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-extrabold text-foreground truncate">{stats.kpis.medicoMasPacientes}</div>
                <div className="flex items-center gap-1 mt-4 text-xs font-medium text-muted-foreground">
                  <span>Mayor flujo de atención hoy</span>
                </div>
              </CardContent>
            </Card>

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ingreso Promedio
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Percent className="h-4.5 w-4.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-foreground">
                    ${stats.kpis.ingresoPromedio.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                    <span>Por paciente ingresado</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Ingresos vs Gastos (Semanal)</CardTitle>
                  <CardDescription>Comparativa operativa de flujo de caja.</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.charts.ingresosPeriodo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00C49F" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#00C49F" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF8042" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#FF8042" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Area type="monotone" dataKey="Ingresos" stroke="#00C49F" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIngresos)" />
                      <Area type="monotone" dataKey="Gastos" stroke="#FF8042" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGastos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Gastos por Categoría</CardTitle>
                  <CardDescription>Desglose proporcional de egresos acumulados.</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={stats.charts.gastosCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.charts.gastosCategoria.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Fidelización de Pacientes</CardTitle>
                <CardDescription>Proporción de consultas nuevas vs. seguimiento clínico.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.charts.pacientesClasificacion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="Nuevos" fill="#0088FE" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Seguimiento" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {profile?.role === "Admin" && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Distribución Métodos de Pago</CardTitle>
                  <CardDescription>Volúmenes transaccionales por medio de pago.</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={stats.charts.metodosPago}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stats.charts.metodosPago.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Monitor del Día</h2>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar paciente, médico o diagnóstico..."
                  className="pl-10 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Próximas Citas y Espera</CardTitle>
                    <CardDescription>Pacientes por atender hoy.</CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                    {pendientesList.length} pendientes
                  </Badge>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                          <th className="py-3 px-6">Hora</th>
                          <th className="py-3 px-6">Paciente</th>
                          <th className="py-3 px-6">Médico</th>
                          <th className="py-3 px-6">Motivo</th>
                          <th className="py-3 px-6">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendientesList.length > 0 ? (
                          pendientesList.map((appt: any) => {
                            const delayed = isAppointmentDelayed(appt.time, appt.status);
                            return (
                              <tr
                                key={appt.id}
                                className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
                                  delayed ? "bg-destructive/5 animate-pulse" : ""
                                }`}
                              >
                                <td className="py-4 px-6 font-semibold flex items-center gap-2">
                                  {delayed && <Clock className="h-4 w-4 text-destructive animate-spin" />}
                                  <span className={delayed ? "text-destructive font-bold" : "text-foreground"}>
                                    {appt.time.substring(0, 5)}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-medium">
                                  <Link
                                    href={`/protected/patients/${appt.patients?.id}`}
                                    className="hover:underline hover:text-primary transition-colors"
                                  >
                                    {appt.patients?.name}
                                  </Link>
                                  {delayed && (
                                    <span className="block text-[10px] text-destructive font-bold uppercase mt-0.5">
                                      Retraso &gt; 15 min
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-muted-foreground">{appt.profiles?.name}</td>
                                <td className="py-4 px-6 truncate max-w-[150px]" title={appt.reason}>
                                  {appt.reason}
                                </td>
                                <td className="py-4 px-6">{getStatusBadge(appt.status)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-muted-foreground">
                              No hay citas pendientes que coincidan con la búsqueda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Pacientes Atendidos Hoy</CardTitle>
                    <CardDescription>Historial de consultas completadas del día.</CardDescription>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0">
                    {atendidosList.length} completados
                  </Badge>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                          <th className="py-3 px-6">Hora</th>
                          <th className="py-3 px-6">Paciente</th>
                          <th className="py-3 px-6">Médico</th>
                          <th className="py-3 px-6">Tipo</th>
                          <th className="py-3 px-6">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atendidosList.length > 0 ? (
                          atendidosList.map((appt: any) => (
                            <tr key={appt.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <td className="py-4 px-6 font-semibold text-muted-foreground">
                                {appt.time.substring(0, 5)}
                              </td>
                              <td className="py-4 px-6 font-medium text-foreground">{appt.patients?.name}</td>
                              <td className="py-4 px-6 text-muted-foreground">{appt.profiles?.name}</td>
                              <td className="py-4 px-6">
                                <Badge
                                  variant="outline"
                                  className={
                                    appt.patients?.classification === "Nuevo"
                                      ? "border-blue-500/20 text-blue-500 bg-blue-500/5 font-bold"
                                      : "border-muted-foreground/20 text-muted-foreground bg-muted/10 font-bold"
                                  }
                                >
                                  {appt.patients?.classification}
                                </Badge>
                              </td>
                              <td className="py-4 px-6">
                                <Link href={`/protected/patients/${appt.patients?.id}`} passHref>
                                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs flex items-center font-bold">
                                    Ver Ficha <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-muted-foreground">
                              Aún no se han completado consultas hoy.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
