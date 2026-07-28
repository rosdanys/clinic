"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Filter,
  Download,
  User,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  CreditCard,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PatientsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("Todos");
  const [dateFilter, setDateFilter] = useState("");

  // Cargar lista de pacientes
  const { data: patients, isLoading, refetch } = useQuery({
    queryKey: ["patients-list", classificationFilter, search, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select(`
          *,
          appointments (id, date, doctor_id, profiles!appointments_doctor_id_fkey(name)),
          payments (total, amount_paid)
        `);

      if (classificationFilter !== "Todos") {
        query = query.eq("classification", classificationFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Mapear con datos enriquecidos (última visita, médico, total pagado)
      const mapped = data?.map((patient: any) => {
        // Ordenar citas por fecha descendente
        const sortedAppts = patient.appointments?.sort(
          (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastVisit = sortedAppts?.[0]?.date || "Sin visitas";
        const assignedDoctor = sortedAppts?.[0]?.profiles?.name || "Sin médico";

        const totalPaid = patient.payments?.reduce(
          (acc: number, curr: any) => acc + Number(curr.amount_paid || 0),
          0
        ) || 0;

        // Calcular edad
        const dob = new Date(patient.date_of_birth);
        const age = new Date().getFullYear() - dob.getFullYear();

        return {
          ...patient,
          age,
          lastVisit,
          assignedDoctor,
          totalPaid,
        };
      });

      return mapped || [];
    },
  });

  // Exportar lista a CSV
  const handleExportCSV = () => {
    if (!patients) return;
    const headers = ["ID", "Nombre", "Teléfono", "Edad", "Clasificación", "Última Visita", "Médico Asignado", "Total Pagado"];
    const rows = patients.map((p) => [
      p.id,
      p.name,
      p.phone,
      p.age,
      p.classification,
      p.lastVisit,
      p.assignedDoctor,
      p.totalPaid,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_pacientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSoftDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) {
        alert("Error al eliminar paciente: " + error.message);
      } else {
        refetch();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Directorio de Pacientes</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Administración, fichas clínicas e historial médico de pacientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/80 text-muted-foreground font-semibold" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Link href="/protected/patients/new" passHref>
            <Button className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white">
              <Plus className="mr-2 h-4 w-4" /> Registrar Paciente
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre o teléfono del paciente..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md">
            {["Todos", "Nuevo", "Seguimiento"].map((filter) => (
              <Button
                key={filter}
                variant={classificationFilter === filter ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4"
                onClick={() => setClassificationFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Paciente</th>
                  <th className="py-4 px-6">Teléfono</th>
                  <th className="py-4 px-6">Edad</th>
                  <th className="py-4 px-6">Clasificación</th>
                  <th className="py-4 px-6">Última Visita</th>
                  <th className="py-4 px-6">Médico Cabecera</th>
                  <th className="py-4 px-6">Total Pagado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      Cargando pacientes...
                    </td>
                  </tr>
                ) : patients && patients.length > 0 ? (
                  patients.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-semibold uppercase">
                            {p.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground">ID: {p.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {p.phone}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-foreground">{p.age} años</td>
                      <td className="py-4 px-6">
                        <Badge
                          variant="outline"
                          className={
                            p.classification === "Nuevo"
                              ? "border-blue-500/20 text-blue-500 bg-blue-500/5 font-bold"
                              : "border-muted-foreground/20 text-muted-foreground bg-muted/10 font-bold"
                          }
                        >
                          {p.classification}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {p.lastVisit}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">{p.assignedDoctor}</td>
                      <td className="py-4 px-6 font-semibold text-foreground">
                        ${p.totalPaid.toLocaleString("es-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/protected/patients/${p.id}`} passHref>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Ver ficha">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            title="Editar"
                            onClick={() => router.push(`/protected/patients/${p.id}?edit=true`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                            title="Eliminar"
                            onClick={() => handleSoftDelete(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No se encontraron pacientes registrados.
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
