"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/app-providers";
import {
  Coins,
  Plus,
  Calendar,
  User,
  Lock,
  Calculator,
  Save,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PayrollPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulario
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeRole, setEmployeeRole] = useState("Recepción");
  const [baseSalary, setBaseSalary] = useState("15.00");
  const [hoursWorked, setHoursWorked] = useState("40");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [commissions, setCommissions] = useState("0.00");
  const [bonuses, setBonuses] = useState("0.00");
  const [deductions, setDeductions] = useState("0.00");
  const [paymentForm, setPaymentForm] = useState("Transferencia");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  // Cargar perfiles de empleados
  const { data: employees } = useQuery({
    queryKey: ["employees-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, role");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  // Ajustar rol automático al seleccionar empleado
  useEffect(() => {
    if (selectedEmployeeId && employees) {
      const emp = employees.find((e: any) => e.id === selectedEmployeeId);
      if (emp) {
        setEmployeeRole(emp.role);
        // Prellenar salario base estimado por rol
        if (emp.role === "Médico") setBaseSalary("45.00");
        else if (emp.role === "Especialista") setBaseSalary("35.00");
        else setBaseSalary("15.00");
      }
    }
  }, [selectedEmployeeId, employees]);

  // Cargar historial de nómina
  const { data: payrollHistory, isLoading } = useQuery({
    queryKey: ["payroll-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select(`
          *,
          profiles (name)
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Mock data
        return [
          {
            id: "pay1",
            employee_id: "e1",
            role: "Recepción",
            base_salary: 15.00,
            hours_worked: 40,
            overtime_hours: 5,
            commissions: 0.00,
            bonuses: 50.00,
            deductions: 20.00,
            total_paid: 742.50, // (15*40) + (15*1.5*5) + 50 - 20 = 600 + 112.50 + 30 = 742.50
            payment_form: "Transferencia",
            payment_date: new Date().toISOString().split("T")[0],
            profiles: { name: "Ramiro Funes" }
          }
        ];
      }
      return data;
    },
    enabled: profile?.role === "Admin",
  });

  // Calculadora de pago
  const getSumTotal = () => {
    const base = Number(baseSalary || 0);
    const hrs = Number(hoursWorked || 0);
    const overHrs = Number(overtimeHours || 0);
    const comm = Number(commissions || 0);
    const bon = Number(bonuses || 0);
    const ded = Number(deductions || 0);

    return (base * hrs) + (base * 1.5 * overHrs) + comm + bon - ded;
  };

  // Mutación para agregar pago de nómina
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll").insert({
        employee_id: selectedEmployeeId,
        role: employeeRole,
        base_salary: Number(baseSalary),
        hours_worked: Number(hoursWorked),
        overtime_hours: Number(overtimeHours),
        commissions: Number(commissions),
        bonuses: Number(bonuses),
        deductions: Number(deductions),
        total_paid: getSumTotal(),
        payment_form: paymentForm,
        payment_date: paymentDate,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-list"] });
      setShowAddModal(false);
      setOvertimeHours("0");
      setCommissions("0.00");
      setBonuses("0.00");
      setDeductions("0.00");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || getSumTotal() <= 0) {
      alert("Complete los datos requeridos");
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
          Solo los Administradores de la clínica tienen permisos para procesar nóminas y registrar pagos de salarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nómina y Salarios</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Procesamiento de pagos a personal, horas extras y comisiones.
          </p>
        </div>
        <Button
          className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
          onClick={() => {
            if (employees && employees.length > 0) setSelectedEmployeeId(employees[0].id);
            setShowAddModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Liquidar Haberes
        </Button>
      </div>

      {/* Historial de Nómina */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold">Historial de Liquidación de Haberes</CardTitle>
          <CardDescription>Resumen de pagos realizados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Fecha Pago</th>
                  <th className="py-4 px-6">Empleado</th>
                  <th className="py-4 px-6">Cargo</th>
                  <th className="py-4 px-6">Salario Base</th>
                  <th className="py-4 px-6">Horas Trab. (Extra)</th>
                  <th className="py-4 px-6">Bonos / Deducciones</th>
                  <th className="py-4 px-6">Forma Pago</th>
                  <th className="py-4 px-6 text-right">Total Neto</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      Cargando historial de pagos...
                    </td>
                  </tr>
                ) : payrollHistory && payrollHistory.length > 0 ? (
                  payrollHistory.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-semibold text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {new Date(p.payment_date).toLocaleDateString("es-US")}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-foreground">{p.profiles?.name}</td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
                          {p.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">${p.base_salary.toFixed(2)}/h</td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">
                        {p.hours_worked}h (+{p.overtime_hours}h)
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">
                        <span className="text-green-500">+${p.bonuses.toFixed(2)}</span> / <span className="text-destructive">-${p.deductions.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-semibold">{p.payment_form}</td>
                      <td className="py-4 px-6 font-bold text-foreground text-right text-base text-green-500">
                        ${p.total_paid.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No se registran pagos de nómina procesados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Payroll Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Liquidar Haberes de Empleado
              </CardTitle>
              <CardDescription>Cálculos automáticos de haberes netos.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pay-employee">Empleado</Label>
                    <select
                      id="pay-employee"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                      {employees?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-role">Cargo / Rol</Label>
                    <Input
                      id="pay-role"
                      type="text"
                      className="rounded-xl bg-muted/50 cursor-not-allowed font-semibold text-primary"
                      disabled
                      value={employeeRole}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pay-base">Salario Base ($/h)</Label>
                    <Input
                      id="pay-base"
                      type="number"
                      step="0.01"
                      className="rounded-xl font-medium"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-hours">Horas Trabajadas</Label>
                    <Input
                      id="pay-hours"
                      type="number"
                      className="rounded-xl font-medium"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-overtime">Horas Extras</Label>
                    <Input
                      id="pay-overtime"
                      type="number"
                      className="rounded-xl font-medium"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pay-comm">Comisiones ($)</Label>
                    <Input
                      id="pay-comm"
                      type="number"
                      step="0.01"
                      className="rounded-xl font-medium text-green-500"
                      value={commissions}
                      onChange={(e) => setCommissions(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-bonuses">Bonos ($)</Label>
                    <Input
                      id="pay-bonuses"
                      type="number"
                      step="0.01"
                      className="rounded-xl font-medium text-green-500"
                      value={bonuses}
                      onChange={(e) => setBonuses(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-ded">Deducciones ($)</Label>
                    <Input
                      id="pay-ded"
                      type="number"
                      step="0.01"
                      className="rounded-xl font-medium text-destructive"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pay-form">Forma de Pago</Label>
                    <select
                      id="pay-form"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
                      value={paymentForm}
                      onChange={(e) => setPaymentForm(e.target.value)}
                    >
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Cash">Efectivo (Cash)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-date">Fecha de Pago</Label>
                    <Input
                      id="pay-date"
                      type="date"
                      className="rounded-xl font-semibold"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-2">
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Neto Calculado</span>
                  <span className="text-3xl font-extrabold text-green-500">${getSumTotal().toFixed(2)}</span>
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
                  <Save className="mr-2 h-4 w-4" /> Liquidar y Guardar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
