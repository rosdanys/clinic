"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/app-providers";
import {
  TrendingDown,
  Plus,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  CreditCard,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ExpensesPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [showAddModal, setShowAddModal] = useState(false);

  // Campos formulario
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [concept, setConcept] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [provider, setProvider] = useState("");
  const [paymentForm, setPaymentForm] = useState("Tarjeta");
  const [amount, setAmount] = useState("");
  const [observations, setObservations] = useState("");

  // Cargar lista de gastos
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories (name)
        `)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Cargar categorías
  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expense_categories")
        .select("*");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Mutación para agregar gasto
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        date,
        concept,
        category_id: categoryId || categories?.[0]?.id,
        provider,
        payment_form: paymentForm,
        amount: Number(amount),
        observations,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-list"] });
      setShowAddModal(false);
      setConcept("");
      setProvider("");
      setAmount("");
      setObservations("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount) {
      alert("Complete los campos requeridos");
      return;
    }
    createMutation.mutate();
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
          Solo los Administradores de la clínica tienen permisos para ver y registrar egresos en este sistema.
        </p>
      </div>
    );
  }

  const totalSpent = expenses?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos y Egresos</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Registro y control de gastos de insumos, servicios y mantenimiento.
          </p>
        </div>
        <Button
          className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
          onClick={() => {
            if (categories && categories.length > 0) setCategoryId(categories[0].id);
            setShowAddModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Registrar Gasto
        </Button>
      </div>

      {/* Summary Widget */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Egresos Acumulado</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TrendingDown className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-destructive">${totalSpent.toLocaleString("es-US", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Total de gastos registrados en la base de datos</p>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Fecha</th>
                  <th className="py-4 px-6">Concepto</th>
                  <th className="py-4 px-6">Categoría</th>
                  <th className="py-4 px-6">Proveedor</th>
                  <th className="py-4 px-6">Forma Pago</th>
                  <th className="py-4 px-6 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Cargando gastos...
                    </td>
                  </tr>
                ) : expenses && expenses.length > 0 ? (
                  expenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-semibold text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {new Date(exp.date).toLocaleDateString("es-US")}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-foreground">{exp.concept}</td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground bg-muted/10 font-bold">
                          {exp.expense_categories?.name || "General"}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">{exp.provider}</td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/5 font-bold">
                          {exp.payment_form}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-bold text-destructive text-right">
                        -${exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No hay gastos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold">Registrar Egreso</CardTitle>
              <CardDescription>Completar los datos para registrar el gasto en el sistema.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="exp-date">Fecha</Label>
                    <Input
                      id="exp-date"
                      type="date"
                      className="rounded-xl"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="exp-amount">Monto ($)</Label>
                    <Input
                      id="exp-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="rounded-xl font-bold text-destructive"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-concept">Concepto / Descripción</Label>
                  <Input
                    id="exp-concept"
                    type="text"
                    placeholder="Compra de gasas, jeringas..."
                    className="rounded-xl"
                    required
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-category">Categoría de Gasto</Label>
                  <select
                    id="exp-category"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-medium"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-provider">Proveedor</Label>
                  <Input
                    id="exp-provider"
                    type="text"
                    placeholder="Distribuidora Farma..."
                    className="rounded-xl"
                    required
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-form">Forma de Pago</Label>
                  <select
                    id="exp-form"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
                    value={paymentForm}
                    onChange={(e) => setPaymentForm(e.target.value)}
                  >
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cash">Efectivo (Cash)</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-obs">Observaciones Adicionales</Label>
                  <textarea
                    id="exp-obs"
                    rows={2}
                    placeholder="Detalles sobre la factura, etc..."
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
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : "Guardar Gasto"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
