"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Download,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [reportType, setReportType] = useState("Ingresos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // All payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["reports-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("consultation_fee, procedure_fee, total, created_at, status");
      if (error) throw error;
      return data || [];
    },
  });

  // All expenses with category
  const { data: expenses = [] } = useQuery({
    queryKey: ["reports-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date, expense_categories(name)");
      if (error) throw error;
      return data || [];
    },
  });

  // All payroll
  const { data: payrolls = [] } = useQuery({
    queryKey: ["reports-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select("total_paid, payment_date");
      if (error) throw error;
      return data || [];
    },
  });

  const reportData = useMemo(() => {
    const filterPayments = payments.filter((p: any) => p.status !== "Pendiente");

    // Group payments by month
    const payByMonth: Record<string, { count: number; consultation_fee: number; procedure_fee: number; total: number }> = {};
    filterPayments.forEach((p: any) => {
      const key = monthLabel(new Date(p.created_at));
      if (!payByMonth[key]) payByMonth[key] = { count: 0, consultation_fee: 0, procedure_fee: 0, total: 0 };
      payByMonth[key].count += 1;
      payByMonth[key].consultation_fee += Number(p.consultation_fee);
      payByMonth[key].procedure_fee += Number(p.procedure_fee);
      payByMonth[key].total += Number(p.total);
    });

    // Group expenses by month (categorizing by category name)
    const expByMonth: Record<string, { insumos: number; servicios: number; salarios: number; total: number }> = {};
    expenses.forEach((e: any) => {
      const key = monthLabel(new Date(e.date));
      if (!expByMonth[key]) expByMonth[key] = { insumos: 0, servicios: 0, salarios: 0, total: 0 };
      const cat = (e.expense_categories?.name || "").toLowerCase();
      if (cat.includes("material") || cat.includes("laboratorio") || cat.includes("insumo") || cat.includes("descartable") || cat.includes("biológico")) {
        expByMonth[key].insumos += Number(e.amount);
      } else {
        expByMonth[key].servicios += Number(e.amount);
      }
      expByMonth[key].total += Number(e.amount);
    });

    // Group payroll by month as "Salarios"
    payrolls.forEach((p: any) => {
      const key = monthLabel(new Date(p.payment_date));
      if (!expByMonth[key]) expByMonth[key] = { insumos: 0, servicios: 0, salarios: 0, total: 0 };
      expByMonth[key].salarios += Number(p.total_paid);
      expByMonth[key].total += Number(p.total_paid);
    });

    // Collect all months
    const allKeys = [...new Set([...Object.keys(payByMonth), ...Object.keys(expByMonth)])].sort((a, b) => {
      const [aM, aY] = a.split(" ");
      const [bM, bY] = b.split(" ");
      if (aY !== bY) return Number(aY) - Number(bY);
      return MONTHS.indexOf(aM) - MONTHS.indexOf(bM);
    });

    if (allKeys.length === 0) {
      const emptyKeys = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
      if (reportType === "Ingresos") {
        return {
          chart: emptyKeys.map(n => ({ name: n, Consulta: 0, Procedimientos: 0, Total: 0 })),
          table: [],
        };
      } else if (reportType === "Gastos") {
        return {
          chart: emptyKeys.map(n => ({ name: n, Insumos: 0, Servicios: 0, Salarios: 0 })),
          table: [],
        };
      } else {
        return {
          chart: emptyKeys.map(n => ({ name: n, Ingresos: 0, Gastos: 0, Utilidad: 0 })),
          table: [],
        };
      }
    }

    if (reportType === "Ingresos") {
      const chart = allKeys.map(key => ({
        name: key.split(" ")[0],
        Consulta: payByMonth[key]?.consultation_fee || 0,
        Procedimientos: payByMonth[key]?.procedure_fee || 0,
        Total: payByMonth[key]?.total || 0,
      }));
      const table = allKeys.map(key => ({
        mes: key,
        consultas: payByMonth[key]?.count || 0,
        ingresosConsultas: payByMonth[key]?.consultation_fee || 0,
        ingresosProc: payByMonth[key]?.procedure_fee || 0,
        total: payByMonth[key]?.total || 0,
      }));
      return { chart, table };
    }

    if (reportType === "Gastos") {
      const chart = allKeys.map(key => ({
        name: key.split(" ")[0],
        Insumos: expByMonth[key]?.insumos || 0,
        Servicios: expByMonth[key]?.servicios || 0,
        Salarios: expByMonth[key]?.salarios || 0,
      }));
      const table = allKeys.map(key => ({
        mes: key,
        insumos: expByMonth[key]?.insumos || 0,
        servicios: expByMonth[key]?.servicios || 0,
        salarios: expByMonth[key]?.salarios || 0,
        total: expByMonth[key]?.total || 0,
      }));
      return { chart, table };
    }

    // Utilidad Neta
    const chart = allKeys.map(key => {
      const ingresos = payByMonth[key]?.total || 0;
      const gastos = expByMonth[key]?.total || 0;
      return {
        name: key.split(" ")[0],
        Ingresos: ingresos,
        Gastos: gastos,
        Utilidad: ingresos - gastos,
      };
    });
    const table = allKeys.map(key => {
      const ingresos = payByMonth[key]?.total || 0;
      const gastos = expByMonth[key]?.total || 0;
      return {
        mes: key,
        ingresos,
        gastos,
        utilidad: ingresos - gastos,
      };
    });
    return { chart, table };
  }, [payments, expenses, payrolls, reportType]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const isIngresos = reportType === "Ingresos";
    const isGastos = reportType === "Gastos";

    let headers: string[] = [];
    let rows: any[][] = [];

    if (isIngresos) {
      headers = ["Período", "Cant. Consultas", "Ingresos Consultas", "Ingresos Proc.", "Total Facturado"];
      rows = reportData.table.map((r: any) => [r.mes, r.consultas, r.ingresosConsultas, r.ingresosProc, r.total]);
    } else if (isGastos) {
      headers = ["Período", "Insumos Médicos", "Servicios Básicos", "Nómina/Salarios", "Total Egresos"];
      rows = reportData.table.map((r: any) => [r.mes, r.insumos, r.servicios, r.salarios, r.total]);
    } else {
      headers = ["Período", "Ingresos Totales", "Gastos Totales", "Ganancia Neta"];
      rows = reportData.table.map((r: any) => [r.mes, r.ingresos, r.gastos, r.utilidad]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${reportType.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingPayments;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Análisis financiero, volumen operativo y deudas de la clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/80 text-muted-foreground font-semibold" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/60 shadow-sm justify-between">
        <div className="flex rounded-xl border border-border/80 bg-background/50 p-1">
          {["Ingresos", "Gastos", "Utilidad Neta"].map((type) => (
            <Button
              key={type}
              variant={reportType === type ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs font-semibold px-4"
              onClick={() => setReportType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid gap-1">
            <Input
              type="date"
              className="rounded-xl h-9 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">a</span>
          <div className="grid gap-1">
            <Input
              type="date"
              className="rounded-xl h-9 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Gráfico Comparativo de Tendencia</CardTitle>
          <CardDescription>Resumen del semestre actual.</CardDescription>
        </CardHeader>
        <CardContent className="h-96">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Activity className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reportData ? (
            <ResponsiveContainer width="100%" height="100%">
              {reportType === "Utilidad Neta" ? (
                <LineChart data={reportData.chart as any[]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="Ingresos" stroke="#00C49F" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Gastos" stroke="#FF8042" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Utilidad" stroke="#8884d8" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={reportData.chart as any[]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  {reportType === "Ingresos" ? (
                    <>
                      <Bar dataKey="Consulta" fill="#0088FE" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Procedimientos" fill="#00C49F" stackId="a" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="Insumos" fill="#FF8042" stackId="a" />
                      <Bar dataKey="Servicios" fill="#FFBB28" stackId="a" />
                      <Bar dataKey="Salarios" fill="#8884d8" stackId="a" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold">Desglose Numérico Mensual</CardTitle>
          <CardDescription>Datos brutos del informe.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Período</th>
                  {reportType === "Ingresos" && (
                    <>
                      <th className="py-4 px-6">Cant. Consultas</th>
                      <th className="py-4 px-6">Ingresos Consultas</th>
                      <th className="py-4 px-6">Ingresos Procedimientos</th>
                      <th className="py-4 px-6 text-right">Total Neto</th>
                    </>
                  )}
                  {reportType === "Gastos" && (
                    <>
                      <th className="py-4 px-6">Insumos Médicos</th>
                      <th className="py-4 px-6">Servicios Básicos</th>
                      <th className="py-4 px-6">Nómina / Salarios</th>
                      <th className="py-4 px-6 text-right">Total Egresos</th>
                    </>
                  )}
                  {reportType === "Utilidad Neta" && (
                    <>
                      <th className="py-4 px-6">Ingresos Totales</th>
                      <th className="py-4 px-6">Gastos Totales</th>
                      <th className="py-4 px-6 text-right">Ganancia Neta</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Cargando detalles...
                    </td>
                  </tr>
                ) : reportData ? (
                  reportData.table.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-foreground">{row.mes}</td>
                      {reportType === "Ingresos" && (
                        <>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{row.consultas} uds</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">${row.ingresosConsultas.toFixed(2)}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">${row.ingresosProc.toFixed(2)}</td>
                          <td className="py-4 px-6 font-bold text-foreground text-right">${row.total.toFixed(2)}</td>
                        </>
                      )}
                      {reportType === "Gastos" && (
                        <>
                          <td className="py-4 px-6 text-muted-foreground font-medium">${row.insumos.toFixed(2)}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">${row.servicios.toFixed(2)}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">${row.salarios.toFixed(2)}</td>
                          <td className="py-4 px-6 font-bold text-destructive text-right">-${row.total.toFixed(2)}</td>
                        </>
                      )}
                      {reportType === "Utilidad Neta" && (
                        <>
                          <td className="py-4 px-6 text-green-500 font-bold">${row.ingresos.toFixed(2)}</td>
                          <td className="py-4 px-6 text-destructive font-semibold">-${row.gastos.toFixed(2)}</td>
                          <td className={`py-4 px-6 font-extrabold text-right ${row.utilidad >= 0 ? "text-green-500" : "text-destructive"}`}>
                            ${row.utilidad.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
