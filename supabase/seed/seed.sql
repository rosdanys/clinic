-- ============================================================================
-- SEED DATA: Clinic Control
-- Populates all tables with realistic mock data matching the application code.
-- ============================================================================

-- ============================================================================
-- 1. AUTH USERS (needed before profiles because of FK constraint)
-- Uses default password: "clinica2026" (bcrypt hash via pgcrypto)
-- ============================================================================
-- Nota: En producción los usuarios se crean via el flujo de registro.
-- Acá los creamos directamente para desarrollo.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_user_meta_data, created_at, updated_at) values
  ('10000000-0000-0000-0000-000000000001', 'hernan.rossi@clinica.com',   crypt('clinica2026', gen_salt('bf', 10)), now(), now(), '{"name":"Dr. Hernán Rossi","role":"Médico"}'::jsonb,     now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'sofia.martinez@clinica.com', crypt('clinica2026', gen_salt('bf', 10)), now(), now(), '{"name":"Dra. Sofía Martínez","role":"Médico"}'::jsonb,   now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'ramiro.funes@clinica.com',   crypt('clinica2026', gen_salt('bf', 10)), now(), now(), '{"name":"Ramiro Funes","role":"Recepción"}'::jsonb,       now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'clara.ortiz@clinica.com',    crypt('clinica2026', gen_salt('bf', 10)), now(), now(), '{"name":"Lic. Clara Ortíz","role":"Especialista"}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'admin@clinica.com',          crypt('clinica2026', gen_salt('bf', 10)), now(), now(), '{"name":"Admin Principal","role":"Admin"}'::jsonb,        now(), now())
on conflict (id) do nothing;

-- ============================================================================
-- 2. PROFILES (se insertan directamente; el trigger on_auth_user_created
--    los crearía automáticamente, pero acá aseguramos datos consistentes)
-- ============================================================================
insert into public.profiles (id, email, name, role, phone, specialty, is_active, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'hernan.rossi@clinica.com',    'Dr. Hernán Rossi',   'Médico',     '11-2233-4455', 'Pediatría',     true, now() - interval '6 months'),
  ('10000000-0000-0000-0000-000000000002', 'sofia.martinez@clinica.com',  'Dra. Sofía Martínez', 'Médico',    '11-5566-7788', 'Ginecología',   true, now() - interval '6 months'),
  ('10000000-0000-0000-0000-000000000003', 'ramiro.funes@clinica.com',    'Ramiro Funes',       'Recepción',  '11-9900-1122', '',              true, now() - interval '4 months'),
  ('10000000-0000-0000-0000-000000000004', 'clara.ortiz@clinica.com',     'Lic. Clara Ortíz',   'Especialista', '11-3344-5566', 'Fonoaudiología', true, now() - interval '3 months'),
  ('10000000-0000-0000-0000-000000000005', 'admin@clinica.com',           'Admin Principal',    'Admin',      '11-1111-2222', '',              true, now() - interval '12 months')
on conflict (id) do update set
  phone = excluded.phone,
  specialty = excluded.specialty,
  is_active = excluded.is_active;

-- ============================================================================
-- 3. INSURANCE PROVIDERS
-- ============================================================================
insert into public.insurance_providers (id, name) values
  ('30000000-0000-0000-0000-000000000001', 'Aetna'),
  ('30000000-0000-0000-0000-000000000002', 'Blue Cross Blue Shield'),
  ('30000000-0000-0000-0000-000000000003', 'Cigna')
on conflict (id) do nothing;

-- ============================================================================
-- 4. EXPENSE CATEGORIES
-- ============================================================================
insert into public.expense_categories (id, name) values
  ('40000000-0000-0000-0000-000000000001', 'Renta'),
  ('40000000-0000-0000-0000-000000000002', 'Laboratorio (Reactivos, Tubos)'),
  ('40000000-0000-0000-0000-000000000003', 'Material descartable (Guantes, Jeringas)'),
  ('40000000-0000-0000-0000-000000000004', 'Internet'),
  ('40000000-0000-0000-0000-000000000005', 'Electricidad')
on conflict (id) do nothing;

-- ============================================================================
-- 5. PROCEDURES
-- ============================================================================
insert into public.procedures (id, name, cost) values
  ('50000000-0000-0000-0000-000000000001', 'Consulta General',            50.00),
  ('50000000-0000-0000-0000-000000000002', 'Consulta Especializada',      80.00),
  ('50000000-0000-0000-0000-000000000003', 'Electrocardiograma (EKG)',    75.00)
on conflict (id) do nothing;

-- ============================================================================
-- 6. PATIENTS
-- ============================================================================
insert into public.patients (id, name, date_of_birth, gender, phone, classification, is_new, is_established, consult_reason, has_insurance, insurance_provider_id, created_by) values
  ('20000000-0000-0000-0000-000000000001', 'Estanislao Cortéz',   '1988-06-12', 'Masculino', '(011) 2345-6789', 'Nuevo',       true,  false, 'Dolor abdominal recurrente en hipocondrio derecho.', true,  '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000002', 'Milena Santoro',      '1995-11-23', 'Femenino',  '(011) 9876-5432', 'Seguimiento', false, true,  'Control anual de rutina con estudios de laboratorio.', true,  '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000003', 'Juan Carlos Gómez',   '1962-03-04', 'Masculino', '(011) 4567-8901', 'Seguimiento', false, true,  'Chequeo de presión arterial y ajuste de medicación.', false, null,                                                                 '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000004', 'Camila Beltrán',      '1990-08-15', 'Femenino',  '(011) 5432-1098', 'Nuevo',       true,  false, 'Ecografía obstétrica trimestral de control.',           true,  '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ============================================================================
-- 7. INVENTORY
-- Current stock is auto-calculated by the trigger: initial_quantity + entries - exits
-- ============================================================================
insert into public.inventory (id, product, category, initial_quantity, entries, exits, min_stock, provider, unit_cost, expiration_date, location) values
  ('60000000-0000-0000-0000-000000000001', 'Guantes de Látex Talla M (Caja x 100)', 'Descartables',    50,  20, 65, 10, 'FarmaMayorista',      8.50,  current_date + 60,  'Estante A-3'),
  ('60000000-0000-0000-0000-000000000002', 'Alcohol Etílico 70% (Botella 1L)',      'Desinfectantes',  30,  10, 40, 5,  'FarmaMayorista',      3.20,  current_date + 180, 'Estante A-1'),
  ('60000000-0000-0000-0000-000000000003', 'Vacuna Antigripal Cepal 2026',           'Biológicos',      10,  5,  2,  3,  'Laboratorio Central', 25.00, current_date + 15,  'Refrigerador 1')
on conflict (id) do nothing;

-- ============================================================================
-- 8. APPOINTMENTS
-- ============================================================================
insert into public.appointments (id, patient_id, doctor_id, date, time, reason, type, status, notes, created_by) values
  ('70000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   current_date, '09:00:00',
   'Dolor abdominal severo', 'Primera vez', 'Completada',
   'Paciente refiere dolor tipo cólico de 3 días de evolución. Abdomen blando, doloroso a la palpación profunda en hipocondrio derecho. Se indica ecografía abdominal urgente.',
   '10000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   current_date, '10:30:00',
   'Control anual de rutina', 'Seguimiento', 'En curso',
   '',
   '10000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   current_date, '11:15:00',
   'Chequeo de presión arterial y ajuste de dosis', 'Seguimiento', 'Pendiente',
   '',
   '10000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
   current_date, '15:00:00',
   'Ecografía obstétrica trimestral', 'Primera vez', 'Pendiente',
   '',
   '10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ============================================================================
-- 9. PAYMENTS
-- total and balance are auto-calculated by the trigger
-- ============================================================================
insert into public.payments (id, appointment_id, patient_id, concept, consultation_fee, lab_fee, meds_fee, procedure_fee, other_fee, amount_paid, method, status, created_by) values
  ('80000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Consulta General + Laboratorio', 50.00, 15.00, 0.00, 0.00, 0.00, 65.00, 'Tarjeta', 'Pagado',
   '10000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000002',
   '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Consulta General + Electrocardiograma', 50.00, 0.00, 0.00, 75.00, 0.00, 0.00, 'Seguro', 'Pendiente',
   '10000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000003',
   '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
   'Consulta Especializada + Medicación', 80.00, 0.00, 35.00, 0.00, 0.00, 50.00, 'Mixto', 'Parcial',
   '10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ============================================================================
-- 10. ACCOUNTS RECEIVABLE
-- pending_amount auto-calculated by trigger
-- ============================================================================
insert into public.accounts_receivable (id, payment_id, patient_id, concept, total_amount, paid_amount, limit_date, status) values
  ('90000000-0000-0000-0000-000000000001',
   '80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
   'Tratamiento de Conducta Completo', 350.00, 150.00, current_date - 2, 'Pendiente'),
  ('90000000-0000-0000-0000-000000000002',
   '80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Consulta General + Seguro Pendiente', 125.00, 0.00, current_date + 4, 'Pendiente')
on conflict (id) do nothing;

-- ============================================================================
-- 11. PAYROLL
-- ============================================================================
insert into public.payroll (id, employee_id, role, base_salary, hours_worked, overtime_hours, commissions, bonuses, deductions, total_paid, payment_form, payment_date, created_by) values
  ('a0000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003', 'Recepción',
   15.00, 40, 5, 0.00, 50.00, 20.00, 742.50, 'Transferencia', current_date,
   '10000000-0000-0000-0000-000000000005')
on conflict (id) do nothing;

-- ============================================================================
-- 12. EXPENSES
-- ============================================================================
insert into public.expenses (id, date, concept, category_id, provider, payment_form, amount, created_by) values
  ('b0000000-0000-0000-0000-000000000001', current_date, 'Alquiler Sede Consultorio Central',  '40000000-0000-0000-0000-000000000001', 'Inmobiliaria Rossi S.A.',   'Transferencia', 800.00, '10000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000002', current_date, 'Compra de reactivos de laboratorio y tubos', '40000000-0000-0000-0000-000000000002', 'Distribuidora Médica Norte', 'Tarjeta',       250.00, '10000000-0000-0000-0000-000000000005')
on conflict (id) do nothing;
