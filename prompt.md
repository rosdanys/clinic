# Prompt Mejorado: Sistema de Gestión Integral para Clínica Médica
## Versión Orientada a Flujo de Usuario y Arquitectura de Páginas

---

## 1. Visión General y Stack Tecnológico

**Propósito:** Reemplazar un sistema basado en Excel por una aplicación web multiusuario con sincronización en tiempo real para la gestión integral de una clínica médica.

**Stack Técnico:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Componentes UI:** Radix UI (shadcn/ui)
- **Gráficos:** Recharts
- **Backend/BD:** Supabase (PostgreSQL + Auth + Realtime)
- **Autenticación:** Supabase Auth (NO Clerk)
- **Estado:** TanStack Query (React Query)

**Restricciones:**
- No usar Clerk
- Responsive (optimizado para tablets en recepción)
- Datos sincronizados en tiempo real para múltiples usuarios

---

## 2. Arquitectura de Base de Datos (Supabase)

### Tablas Principales

| Tabla | Descripción | Relaciones Clave |
|-------|-------------|------------------|
| `users` | Usuarios del sistema con roles | Auth de Supabase |
| `patients` | Ficha completa del paciente | 1:N appointments, payments |
| `appointments` | Citas médicas con estado | N:1 patients, users (médico) |
| `payments` | Cobros por consulta | N:1 appointments, patients |
| `expenses` | Egresos categorizados | — |
| `inventory` | Control de insumos | — |
| `payroll` | Nómina de empleados | N:1 users |
| `accounts_receivable` | Cuentas por cobrar | N:1 patients, payments |
| `doctors` | Catálogo de médicos/especialistas | Referenciado en appointments |
| `procedures` | Catálogo de procedimientos | Referenciado en payments |
| `payment_methods` | Catálogo de métodos de pago | Referenciado en payments |
| `expense_categories` | Catálogo de categorías de gasto | Referenciado en expenses |
| `insurance_providers` | Catálogo de aseguradoras | Referenciado en patients |

### Consideraciones de BD
- Todas las tablas: `created_at`, `updated_at`, `created_by` (auditoría)
- Políticas RLS (Row Level Security) por rol
- Triggers para cálculos automáticos (totales, existencias, balances)
- Índices en campos de búsqueda frecuente (nombre, teléfono, fecha)

---

## 3. Estructura de Navegación y Matriz de Permisos

### Sidebar (Menú Lateral Fijo)

```
[Logo Clínica]
[Nombre de la Clínica]

Dashboard          [Badge rojo si hay alertas]
Pacientes
Calendario         [Badge rojo si citas pendientes]
Cobros             [Badge rojo si pagos pendientes]
Gastos
Inventario         [Badge amarillo si stock bajo]
Nómina
Cuentas por Cobrar [Badge rojo si vencidas]
Reportes
Configuración
Cerrar Sesión
```

### Matriz de Permisos por Rol

| Módulo | Admin | Médico | Recepción | Especialista |
|--------|:-----:|:------:|:---------:|:------------:|
| Dashboard | Si | Si (solo sus datos) | Si | Si (solo sus datos) |
| Pacientes | CRUD | Ver/Editar sus pacientes | CRUD | Ver/Editar sus pacientes |
| Calendario | CRUD | Ver/Editar sus citas | CRUD | Ver/Editar sus citas |
| Cobros | CRUD | No | CRUD | No |
| Gastos | CRUD | No | No | No |
| Inventario | CRUD | No | Lectura + Alertas | No |
| Nómina | CRUD | No | No | No |
| Cuentas por Cobrar | CRUD | No | CRUD | No |
| Reportes | Todos | Solo sus datos | No | Solo sus datos |
| Configuración | CRUD | No | No | No |

---

## 4. Flujo de Usuario Principal y Mapa de Páginas

### Diagrama de Flujo General

```
                    LOGIN
                      |
        +-------------+-------------+
        |             |             |
     ADMIN         MEDICO       RECEPCION
        |             |             |
        +-------------+-------------+
                      |
        +-------------+-------------+
        |                           |
   PAGINAS COMPARTIDAS       PAGINAS ESPECIFICAS
   - Dashboard                 Admin: Gastos, Nómina
   - Pacientes                Recepción: Cobros, CxC
   - Calendario
   - Perfil
```

---

## 5. Especificación Detallada por Página

---

### 5.1 Página: Login (/login)

**Objetivo:** Autenticación segura de usuarios.

**Layout:**
- Centrado, fondo con gradiente sutil o imagen médica difuminada
- Card de login con logo de la clínica
- Formulario minimalista

**Componentes:**
| Componente | Tipo | Especificación |
|------------|------|----------------|
| Email | Input | Tipo email, validación regex |
| Contraseña | Input | Tipo password, toggle visibilidad |
| Botón Login | Button | Primario, loading state mientras autentica |
| Recordarme | Checkbox | Opcional, guarda sesión en localStorage |
| Recuperar contraseña | Link | Abre modal para reset vía email |

**Flujo:**
1. Usuario ingresa credenciales
2. Supabase Auth valida
3. Redirección según rol:
   - Admin -> /dashboard
   - Médico -> /dashboard
   - Recepción -> /dashboard
4. Token JWT guardado en cookies (httpOnly)

**Estados de Error:**
- Credenciales inválidas -> Toast rojo
- Cuenta no verificada -> Toast amarillo con instrucciones
- Error de red -> Toast rojo con retry

---

### 5.2 Página: Dashboard (/dashboard)

**Objetivo:** Vista panorámica del estado actual de la clínica. Punto de entrada principal.

**Layout:**
- Header: "Dashboard" + Fecha actual + Selector de período
- Grid de KPIs (5-9 tarjetas)
- Grid de gráficos (2x2 o 2+1)
- Acciones rápidas (botones flotantes o barra)
- Tabla de pacientes atendidos
- Tabla de pacientes pendientes

**KPIs (Tarjetas Superiores):**

| # | KPI | Icono | Color | Cálculo | Badge |
|---|-----|-------|-------|---------|-------|
| 1 | Pacientes Atendidos Hoy | Usuarios | Azul | COUNT appointments WHERE date = hoy | Nuevos: X / Seguimiento: Y |
| 2 | Dinero Recibido Hoy | Dinero | Verde | SUM payments WHERE date = hoy | Flecha arriba/abajo vs ayer |
| 3 | Gastos de Hoy | Gráfica bajando | Rojo | SUM expenses WHERE date = hoy | — |
| 4 | Ganancia Neta Hoy | Dinero | Verde oscuro | Ingresos - Gastos | Flecha arriba/abajo vs ayer |
| 5 | Total Semanal | Calendario | Púrpura | SUM payments WHERE semana actual | Toggle Semana/Mes |
| 6 | Método de Pago Más Usado | Tarjeta | Naranja | MODE(payment_method) | Nombre del método |
| 7 | Procedimiento Más Realizado | Hospital | Índigo | MODE(procedure) | Contador |
| 8 | Médico con Más Pacientes | Doctor | Cyan | COUNT GROUP BY doctor | Avatar + nombre |
| 9 | Ingreso Promedio/Paciente | Gráfica subiendo | Verde | AVG(payment_total) | — |

**Gráficos:**

| Gráfico | Tipo | Datos | Interactividad |
|---------|------|-------|----------------|
| Ingresos por Período | Línea/Barra | Últimos 7 días o 12 meses | Toggle Día/Mes, tooltip con monto |
| Gastos por Categoría | Dona | SUM por categoría | Click en segmento filtra tabla |
| Pacientes Nuevos vs Seguimiento | Barras agrupadas | Por día de la semana | Hover muestra cantidad exacta |
| Distribución Métodos de Pago | Circular | Porcentaje por método | Leyenda clickeable para filtrar |
| Ingresos vs Gastos | Barras comparativas | Mensual últimos 6 meses | Línea de tendencia superpuesta |

**Tabla: Pacientes Atendidos:**
- Columnas: Hora | Nombre | Médico | Tipo (badge Nuevo/Seguimiento) | Acción (Ver ficha)
- Filtros: Hoy | Semana | Mes | Por médico | Por tipo
- Búsqueda: Input en vivo por nombre o teléfono
- Paginación: 10 registros por vista
- Acción "Ver Ficha": Redirige a /patients/[id]

**Tabla: Pacientes Pendientes:**
- Columnas: Hora | Nombre | Médico | Motivo | Estado (badge color)
- Ordenamiento: Por hora ascendente (automático)
- Estados:
  - Amarillo: Pendiente (sin confirmar)
  - Verde: Confirmada
  - Azul: En curso (paciente en consulta)
  - Gris: Completada
  - Rojo: Cancelada / No show
- Alerta de retraso: Si hora actual > hora cita + 15min y estado no es Completada -> fila parpadea en rojo suave

**Acciones Rápidas:**
- Nueva Cita: Abre modal /appointments/new con formulario rápido
- Buscar Paciente: Input con autocompletado -> redirige a ficha o crea nuevo

**Flujo de Usuario en Dashboard:**
```
Usuario inicia sesión
        |
        v
   Dashboard
   Carga inicial (skeleton)
        |
   +----+----+
   |         |
   v         v
Ver KPI   Revisar
Cards     pacientes
          pendientes
   |         |
   v         v
Click     Click en
gráfico   paciente
para      pendiente
detalle   |
          v
     Calendario
     o Ficha
     Paciente
```

---

### 5.3 Página: Pacientes (/patients)

**Objetivo:** Gestión completa del registro, búsqueda y ficha de pacientes.

**Vista Lista (/patients):**

| Columna | Tipo | Filtro/Sort |
|---------|------|-------------|
| Fecha última visita | Date | Rango de fechas |
| Nombre completo | Texto | Búsqueda en vivo |
| Teléfono | Tel | Búsqueda exacta |
| Edad | Número | Rango |
| Tipo | Badge (Nuevo/Seguimiento) | Select |
| Médico asignado | Avatar + Nombre | Select |
| Total pagado (hist.) | Moneda | Rango |
| Acciones | Botones | — |

**Acciones por fila:**
- Ver ficha completa -> /patients/[id]
- Editar -> Modal con formulario completo
- Eliminar -> Confirmación + soft delete
- Ver citas -> Redirige a Calendario filtrado por paciente
- Ver pagos -> Redirige a Cobros filtrado por paciente

**Vista Ficha del Paciente (/patients/[id]):**

**Tarjeta de Identificación:**
- Avatar genérico
- Nombre completo
- Edad + Sexo
- Teléfono
- Tipo: Nuevo (primera visita: fecha) o Seguimiento
- Seguro: Si/No + nombre de aseguradora

**Tabs de Ficha del Paciente:**

| Tab | Contenido | Acciones |
|-----|-----------|----------|
| Historial | Lista de consultas pasadas con resumen | Click en consulta -> detalle completo |
| Pagos | Historial de pagos, balances pendientes | Ver recibo, registrar nuevo pago |
| Citas | Próximas citas agendadas | Reprogramar, cancelar |
| Notas | Notas libres del médico | Agregar, editar, eliminar notas |

**Formulario de Registro/Edición (/patients/new o Modal):**

**Sección 1: Datos Personales**
- Fecha (Date picker, default: hoy)
- Hora (Time picker, intervalos de 15 min)
- Nombre completo (texto, requerido, min 3 caracteres)
- Fecha de nacimiento (Date picker, calcula edad automático)
- Edad (número, solo lectura, calculada desde DOB)
- Sexo (Select: Masculino, Femenino, Otro)
- Teléfono (input con máscara (XXX) XXX-XXXX)

**Sección 2: Clasificación del Paciente**
- Tipo de paciente (Select: Nuevo / Seguimiento)
- Paciente nuevo (Toggle: Si/No)
- Paciente establecido (Toggle: Si/No)
- Motivo de consulta (Textarea, requerido, min 5 caracteres)
- Tiene seguro (Toggle: Si/No)
- Nombre del seguro (Select de catálogo, visible solo si Seguro = Si)

**Sección 3: Cobros (Calculadora Automática)**

| Concepto | Tipo | Cálculo |
|----------|------|---------|
| Pago de consulta | Moneda | Input manual |
| Laboratorio | Moneda | Input manual |
| Medicamentos | Moneda | Input manual |
| Procedimientos | Moneda | Input manual |
| Otros cobros | Moneda | Input manual |
| Total cobrado | Moneda | Suma automática de los anteriores |
| Método de pago | Select | Cash, Tarjeta, Zelle, Seguro, Mixto |
| Balance pendiente | Moneda | Calculado: Total - Pagado |
| Comentarios | Textarea | Libre |

**Comportamiento de la Calculadora:**
- Cada campo de monto tiene formato moneda automático ($X,XXX.XX)
- Total cobrado se actualiza en tiempo real al modificar cualquier monto
- Si método de pago = "Seguro", balance pendiente = total cobrado (se genera CxC)
- Si método de pago = "Mixto", permite dividir montos por método

**Validaciones del Formulario:**
| Campo | Regla | Mensaje de Error |
|-------|-------|------------------|
| Nombre completo | Min 3 caracteres, solo letras y espacios | "Nombre invalido" |
| Teléfono | Formato (XXX) XXX-XXXX | "Teléfono invalido" |
| Fecha de nacimiento | No futura, edad < 120 | "Fecha invalida" |
| Motivo de consulta | Min 5 caracteres | "Describa el motivo" |
| Total cobrado | Mayor o igual a 0 | "Monto invalido" |

**Flujo de Usuario - Recepción Registra Nuevo Paciente:**
```
Recepcionista en Dashboard
        |
        v
Click "Nueva Cita" o Navega a /patients/new
        |
        v
Formulario de Registro (3 secciones)
        |
   +----+----+
   |         |
   v         v
Datos      Completa
invalidos  y valido
   |         |
   v         v
Highlight  Sistema guarda
campos con en Supabase:
error      - Crea patient
           - Crea payment
           - Si Seguro: Crea CxC
           - Actualiza Dashboard
                |
                v
          Toast éxito
          Redirige a ficha
          paciente o Dashboard
```

---

### 5.4 Página: Calendario (/calendar)

**Objetivo:** Visualización y gestión de citas médicas en formato calendario.

**Vistas Disponibles:**

| Vista | Descripción | Uso Principal |
|-------|-------------|---------------|
| Día | Lista cronológica de 08:00 a 18:00, slots de 15min | Recepción diaria |
| Semana | Grid con 7 columnas (días), filas de horas | Planificación semanal |
| Mes | Grid mensual con badges de cantidad de citas | Vista general rápida |

**Interacciones:**
- Click en slot vacío: Abre modal "Nueva Cita" con fecha/hora prellenadas
- Click en cita existente: Abre modal "Editar Cita" con opciones:
  - Ver detalles
  - Editar (fecha, hora, médico, motivo)
  - Reprogramar (drag & drop a nuevo slot)
  - Completar (marca como atendida)
  - Cancelar (con motivo de cancelación)
- Drag & drop: Arrastrar cita a nuevo slot para reprogramar
- Filtro por médico: Dropdown para ver solo citas de un médico específico

**Modal: Nueva/Editar Cita**
- Paciente (Autocomplete, opción "Paciente nuevo" redirige a /patients/new)
- Fecha (Date picker)
- Hora (Time picker)
- Médico/Especialista (Select de catálogo)
- Motivo de consulta (Texto)
- Tipo de cita: Primera vez / Seguimiento
- Estado: Pendiente / Confirmada / En curso / Completada / Cancelada
- Notas adicionales (Textarea)

**Estados de Cita (Colores):**

| Estado | Color | Badge | Significado |
|--------|-------|-------|-------------|
| Pendiente | Amarillo | "Pendiente" | Cita agendada, sin confirmar |
| Confirmada | Verde | "Confirmada" | Paciente confirmó asistencia |
| En curso | Azul | "En curso" | Paciente está en consulta |
| Completada | Gris | "Completada" | Consulta finalizada |
| Cancelada | Rojo | "Cancelada" | Cita cancelada |
| No show | Rojo oscuro | "No asistio" | Paciente no llegó |

**Sincronización con Dashboard:**
- Al crear/editar/cancelar cita -> se actualiza "Pacientes Pendientes" en Dashboard en < 2 segundos
- Al marcar como "Completada" -> aparece en "Pacientes Atendidos" del día

**Flujo de Usuario - Recepción Agenda Cita:**
```
Recepcionista en Calendario
        |
        v
Click en slot vacío o "Nueva Cita"
        |
        v
Modal Nueva Cita
Busca paciente (autocomplete)
        |
   +----+----+
   |         |
   v         v
Existe    No existe
   |         |
   v         v
Selecciona Click "Paciente
paciente    nuevo"
   |         |
   |         v
   |    Redirige a /patients/new
   |         |
   +----+----+
        |
        v
Completa fecha, hora, médico, motivo
        |
        v
Guardar Cita
Sistema:
- Crea appointment
- Actualiza calendario
- Notifica Dashboard
        |
        v
Toast: "Cita agendada para [Paciente] a las [hora]"
```

---

### 5.5 Página: Cobros (/payments)

**Objetivo:** Historial completo de cobros, filtrado y gestión de balances pendientes.

**Filtros Disponibles:**

| Filtro | Tipo | Opciones |
|--------|------|----------|
| Rango de fechas | Date range picker | Cualquier rango |
| Médico | Multi-select | Todos los médicos del catálogo |
| Método de pago | Multi-select | Cash, Tarjeta, Zelle, Seguro, Mixto |
| Estado | Select | Pagado, Pendiente, Parcial |
| Paciente | Search | Autocomplete por nombre/teléfono |

**Columnas de la Tabla:**

| Columna | Tipo | Detalle |
|---------|------|---------|
| Fecha | Date | Formato DD/MM/YYYY |
| Paciente | Texto + Link | Click -> ficha del paciente |
| Concepto | Texto | Resumen de servicios (Consulta, Lab, etc.) |
| Método de pago | Badge | Color por método (Cash=verde, Tarjeta=azul, etc.) |
| Monto | Moneda | Formato $X,XXX.XX |
| Estado | Badge | Verde Pagado / Amarillo Parcial / Rojo Pendiente |
| Acciones | Botones | Ver detalle, Editar, Ver CxC (si aplica) |

**Vista Detalle de Cobro (Modal o /payments/[id]):**
- Paciente, Fecha, Hora, Médico
- Desglose completo: Concepto + Monto
- Total, Método de pago, Estado
- Botones: Imprimir Recibo, Editar, Eliminar

**Vínculo con Cuentas por Cobrar:**
- Si método = "Seguro" o balance > 0 -> badge "Pendiente" con link a CxC
- Click en "Ver CxC" -> redirige a /accounts-receivable?patient=[id]

**Flujo de Usuario - Recepción Registra Cobro:**
```
Recepcionista
        |
        v
Paciente termina consulta
        |
        v
Click en cita en Calendario -> "Completar"
        |
        v
Modal de Cobro (prellenado con datos de la consulta)
        |
        v
Ajusta montos si es necesario
Selecciona método de pago
        |
   +----+----+
   |         |
   v         v
Cash/     Seguro/
Tarjeta   Mixto
Zelle     |
   |      v
   |   Balance > 0
   |      |
   |      v
   |   Crea CxC
   |      |
   +----+----+
        |
        v
Guarda como Pagado
Sistema:
- Actualiza Dashboard
- Actualiza Estadísticas
- Actualiza Calendario (marca completa)
```

---

### 5.6 Página: Gastos (/expenses)

**Objetivo:** Registro, seguimiento y categorización de todos los egresos de la clínica.

**Formulario: Nuevo/Editar Gasto**
- Fecha (Date picker, default: hoy)
- Concepto (Texto, descripción del gasto)
- Categoría (Select jerárquico, ver catálogo abajo)
- Proveedor (Select de catálogo o "+ Nuevo")
- Forma de pago (Select: Cash, Tarjeta, Transferencia, Cheque)
- Monto (Moneda, requerido)
- Observaciones (Textarea, opcional)

**Catálogo de Categorías (Jerárquico):**

**Servicios básicos:** Renta, Internet, Electricidad, Agua, Teléfono
**Personal:** Salarios, Payroll Taxes
**Seguros:** Seguro comercial, Seguro médico (empleados)
**Marketing:** Facebook Ads, Google Ads, Publicidad general
**Oficina:** Material de oficina, Papelería
**Insumos médicos:**
  - Vacunas
  - Medicamentos
  - Laboratorio: Reactivos, Tubos de laboratorio, Vacutainer
  - Jeringas, Guantes, Gasas, Alcohol, Torundas, Mascarillas, Agujas, Tiras de glucosa
**Mantenimiento:** Reparaciones, Limpieza, Basura médica
**Software:** eClinicalWorks, QuickBooks, Microsoft Office
**Financiero/Legal:** Impuestos, Contabilidad, Honorarios legales
**Operativo:** Combustible, Viáticos
**Equipos médicos:** Ultrasonido, EKG, Rayos X, Computadoras, Impresoras
**Otros**

**Flujo de Usuario - Admin Registra Gasto:**
```
Admin en Dashboard
        |
        v
Navega a /expenses
Click "Nuevo Gasto"
        |
        v
Completa formulario:
- Fecha
- Concepto
- Categoría (select jerárquico)
- Proveedor
- Forma pago
- Monto
        |
        v
Guardar Gasto
Sistema:
- Valida datos
- Guarda en Supabase
- Actualiza gráficos y Dashboard
        |
        v
Toast éxito
Tabla se actualiza con nuevo registro
```

---

### 5.7 Página: Inventario (/inventory)

**Objetivo:** Control completo de insumos médicos con alertas de stock bajo y vencimiento.

**Formulario: Nuevo/Editar Producto**
- Producto (Texto, nombre del insumo)
- Categoría (Select jerárquico)
- Cantidad inicial (Número, stock inicial)
- Entradas (Número, suma de compras)
- Salidas (Número, suma de consumos)
- Existencia actual: Calculado (Inicial + Entradas - Salidas)
- Stock mínimo (Número, umbral para alerta)
- Proveedor (Select de catálogo)
- Costo unitario (Moneda)
- Costo total: Calculado (Existencia x Costo unitario)
- Fecha de compra (Date)
- Fecha de vencimiento (Date)
- Ubicación (Texto, área de almacén)
- Observaciones (Textarea)

**Alertas Visuales (Formato Condicional):**

| Condición | Color de Fila | Badge | Acción |
|-----------|---------------|-------|--------|
| Existencia < Stock mínimo | Rojo claro | "STOCK BAJO" | Notificación + badge en menú |
| Existencia = 0 | Rojo intenso | "AGOTADO" | Notificación urgente |
| Vencimiento <= 30 días | Amarillo | "POR VENCER" | Alerta en Dashboard |
| Vencimiento < hoy | Rojo intenso | "VENCIDO" | Bloquear uso, notificación |
| Todo OK | Blanco/Normal | "OK" | — |

**Acciones por Producto:**
- Ver detalle -> Modal con historial de entradas/salidas
- Editar -> Modal de edición
- Registrar entrada -> Añade cantidad a existencias
- Registrar salida -> Resta cantidad (consumo en consulta)
- Eliminar -> Soft delete con confirmación

**Flujo de Usuario - Recepción Verifica Stock:**
```
Recepcionista abre /inventory
        |
        v
Ve alertas en cards superiores
        |
        v
5 items con stock bajo
        |
        v
Click en "Stock Crítico"
-> Filtra tabla automáticamente
        |
        v
Revisa productos con stock bajo
Guantes: 50/100
Alcohol: 0/50
        |
   +----+----+
   |         |
   v         v
Click      Click
"Entrada"  "Pedido a
           proveedor"
   |         |
   v         v
Registra   Genera
compra     orden de
nueva      compra
(aumenta   (para
stock)     imprimir)
```

---

### 5.8 Página: Nómina (/payroll)

**Objetivo:** Gestión de pagos a empleados con cálculos automáticos.

**Formulario: Nuevo/Editar Pago de Nómina**
- Empleado (Select de catálogo de usuarios)
- Cargo (Texto o Select)
- Salario base (Moneda, por hora o mensual)
- Horas trabajadas (Número)
- Horas extras (Número)
- Comisiones (Moneda)
- Bonos (Moneda)
- Deducciones (Moneda)
- Total pagado: Calculado ((Salario x Horas) + (Extra x Tasa extra) + Comisiones + Bonos - Deducciones)
- Forma de pago (Select: Cash, Transferencia, Cheque)
- Fecha de pago (Date)

**Cálculo Automático:**
```
Total = (Salario_base x Horas_trabajadas) + 
        (Salario_base x 1.5 x Horas_extras) + 
        Comisiones + 
        Bonos - 
        Deducciones
```

**Flujo de Usuario - Admin Procesa Nómina:**
```
Admin en /payroll
        |
        v
Click "Nuevo Pago"
        |
        v
Selecciona empleado del catálogo
        |
        v
Sistema prellena:
- Cargo
- Salario base
        |
        v
Admin ingresa:
- Horas trabajadas
- Horas extras
- Comisiones
- Bonos
- Deducciones
        |
        v
Total pagado se calcula automáticamente
        |
        v
Selecciona forma de pago y fecha
        |
        v
Guardar
Sistema:
- Guarda en Supabase
- Actualiza resumen de nómina
- Genera comprobante (opcional)
```

---

### 5.9 Página: Cuentas por Cobrar (/accounts-receivable)

**Objetivo:** Seguimiento de deudas de pacientes con alertas de vencimiento.

**Formulario: Nueva/Editar Cuenta por Cobrar**
- Paciente (Select vinculado, autocomplete)
- Fecha de emisión (Date, default: hoy)
- Concepto (Texto, descripción de la deuda)
- Monto total (Moneda)
- Monto pagado (Moneda, input manual)
- Pendiente: Calculado (Total - Pagado)
- Fecha límite de pago (Date)
- Observaciones (Textarea)

**Estados y Alertas:**

| Estado | Color | Condición |
|--------|-------|-----------|
| Al día | Verde | Pendiente = 0 |
| Próximo a vencer | Amarillo | Fecha límite dentro de 7 días |
| Vencido | Rojo | Fecha límite pasada y pendiente > 0 |

**Flujo de Usuario - Recepción Gestiona CxC:**
```
Recepcionista en /accounts-receivable
        |
        v
Ve lista de CxC con alertas
        |
        v
Filtro: "Vencidos"
        |
        v
Revisa pacientes con deuda vencida
        |
        v
Click en paciente -> Ver detalle
        |
        v
Opciones:
- Registrar pago parcial
- Registrar pago total
- Reprogramar fecha límite
- Agregar observación
- Enviar recordatorio (futuro)
        |
        v
Al registrar pago:
Sistema:
- Actualiza monto pagado
- Recalcula pendiente
- Si pendiente = 0 -> marca como "Pagado"
- Actualiza Dashboard
- Genera recibo de pago
```

---

### 5.10 Página: Reportes (/reports)

**Objetivo:** Generación de informes filtrables y exportables.

**Filtros de Generación:**
- Rango de fechas (desde/hasta)
- Médico / Especialista (multi-select)
- Tipo de paciente (Nuevo / Seguimiento)
- Método de pago
- Categoría de gasto

**Reportes Disponibles:**

| # | Reporte | Contenido | Gráficos |
|---|---------|-----------|----------|
| 1 | Resumen de Ingresos | Totales, por método de pago, por médico | Barras, líneas |
| 2 | Resumen de Gastos | Por categoría, por período | Dona, barras |
| 3 | Utilidad Neta | Ingresos - Gastos con tendencia | Línea comparativa |
| 4 | Pacientes Atendidos | Detalle y totales | Barras por día/semana |
| 5 | Procedimientos Realizados | Ranking y frecuencias | Barras horizontales |
| 6 | Nómina | Pagos por empleado, totales | Tabla resumen |
| 7 | Inventario | Stock actual, rotación | Tabla + alertas |
| 8 | Cuentas por Cobrar | Deudas por paciente, vencimientos | Tabla + timeline |

**Exportación:**
- Formato PDF: Diseño profesional con logo de la clínica, encabezado, tabla de datos, gráficos
- Formato Excel/CSV: Datos crudos para análisis externo

**Flujo de Usuario - Admin Genera Reporte:**
```
Admin en /reports
        |
        v
Selecciona tipo de reporte
        |
        v
Aplica filtros:
- Fecha: 01/07/2026 a 31/07/2026
- Médico: Todos
- Tipo paciente: Todos
        |
        v
Click "Generar Reporte"
        |
        v
Sistema:
- Consulta Supabase
- Procesa datos
- Genera visualizaciones
        |
        v
Vista previa del reporte
con gráficos y tablas
        |
   +----+----+
   |         |
   v         v
Exportar   Exportar
PDF        Excel/CSV
   |         |
   v         v
Descarga   Descarga
archivo    archivo
```

---

### 5.11 Página: Configuración (/settings)

**Objetivo:** Gestión de usuarios, catálogos y datos de la clínica.

**Tabs de Configuración:**

| Tab | Contenido | Acciones |
|-----|-----------|----------|
| Usuarios | Lista de usuarios, roles, estado | Crear, editar, desactivar, reset password |
| Médicos/Especialistas | Catálogo con horarios | Agregar, editar, eliminar |
| Categorías de Gasto | Jerarquía de categorías | CRUD completo |
| Procedimientos | Tipos de procedimientos médicos | CRUD completo |
| Métodos de Pago | Lista de métodos | CRUD completo |
| Aseguradoras | Catálogo de seguros | CRUD completo |
| Datos de la Clínica | Nombre, logo, dirección, horarios | Editar, subir logo |

**Formulario: Nuevo Usuario**
- Nombre completo
- Email
- Rol (Select: Admin, Médico, Recepción, Especialista)
- Teléfono
- Especialidad (si rol = Médico o Especialista)
- Horario de atención (si aplica)
- Estado: Activo / Inactivo
- Contraseña temporal (generada automáticamente, enviada por email)

**Flujo de Usuario - Admin Configura Sistema:**
```
Admin en /settings
        |
        v
Navega a tab "Usuarios"
        |
        v
Click "Nuevo Usuario"
        |
        v
Completa formulario:
- Nombre, Email, Rol
- Especialidad (si aplica)
- Horario
        |
        v
Sistema:
- Crea usuario en Supabase Auth
- Asigna rol en tabla users
- Envía email con credenciales temporales
        |
        v
Toast: "Usuario creado. Email enviado."
```

---

## 6. Flujos de Usuario Clave (End-to-End)

### Flujo 1: Recepción - Nueva Consulta Completa

```
PASO 1: Agenda Cita
Recepcionista -> Dashboard -> Click "Nueva Cita"
  -> Modal cita -> Busca paciente
    -> Si no existe: Redirige a /patients/new
    -> Si existe: Selecciona paciente
  -> Completa fecha, hora, médico, motivo
  -> Guarda cita
  -> Sistema: Crea appointment, notifica Dashboard

PASO 2: Paciente Llega
Recepcionista -> Calendario -> Click en cita
  -> Cambia estado a "Confirmada"
  -> Cuando entra a consulta: "En curso"

PASO 3: Finaliza Consulta
Médico o Recepción -> Calendario -> Click cita -> "Completar"
  -> Modal de Cobro (prellenado)
  -> Ajusta montos si necesario
  -> Selecciona método de pago
  -> Si Seguro o Mixto con balance:
     -> Sistema crea entrada en Cuentas por Cobrar
  -> Guarda cobro
  -> Sistema:
     - Actualiza payment
     - Marca appointment como completada
     - Actualiza estadísticas
     - Actualiza Dashboard
     - Si CxC: Actualiza /accounts-receivable

PASO 4: Paciente se Retira
Recepcionista -> Verifica recibo impreso (futuro)
  -> Dashboard muestra +1 paciente atendido
  -> Inventario: Si se usaron insumos, registra salida
```

### Flujo 2: Médico - Consulta del Día

```
PASO 1: Inicio de Jornada
Médico -> Login -> Dashboard
  -> Ve "Pacientes Pendientes" filtrados por él
  -> Ve próximas citas del día

PASO 2: Atiende Paciente
Médico -> Click en paciente pendiente
  -> Abre ficha del paciente (/patients/[id])
  -> Revisa historial de consultas previas (tab Historial)
  -> Revisa notas previas (tab Notas)

PASO 3: Durante Consulta
Médico -> Registra en notas:
  - Diagnóstico
  - Tratamiento
  - Procedimientos realizados
  -> Sistema actualiza contador de procedimientos

PASO 4: Finaliza Consulta
Médico -> Marca cita como "Completada"
  -> Opcional: Añade notas finales
  -> Sistema notifica a Recepción para cobro
  -> Dashboard actualiza: +1 paciente atendido
```

### Flujo 3: Administrador - Cierre Diario

```
PASO 1: Revisión de Ingresos
Admin -> Dashboard
  -> Revisa KPIs: Pacientes hoy, Dinero recibido, Gastos, Ganancia
  -> Compara con día anterior (flechas arriba/abajo)

PASO 2: Verificación de Cobros
Admin -> /payments
  -> Filtra por fecha = hoy
  -> Revisa totales por método de pago
  -> Verifica que coincida con efectivo físico
  -> Si hay discrepancia: Revisa pagos individuales

PASO 3: Revisión de Gastos
Admin -> /expenses
  -> Filtra por fecha = hoy
  -> Verifica que todos los gastos estén registrados

PASO 4: Alertas
Admin -> Revisa badges en menú:
  -> Inventario: ¿Hay stock bajo? -> Genera orden de compra
  -> Cuentas por Cobrar: ¿Hay vencidos? -> Contacta pacientes

PASO 5: Genera Reporte
Admin -> /reports
  -> Selecciona "Resumen Diario"
  -> Fecha: hoy
  -> Genera PDF
  -> Guarda para archivo/contabilidad

PASO 6: Cierre
Admin -> Dashboard -> Utilidad neta del día confirmada
  -> Listo para siguiente día
```

### Flujo 4: Inventario - Reabastecimiento

```
PASO 1: Alerta de Stock
Sistema -> Detecta existencia < stock mínimo
  -> Badge en menú Inventario
  -> Notificación en Dashboard (opcional futuro)

PASO 2: Recepción Verifica
Recepcionista -> /inventory
  -> Click en badge "Stock Crítico"
  -> Tabla filtra productos con stock bajo

PASO 3: Decisión
Recepcionista -> Evalúa cada producto:
  -> Si hay proveedor habitual: Click "Pedido a proveedor"
     -> Genera orden de compra imprimible
     -> Envía email al proveedor (futuro)
  -> Si ya llegó mercancía: Click "Registrar entrada"
     -> Completa cantidad recibida, fecha, costo
     -> Sistema actualiza existencias automáticamente

PASO 4: Verificación
Recepcionista -> Revisa que alertas desaparezcan
  -> Si existencia >= stock mínimo: badge desaparece
```

---

## 7. Requisitos Funcionales Transversales

### Cálculos Automáticos
- Todos los campos calculados (totales, existencias, balances, edad, utilidad) deben actualizarse instantáneamente en la UI sin recarga de página.
- Validación en tiempo real en formularios (feedback visual inmediato).

### Validación de Datos
- Campos con lista cerrada: Método de pago, categoría de gasto, tipo de paciente, sexo, rol de usuario -> obligatoriamente Select/Dropdown, nunca texto libre.
- Formatos: Teléfono con máscara, moneda con 2 decimales, fechas con date picker.

### Alertas Visuales (Sistema de Notificaciones)
- Pagos pendientes de pacientes (badge en menú Cobros)
- Stock bajo de insumos (badge en menú Inventario)
- Productos por vencer o vencidos
- Citas próximas (notificación en Dashboard)

### Responsive Design
- Desktop: Sidebar expandido, tablas completas, gráficos amplios
- Tablet (recepción): Sidebar colapsable, touch-friendly, formularios optimizados
- Móvil: Vista simplificada, cards en lugar de tablas densas, acciones flotantes

### Búsqueda y Filtros
- Buscador global disponible en todas las tablas con más de 10 registros
- Filtros persistentes (guardados en URL o localStorage)
- Exportación de vistas filtradas a CSV

---

## 8. Definiciones y Supuestos

### Alcance Inicial (MVP)
- Sistema funcional para una única sede de clínica
- Soporte para español (UI y reportes)
- Moneda: USD (configurable futuro)
- Zona horaria: America/New_York (configurable)

### Fuera de Alcance (Futuras Versiones)
- Integración con sistemas de seguros electrónicos
- Portal de pacientes (online)
- Facturación electrónica fiscal
- App móvil nativa (usar PWA si es posible)

### Preguntas para Confirmar Antes de Desarrollar
1. La app será usada por varias personas simultáneamente desde distintos dispositivos? -> Si, requiere Supabase con Realtime.
2. Se requiere impresión de recibos o facturas físicas? (Afecta diseño de reportes)
3. Hay límite de usuarios simultáneos?
4. Se necesita respaldo automático de datos?

---

## 9. Criterios de Aceptación

- [ ] Todos los campos calculados se actualizan sin recargar la página
- [ ] Los gráficos reflejan datos en tiempo real al cambiar filtros
- [ ] El calendario sincroniza citas con el Dashboard en < 2 segundos
- [ ] Las alertas de stock bajo se muestran visualmente en la tabla de inventario
- [ ] Los reportes se exportan correctamente en PDF y CSV
- [ ] El diseño es usable en tablet de 10" (resolución 768px+)
- [ ] La autenticación funciona con Supabase Auth (sin Clerk)
- [ ] Los roles restringen el acceso a módulos según la matriz de permisos
- [ ] El flujo de nueva consulta (cita -> paciente -> cobro -> CxC) funciona end-to-end
- [ ] Los 4 flujos de usuario principales están completamente implementados

---

## 10. Entregables Esperados

1. Código fuente en repositorio Git con estructura de Next.js 14
2. Script de migración de base de datos para Supabase
3. Documentación de API (endpoints de Supabase)
4. Manual de usuario básico para recepción y médicos
5. Guía de despliegue (Vercel + Supabase)

---

## Resumen de Mejoras Respecto a la Versión Original

| Aspecto | Versión Original | Versión Mejorada |
|---------|---------------|------------------|
| Estructura | Lista lineal | Jerarquía clara con numeración lógica |
| Contexto técnico | Mencionado brevemente | Stack detallado con restricciones explícitas |
| Base de datos | Lista de tablas | Esquema con relaciones y consideraciones RLS |
| Roles y permisos | Mencionado en configuración | Matriz de permisos por módulo definida |
| Flujos de usuario | No presentes | 4 flujos end-to-end documentados con pasos |
| Arquitectura de páginas | No presente | Cada página con layout, componentes y flujos |
| Criterios de aceptación | No presentes | Checklist verificable de 10 puntos |
| Catálogos | Listados en texto | Tablas estructuradas con categorías jerárquicas |
| Responsive | Mencionado | Especificaciones por breakpoint |
| Alcance | Implícito | Definido claramente (MVP vs. futuro) |
| Entregables | No definidos | Lista de 5 entregables concretos |
