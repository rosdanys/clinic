"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Sparkles, Calculator, User, ClipboardList, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/components/providers/app-providers";

export default function NewPatientPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUser();

  // Estados del Formulario
  // Sección 1
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("Masculino");
  const [phone, setPhone] = useState("");

  // Sección 2
  const [classification, setClassification] = useState("Nuevo");
  const [isNew, setIsNew] = useState(true);
  const [isEstablished, setIsEstablished] = useState(false);
  const [consultReason, setConsultReason] = useState("");
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceProviderId, setInsuranceProviderId] = useState("");

  // Sección 3
  const [consultationFee, setConsultationFee] = useState("0.00");
  const [labFee, setLabFee] = useState("0.00");
  const [medsFee, setMedsFee] = useState("0.00");
  const [procedureFee, setProcedureFee] = useState("0.00");
  const [otherFee, setOtherFee] = useState("0.00");
  const [amountPaid, setAmountPaid] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [comments, setComments] = useState("");

  // Catálogos
  const { data: insurances } = useQuery({
    queryKey: ["insurances-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_providers").select("*");
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

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

  const filteredDoctors = doctors?.filter((doc: any) =>
    doc.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const selectedDoctorName = doctors?.find((d: any) => d.id === selectedDoctorId)?.name || "";

  useEffect(() => {
    if (doctors && doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
      setDoctorSearch(doctors[0].name);
    }
  }, [doctors]);

  // Autocalcular edad desde fecha de nacimiento (DOB)
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge >= 0 ? calculatedAge : "");
    } else {
      setAge("");
    }
  }, [dob]);

  // Máscara simple de teléfono
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 10) input = input.substring(0, 10);
    
    // Formato: (XXX) XXX-XXXX
    let formatted = input;
    if (input.length > 6) {
      formatted = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6)}`;
    } else if (input.length > 3) {
      formatted = `(${input.substring(0, 3)}) ${input.substring(3)}`;
    } else if (input.length > 0) {
      formatted = `(${input}`;
    }
    setPhone(formatted);
  };

  // Cálculos de la calculadora de cobros
  const getSumTotal = () => {
    return (
      Number(consultationFee || 0) +
      Number(labFee || 0) +
      Number(medsFee || 0) +
      Number(procedureFee || 0) +
      Number(otherFee || 0)
    );
  };

  const getBalance = () => {
    const total = getSumTotal();
    const paid = Number(amountPaid || 0);
    return Math.max(0, total - paid);
  };

  // Ajustar el cobro si el método es Seguro o cambia el total
  useEffect(() => {
    if (paymentMethod === "Seguro") {
      setAmountPaid("0.00");
    }
  }, [paymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (name.trim().length < 3) {
      alert("Nombre inválido (debe tener al menos 3 caracteres)");
      return;
    }
    if (!phone || phone.length < 14) {
      alert("Teléfono inválido (debe cumplir el formato completo)");
      return;
    }
    if (!dob) {
      alert("Debe seleccionar una fecha de nacimiento");
      return;
    }
    if (consultReason.trim().length < 5) {
      alert("Describa el motivo de la consulta (mínimo 5 caracteres)");
      return;
    }
    if (!selectedDoctorId) {
      alert("Seleccioná un médico antes de continuar");
      return;
    }

    try {
      // 1. Insertar el paciente
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          name,
          date_of_birth: dob,
          gender,
          phone,
          classification,
          is_new: isNew,
          is_established: isEstablished,
          consult_reason: consultReason,
          has_insurance: hasInsurance,
          insurance_provider_id: hasInsurance && insuranceProviderId ? insuranceProviderId : null,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // 2. Crear cita del día en Supabase
      const { data: appointment, error: apptError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patient.id,
          doctor_id: selectedDoctorId,
          date,
          time: time + ":00",
          reason: consultReason,
          type: classification,
          status: "Pendiente",
          created_by: profile?.id,
        })
        .select()
        .single();

      if (apptError) throw apptError;

      // 3. Crear el cobro asociado si el total es > 0
      const total = getSumTotal();
      if (total > 0) {
        const { error: payError } = await supabase
          .from("payments")
          .insert({
            appointment_id: appointment.id,
            patient_id: patient.id,
            concept: `Consulta Inicial - ${name}`,
            consultation_fee: Number(consultationFee),
            lab_fee: Number(labFee),
            meds_fee: Number(medsFee),
            procedure_fee: Number(procedureFee),
            other_fee: Number(otherFee),
            amount_paid: Number(amountPaid),
            balance: getBalance(),
            method: paymentMethod,
            created_by: profile?.id,
          });

        if (payError) throw payError;
      }

      router.push("/protected/patients");
    } catch (err: any) {
      console.error(err);
      alert("Error al registrar paciente: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl border-border/80"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Consulta / Paciente</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Registrar ficha clínica, agendar consulta y procesar cobros de pacientes en un único flujo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1: Datos Personales */}
        <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/40 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">1. Datos Personales</CardTitle>
              <CardDescription>Información demográfica e identificación del paciente.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="date">Fecha Registro</Label>
              <Input
                id="date"
                type="date"
                className="rounded-xl"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Hora Registro</Label>
              <Input
                id="time"
                type="time"
                className="rounded-xl"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                className="rounded-xl"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dob">Fecha de Nacimiento</Label>
              <Input
                id="dob"
                type="date"
                className="rounded-xl"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="age">Edad Calculada</Label>
              <Input
                id="age"
                type="text"
                className="rounded-xl bg-muted/50 cursor-not-allowed font-semibold text-primary"
                disabled
                value={age !== "" ? `${age} años` : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Sexo</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(000) 000-0000"
                className="rounded-xl"
                required
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Clasificación y Consulta */}
        <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/40 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">2. Clasificación y Consulta</CardTitle>
              <CardDescription>Médico asignado, seguro médico y clasificación del paciente.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="classification">Clasificación</Label>
              <select
                id="classification"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={classification}
                onChange={(e) => {
                  setClassification(e.target.value);
                  setIsNew(e.target.value === "Nuevo");
                  setIsEstablished(e.target.value === "Seguimiento");
                }}
              >
                <option value="Nuevo">Paciente Nuevo (Primera vez)</option>
                <option value="Seguimiento">Paciente Establecido (Seguimiento)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doctor-search">Médico / Especialista</Label>
              <div className="relative">
                <input
                  id="doctor-search"
                  type="text"
                  placeholder="Buscá un médico..."
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  value={isDoctorOpen ? doctorSearch : selectedDoctorName}
                  onChange={(e) => {
                    setDoctorSearch(e.target.value);
                    setIsDoctorOpen(true);
                  }}
                  onFocus={() => {
                    setDoctorSearch("");
                    setIsDoctorOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsDoctorOpen(false), 200);
                  }}
                />
                {isDoctorOpen && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                    {filteredDoctors?.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No se encontraron médicos
                      </div>
                    ) : (
                      filteredDoctors?.map((doc: any) => (
                        <button
                          key={doc.id}
                          type="button"
                          className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                            selectedDoctorId === doc.id ? "bg-accent font-medium" : ""
                          }`}
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setDoctorSearch(doc.name);
                            setIsDoctorOpen(false);
                          }}
                        >
                          {doc.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="reason">Motivo de la Consulta</Label>
              <textarea
                id="reason"
                rows={3}
                placeholder="Detalle el motivo clínico de la consulta..."
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                required
                value={consultReason}
                onChange={(e) => setConsultReason(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2">
                <input
                  id="insurance-toggle"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={hasInsurance}
                  onChange={(e) => setHasInsurance(e.target.checked)}
                />
                <Label htmlFor="insurance-toggle" className="cursor-pointer font-semibold">
                  ¿Tiene Seguro Médico?
                </Label>
              </div>
            </div>
            {hasInsurance && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="insurance-provider">Nombre del Seguro / Proveedor</Label>
                <select
                  id="insurance-provider"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  value={insuranceProviderId}
                  onChange={(e) => setInsuranceProviderId(e.target.value)}
                >
                  <option value="">Seleccione aseguradora...</option>
                  {insurances?.map((ins: any) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección 3: Calculadora de Cobro */}
        <Card className="border-border/60 shadow-sm bg-gradient-to-b from-background to-muted/10">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/40 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">3. Cobros e Ingresos (Calculadora)</CardTitle>
              <CardDescription>Cálculos de montos en tiempo real.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="consult-fee">Pago Consulta ($)</Label>
              <Input
                id="consult-fee"
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl font-medium"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lab-fee">Laboratorio ($)</Label>
              <Input
                id="lab-fee"
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl font-medium"
                value={labFee}
                onChange={(e) => setLabFee(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meds-fee">Medicamentos ($)</Label>
              <Input
                id="meds-fee"
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl font-medium"
                value={medsFee}
                onChange={(e) => setMedsFee(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proc-fee">Procedimientos ($)</Label>
              <Input
                id="proc-fee"
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl font-medium"
                value={procedureFee}
                onChange={(e) => setProcedureFee(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="other-fee">Otros Cobros ($)</Label>
              <Input
                id="other-fee"
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl font-medium"
                value={otherFee}
                onChange={(e) => setOtherFee(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="total-calculated" className="text-primary font-bold">Total Cobrado</Label>
              <Input
                id="total-calculated"
                type="text"
                disabled
                className="rounded-xl bg-primary/10 border-primary/20 text-primary font-bold cursor-not-allowed text-base"
                value={`$${getSumTotal().toFixed(2)}`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <select
                id="payment-method"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Efectivo (Cash)</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Zelle">Zelle</option>
                <option value="Seguro">Seguro Médico</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount-paid">Monto Pagado ($)</Label>
              <Input
                id="amount-paid"
                type="number"
                step="0.01"
                min="0"
                max={getSumTotal()}
                className="rounded-xl font-semibold text-green-500 border-green-500/20"
                disabled={paymentMethod === "Seguro"}
                value={paymentMethod === "Seguro" ? "0.00" : amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="balance-calculated" className="text-destructive font-bold">Balance Pendiente</Label>
              <Input
                id="balance-calculated"
                type="text"
                disabled
                className="rounded-xl bg-destructive/10 border-destructive/20 text-destructive font-bold cursor-not-allowed text-base"
                value={`$${getBalance().toFixed(2)}`}
              />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <Label htmlFor="comments">Comentarios del Pago</Label>
              <textarea
                id="comments"
                rows={2}
                placeholder="Observaciones de facturación..."
                className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/80 font-semibold"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold px-8 shadow-md shadow-primary/20"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar y Registrar
          </Button>
        </div>
      </form>
    </div>
  );
}
