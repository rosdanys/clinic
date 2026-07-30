"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/app-providers";
import { logAudit } from "@/lib/audit";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AccountsReceivablePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  
  // Estado para el registro de cobro/abono
  const [selectedCxC, setSelectedCxC] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [observations, setObservations] = useState("");

  // Cargar cuentas por cobrar
  const { data: receivables, isLoading } = useQuery({
    queryKey: ["receivables-list", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select(`
          *,
          patients (id, name, phone)
        `)
        .order("limit_date", { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];

      const mapped = data?.map((cxc: any) => {
        let status = "Al día";
        if (cxc.pending_amount <= 0) {
          status = "Al día";
        } else {
          const limit = new Date(cxc.limit_date);
          const limitDiff = Math.ceil(
            (limit.getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (limitDiff < 0) {
            status = "Vencido";
          } else if (limitDiff <= 7) {
            status = "Próximo a vencer";
          } else {
            status = "Pendiente";
          }
        }
        return { ...cxc, computedStatus: status };
      });

      const filtered = mapped?.filter((cxc: any) => {
        if (statusFilter === "Todos") return true;
        if (statusFilter === "Vencidos") return cxc.computedStatus === "Vencido";
        if (statusFilter === "Al día") return cxc.computedStatus === "Al día";
        return cxc.computedStatus === "Próximo a vencer" || cxc.computedStatus === "Pendiente";
      });

      return filtered || [];
    }
  });

  // Registrar abono / Pago
  const payMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(paymentAmount);
      const newPaid = Number(selectedCxC.paid_amount) + amount;
      const newPending = Math.max(0, Number(selectedCxC.pending_amount) - amount);

      // 1. Actualizar cuenta por cobrar
      const { error: cxcError } = await supabase
        .from("accounts_receivable")
        .update({
          paid_amount: newPaid,
          pending_amount: newPending,
          status: newPending === 0 ? "Pagado" : "Pendiente",
          observations: observations || selectedCxC.observations
        })
        .eq("id", selectedCxC.id);

      if (cxcError) throw cxcError;

      // 2. Acreditar monto en la tabla de pagos asociada
      if (selectedCxC.payment_id) {
        const { data: originalPay } = await supabase
          .from("payments")
          .select("amount_paid")
          .eq("id", selectedCxC.payment_id)
          .single();

        const currentPaid = Number(originalPay?.amount_paid || 0);

        await supabase
          .from("payments")
          .update({
            amount_paid: currentPaid + amount,
          })
          .eq("id", selectedCxC.payment_id);
      }
    },
    onSuccess: () => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "UPDATE",
        module: "Cuentas por Cobrar",
        tableName: "accounts_receivable",
        recordId: selectedCxC?.id,
        description: `Registró abono de $${Number(paymentAmount).toFixed(2)} en CxC de ${selectedCxC?.patients?.name || "Paciente"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["receivables-list"] });
      setSelectedCxC(null);
      setPaymentAmount("");
      setObservations("");
      alert("Abono procesado con éxito.");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Al día":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 font-bold">Al día</Badge>;
      case "Próximo a vencer":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-bold">Por Vencer</Badge>;
      case "Vencido":
        return <Badge className="bg-destructive text-destructive-foreground border-0 font-bold animate-pulse">Vencido</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white border-0 font-bold">Pendiente</Badge>;
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    payMutation.mutate();
  };

  const filteredReceivables = receivables?.filter((cxc: any) => {
    if (!search) return true;
    return cxc.patients?.name?.toLowerCase().includes(search.toLowerCase()) || cxc.concept?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuentas por Cobrar</h1>
        <p className="text-muted-foreground mt-0.5 text-sm font-medium">
          Seguimiento de deudas, créditos de pacientes y control de vencimientos.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por paciente o concepto de deuda..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md">
            {["Todos", "Vencidos", "Al día", "Pendientes"].map((filter) => (
              <Button
                key={filter}
                variant={statusFilter === filter ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4"
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Límite Pago</th>
                  <th className="py-4 px-6">Paciente</th>
                  <th className="py-4 px-6">Concepto</th>
                  <th className="py-4 px-6">Monto Total</th>
                  <th className="py-4 px-6">Monto Pagado</th>
                  <th className="py-4 px-6">Pendiente</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      Cargando deudas...
                    </td>
                  </tr>
                ) : filteredReceivables.length > 0 ? (
                  filteredReceivables.map((cxc: any) => (
                    <tr key={cxc.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {cxc.limit_date}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground/60" />
                          <Link
                            href={`/protected/patients/${cxc.patients?.id}`}
                            className="font-semibold text-foreground hover:underline hover:text-primary"
                          >
                            {cxc.patients?.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium truncate max-w-[200px]" title={cxc.concept}>
                        {cxc.concept}
                      </td>
                      <td className="py-4 px-6 font-bold text-foreground">${cxc.total_amount.toFixed(2)}</td>
                      <td className="py-4 px-6 font-semibold text-green-500">${cxc.paid_amount.toFixed(2)}</td>
                      <td className="py-4 px-6 font-bold text-destructive">
                        ${cxc.pending_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(cxc.computedStatus)}</td>
                      <td className="py-4 px-6 text-right">
                        {cxc.pending_amount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-bold text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedCxC(cxc);
                              setPaymentAmount(cxc.pending_amount.toFixed(2));
                            }}
                          >
                            Registrar Abono
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No hay deudas que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pay Modal */}
      {selectedCxC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" /> Acreditar Abono
              </CardTitle>
              <CardDescription>Paciente: {selectedCxC.patients?.name}</CardDescription>
            </CardHeader>
            <form onSubmit={handlePaySubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                  <span>Deuda Pendiente:</span>
                  <span className="text-destructive text-lg font-bold">${selectedCxC.pending_amount.toFixed(2)}</span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pay-amount">Monto del Abono ($)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCxC.pending_amount}
                    className="rounded-xl font-bold text-green-500"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pay-obs">Comentarios de Liquidación</Label>
                  <textarea
                    id="pay-obs"
                    rows={2}
                    placeholder="Detalles sobre el pago..."
                    className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border/80"
                  onClick={() => setSelectedCxC(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold"
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending ? "Procesando..." : "Confirmar Abono"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
