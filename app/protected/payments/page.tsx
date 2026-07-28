"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  CreditCard,
  User,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function PaymentsPage() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Cargar lista de cobros
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments-list", methodFilter, statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          patients (id, name, phone),
          appointments (id, date, doctor_id, profiles!appointments_doctor_id_fkey(name))
        `);

      if (methodFilter !== "Todos") {
        query = query.eq("method", methodFilter);
      }
      if (statusFilter !== "Todos") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pagado":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0 font-bold">Pagado</Badge>;
      case "Parcial":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-600/20 border-0 font-bold">Parcial</Badge>;
      case "Pendiente":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 font-bold">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "Cash":
        return <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5 font-bold">Efectivo</Badge>;
      case "Tarjeta":
        return <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/5 font-bold">Tarjeta</Badge>;
      case "Zelle":
        return <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/5 font-bold">Zelle</Badge>;
      case "Seguro":
        return <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/5 font-bold">Seguro</Badge>;
      default:
        return <Badge variant="outline" className="font-semibold">{method}</Badge>;
    }
  };

  const filteredPayments = payments?.filter((pay: any) => {
    if (!search) return true;
    return pay.patients?.name?.toLowerCase().includes(search.toLowerCase()) || pay.concept?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const totalCalculated = filteredPayments.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalPaid = filteredPayments.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);
  const totalBalance = filteredPayments.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Cobros</h1>
        <p className="text-muted-foreground mt-0.5 text-sm font-medium">
          Control de pagos, facturas emitidas y saldos pendientes de pacientes.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Facturado</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">${totalCalculated.toLocaleString("es-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de transacciones filtradas</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Recaudado</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-green-500">${totalPaid.toLocaleString("es-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Fondos acreditados</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo Pendiente (Deudas)</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-destructive">${totalBalance.toLocaleString("es-US", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Cuentas por cobrar generadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por paciente o concepto de cobro..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="Todos">Todos los Métodos</option>
            <option value="Cash">Efectivo (Cash)</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Zelle">Zelle</option>
            <option value="Seguro">Seguro</option>
            <option value="Mixto">Mixto</option>
          </select>
          <select
            className="flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Pagado">Pagado</option>
            <option value="Parcial">Parcial</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Fecha</th>
                  <th className="py-4 px-6">Paciente</th>
                  <th className="py-4 px-6">Concepto</th>
                  <th className="py-4 px-6">Método de Pago</th>
                  <th className="py-4 px-6">Monto Total</th>
                  <th className="py-4 px-6">Monto Pagado</th>
                  <th className="py-4 px-6">Balance</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">
                      Cargando cobros...
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((pay: any) => (
                    <tr key={pay.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-semibold text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {new Date(pay.created_at).toLocaleDateString("es-US")}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground/60" />
                          <Link
                            href={`/protected/patients/${pay.patients?.id}`}
                            className="font-semibold text-foreground hover:underline hover:text-primary"
                          >
                            {pay.patients?.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium truncate max-w-[180px]" title={pay.concept}>
                        {pay.concept}
                      </td>
                      <td className="py-4 px-6">{getMethodBadge(pay.method)}</td>
                      <td className="py-4 px-6 font-bold text-foreground">${pay.total.toFixed(2)}</td>
                      <td className="py-4 px-6 font-semibold text-green-500">${pay.amount_paid.toFixed(2)}</td>
                      <td className="py-4 px-6 font-bold text-destructive">
                        ${pay.balance.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(pay.status)}</td>
                      <td className="py-4 px-6 text-right">
                        {pay.balance > 0 && (
                          <Link href="/protected/accounts-receivable" passHref>
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10">
                              Ver CxC <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">
                      No hay transacciones registradas que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
