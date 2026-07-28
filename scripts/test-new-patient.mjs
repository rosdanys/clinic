import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kdbldxibpfotfjsnnjtr.supabase.co";
const ANON_KEY = "sb_publishable_KFl8VbMjo2Ta7mZysEOMHA_nRK9MR63";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  // 1. Login como recepcionista
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: "ramiro.funes@clinica.com",
    password: "clinica2026",
  });
  if (loginError) { console.error("❌ Login failed:", loginError.message); process.exit(1); }
  console.log("✅ Logged in as", session.user.email, `(id: ${session.user.id})`);

  // 2. Obtener datos necesarios
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", session.user.id).single();
  if (!profile) { console.error("❌ Profile not found"); process.exit(1); }
  console.log("✅ Profile ID:", profile.id);

  const { data: doctor } = await supabase.from("profiles").select("id, name").eq("role", "Médico").limit(1).single();
  if (!doctor) { console.error("❌ No doctor found"); process.exit(1); }
  console.log("✅ Doctor:", doctor.name, `(id: ${doctor.id})`);

  const { data: insurance } = await supabase.from("insurance_providers").select("id, name").limit(1).single();
  console.log("✅ Insurance:", insurance?.name ?? "none");

  // 3. Crear paciente de prueba
  const patientData = {
    name: `Test Paciente ${Date.now()}`,
    date_of_birth: "1990-05-15",
    gender: "Masculino",
    phone: "(123) 456-7890",
    classification: "Nuevo",
    is_new: true,
    is_established: false,
    consult_reason: "Dolor de cabeza persistente desde hace una semana",
    has_insurance: true,
    insurance_provider_id: insurance?.id ?? null,
    created_by: profile.id,
  };

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert(patientData)
    .select()
    .single();

  if (patientError) { console.error("❌ Patient insert failed:", patientError.message); process.exit(1); }
  console.log(`✅ Patient created: ${patient.name} (id: ${patient.id})`);

  // 4. Crear cita
  const appointmentData = {
    patient_id: patient.id,
    doctor_id: doctor.id,
    date: new Date().toISOString().split("T")[0],
    time: "10:00:00",
    reason: patientData.consult_reason,
    type: "Nuevo",
    status: "Pendiente",
    created_by: profile.id,
  };

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert(appointmentData)
    .select()
    .single();

  if (apptError) { console.error("❌ Appointment insert failed:", apptError.message); process.exit(1); }
  console.log(`✅ Appointment created (id: ${appointment.id}, status: ${appointment.status})`);

  // 5. Crear cobro
  const paymentData = {
    appointment_id: appointment.id,
    patient_id: patient.id,
    concept: `Consulta Inicial - ${patient.name}`,
    consultation_fee: 500.00,
    lab_fee: 0,
    meds_fee: 150.00,
    procedure_fee: 0,
    other_fee: 0,
    amount_paid: 500.00,
    balance: 150.00,
    method: "Cash",
    created_by: profile.id,
  };

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert(paymentData)
    .select()
    .single();

  if (payError) { console.error("❌ Payment insert failed:", payError.message); process.exit(1); }
  console.log(`✅ Payment created (id: ${payment.id}, paid: $${paymentData.amount_paid}, balance: $${paymentData.balance})`);

  // 6. Verificar todo
  console.log("\n========== VERIFICACIÓN ==========");

  const { data: checkPatient } = await supabase.from("patients").select("*, appointments(*), payments(*)").eq("id", patient.id).single();
  console.log("\n📋 Paciente:");
  console.log("  Nombre:", checkPatient.name);
  console.log("  Fecha Nac.:", checkPatient.date_of_birth);
  console.log("  Teléfono:", checkPatient.phone);
  console.log("  Clasificación:", checkPatient.classification);
  console.log("  Tiene seguro:", checkPatient.has_insurance);
  console.log("  Creado por:", checkPatient.created_by);

  console.log("\n📅 Cita:");
  console.log("  Fecha:", checkPatient.appointments?.[0]?.date);
  console.log("  Hora:", checkPatient.appointments?.[0]?.time);
  console.log("  Doctor ID:", checkPatient.appointments?.[0]?.doctor_id);
  console.log("  Status:", checkPatient.appointments?.[0]?.status);

  console.log("\n💰 Cobro:");
  console.log("  Consulta:", checkPatient.payments?.[0]?.consultation_fee);
  console.log("  Medicamentos:", checkPatient.payments?.[0]?.meds_fee);
  console.log("  Pagado:", checkPatient.payments?.[0]?.amount_paid);
  console.log("  Saldo:", checkPatient.payments?.[0]?.balance);
  console.log("  Método:", checkPatient.payments?.[0]?.method);

  // 7. Limpiar — borrar datos de prueba
  console.log("\n========== LIMPIEZA ==========");
  await supabase.from("payments").delete().eq("id", payment.id);
  await supabase.from("appointments").delete().eq("id", appointment.id);
  await supabase.from("patients").delete().eq("id", patient.id);
  console.log("✅ Datos de prueba eliminados");

  console.log("\n🎉 Flujo completo verificado — todo OK");
}

main().catch(console.error);
