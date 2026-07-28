-- Supabase Database Migration
-- Proyecto: Sistema de Gestión Integral para Clínica Médica

-- 1. ENUMS
CREATE TYPE public.user_role AS ENUM ('Admin', 'Médico', 'Recepción', 'Especialista');
CREATE TYPE public.appointment_status AS ENUM ('Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada', 'No asistio');
CREATE TYPE public.payment_method AS ENUM ('Cash', 'Tarjeta', 'Zelle', 'Seguro', 'Mixto');
CREATE TYPE public.payment_status AS ENUM ('Pagado', 'Pendiente', 'Parcial');

-- 2. TABLAS BASE Y MAESTRAS
CREATE TABLE public.insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (name, parent_id)
);

-- 3. PERFILES DE USUARIOS (Extensión de auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'Recepción',
    phone TEXT,
    specialty TEXT,
    schedule JSONB DEFAULT '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PACIENTES
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('Masculino', 'Femenino', 'Otro')),
    phone TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT 'Nuevo', -- Nuevo / Seguimiento
    is_new BOOLEAN NOT NULL DEFAULT true,
    is_established BOOLEAN NOT NULL DEFAULT false,
    consult_reason TEXT,
    has_insurance BOOLEAN NOT NULL DEFAULT false,
    insurance_provider_id UUID REFERENCES public.insurance_providers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CITAS (Appointments)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Primera vez', -- Primera vez / Seguimiento
    status public.appointment_status NOT NULL DEFAULT 'Pendiente',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. COBROS (Payments)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    lab_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    meds_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    procedure_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) GENERATED ALWAYS AS (consultation_fee + lab_fee + meds_fee + procedure_fee + other_fee) STORED,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Calculado en trigger: total - amount_paid
    method public.payment_method NOT NULL DEFAULT 'Cash',
    status public.payment_status NOT NULL DEFAULT 'Pendiente',
    comments TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. GASTOS (Expenses)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    concept TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    payment_form TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    observations TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. INVENTARIO (Inventory)
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product TEXT NOT NULL,
    category TEXT NOT NULL,
    initial_quantity INT NOT NULL DEFAULT 0,
    entries INT NOT NULL DEFAULT 0,
    exits INT NOT NULL DEFAULT 0,
    current_stock INT GENERATED ALWAYS AS (initial_quantity + entries - exits) STORED,
    min_stock INT NOT NULL DEFAULT 5,
    provider TEXT,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Calculado en trigger: current_stock * unit_cost
    purchase_date DATE,
    expiration_date DATE,
    location TEXT,
    observations TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. NÓMINA (Payroll)
CREATE TABLE public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hours_worked NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commissions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bonuses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Calculado en trigger
    payment_form TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. CUENTAS POR COBRAR (Accounts Receivable)
CREATE TABLE public.accounts_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    concept TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pending_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Calculado en trigger: total_amount - paid_amount
    limit_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendiente', -- Pagado, Pendiente, Vencido
    observations TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 11. TRIGGERS Y FUNCIONES AUTOMÁTICAS

-- Sincronizar auth.users con public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
  assigned_role public.user_role;
BEGIN
  -- Si no hay registros en profiles, el primero es Admin.
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
  
  IF is_first_user THEN
    assigned_role := 'Admin'::public.user_role;
  ELSE
    assigned_role := 'Recepción'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, is_active)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    assigned_role,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger de updated_at para todas las tablas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cálculos automáticos de cobros
CREATE OR REPLACE FUNCTION process_payment_balances()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance = (NEW.consultation_fee + NEW.lab_fee + NEW.meds_fee + NEW.procedure_fee + NEW.other_fee) - NEW.amount_paid;
    IF NEW.balance <= 0 THEN
        NEW.status = 'Pagado'::public.payment_status;
    ELSIF NEW.amount_paid > 0 THEN
        NEW.status = 'Parcial'::public.payment_status;
    ELSE
        NEW.status = 'Pendiente'::public.payment_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_payment_upsert
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION process_payment_balances();

-- Generación automática de Cuentas por Cobrar cuando método es Seguro o balance > 0
CREATE OR REPLACE FUNCTION auto_generate_accounts_receivable()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el método es 'Seguro' o el balance pendiente es mayor a 0, creamos una CxC
    IF (NEW.method = 'Seguro'::public.payment_method OR NEW.balance > 0) THEN
        INSERT INTO public.accounts_receivable (
            patient_id,
            payment_id,
            concept,
            total_amount,
            paid_amount,
            pending_amount,
            limit_date,
            status,
            created_by
        ) VALUES (
            NEW.patient_id,
            NEW.id,
            NEW.concept,
            NEW.consultation_fee + NEW.lab_fee + NEW.meds_fee + NEW.procedure_fee + NEW.other_fee,
            NEW.amount_paid,
            NEW.balance,
            (CURRENT_DATE + INTERVAL '30 days')::DATE, -- 30 días de plazo por defecto
            'Pendiente',
            NEW.created_by
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_insert
    AFTER INSERT ON public.payments
    FOR EACH ROW EXECUTE FUNCTION auto_generate_accounts_receivable();

-- Sincronización del total_cost del inventario
CREATE OR REPLACE FUNCTION sync_inventory_costs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost = (NEW.initial_quantity + NEW.entries - NEW.exits) * NEW.unit_cost;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_inventory_upsert
    BEFORE INSERT OR UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION sync_inventory_costs();

-- Cálculo automático de nómina
CREATE OR REPLACE FUNCTION calculate_payroll_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_paid = (NEW.base_salary * NEW.hours_worked) + 
                     (NEW.base_salary * 1.5 * NEW.overtime_hours) + 
                     NEW.commissions + 
                     NEW.bonuses - 
                     NEW.deductions;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_payroll_upsert
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW EXECUTE FUNCTION calculate_payroll_total();


-- 12. DATOS DE INICIALIZACIÓN (CATÁLOGOS)

-- Aseguradoras
INSERT INTO public.insurance_providers (name) VALUES
('Sin Seguro'),
('Aetna'),
('Blue Cross Blue Shield'),
('Cigna'),
('Humana'),
('UnitedHealthcare');

-- Métodos de Pago
INSERT INTO public.payment_methods (name) VALUES
('Cash'),
('Tarjeta'),
('Zelle'),
('Seguro'),
('Mixto');

-- Procedimientos
INSERT INTO public.procedures (name, cost) VALUES
('Consulta General', 50.00),
('Consulta Especializada', 80.00),
('Limpieza Dental', 60.00),
('Extracción de Sangre', 15.00),
('Electrocardiograma (EKG)', 75.00),
('Ultrasonido Diagnóstico', 120.00),
('Sutura de Herida', 45.00);

-- Categorías de Gasto Jerárquicas
DO $$
DECLARE
  servicios_id UUID;
  personal_id UUID;
  insumos_id UUID;
  mantenimiento_id UUID;
  software_id UUID;
BEGIN
  -- Root: Servicios básicos
  INSERT INTO public.expense_categories (name) VALUES ('Servicios básicos') RETURNING id INTO servicios_id;
  INSERT INTO public.expense_categories (name, parent_id) VALUES 
  ('Renta', servicios_id),
  ('Internet', servicios_id),
  ('Electricidad', servicios_id),
  ('Agua', servicios_id),
  ('Teléfono', servicios_id);

  -- Root: Personal
  INSERT INTO public.expense_categories (name) VALUES ('Personal') RETURNING id INTO personal_id;
  INSERT INTO public.expense_categories (name, parent_id) VALUES 
  ('Salarios', personal_id),
  ('Impuestos de nómina', personal_id);

  -- Root: Insumos médicos
  INSERT INTO public.expense_categories (name) VALUES ('Insumos médicos') RETURNING id INTO insumos_id;
  INSERT INTO public.expense_categories (name, parent_id) VALUES 
  ('Vacunas', insumos_id),
  ('Medicamentos', insumos_id),
  ('Material descartable (Guantes, Jeringas)', insumos_id),
  ('Laboratorio (Reactivos, Tubos)', insumos_id);

  -- Root: Mantenimiento
  INSERT INTO public.expense_categories (name) VALUES ('Mantenimiento') RETURNING id INTO mantenimiento_id;
  INSERT INTO public.expense_categories (name, parent_id) VALUES 
  ('Limpieza', mantenimiento_id),
  ('Basura médica', mantenimiento_id);

  -- Root: Software
  INSERT INTO public.expense_categories (name) VALUES ('Software') RETURNING id INTO software_id;
  INSERT INTO public.expense_categories (name, parent_id) VALUES 
  ('eClinicalWorks', software_id),
  ('QuickBooks', software_id);
END $$;
