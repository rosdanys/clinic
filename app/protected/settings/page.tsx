"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser, UserRole } from "@/components/providers/app-providers";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import {
  Users,
  Building,
  Shield,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Save,
  Package,
  Search,
  X,
  History,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: string;
  product: string;
  category: string;
  initial_quantity: number;
  entries: number;
  exits: number;
  current_stock: number;
  min_stock: number;
  provider: string | null;
  unit_cost: number;
  total_cost: number;
  purchase_date: string | null;
  expiration_date: string | null;
  location: string | null;
  observations: string | null;
};

const INVENTORY_CATEGORIES = [
  "Medicamentos",
  "Vacunas",
  "Descartables",
  "Material Quirúrgico",
  "Equipamiento",
  "Limpieza",
  "Suplementos",
  "Otro",
];

const EMPTY_FORM = {
  product: "",
  category: "Medicamentos",
  initial_quantity: "0",
  min_stock: "5",
  provider: "",
  unit_cost: "0",
  purchase_date: "",
  expiration_date: "",
  location: "",
  observations: "",
};

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<"usuarios" | "catalogos" | "clinica" | "inventario" | "historial">("usuarios");

  // ── Historial state ────────────────────────────────────────────────────────
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("Todos");
  const [auditModuleFilter, setAuditModuleFilter] = useState("Todos");
  const [auditPage, setAuditPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // ── Usuarios state ──────────────────────────────────────────────────────────
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("Recepción");
  const [userPhone, setUserPhone] = useState("");
  const [userSpecialty, setUserSpecialty] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("Recepción");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [deleteUserTarget, setDeleteUserTarget] = useState<any | null>(null);

  // ── Inventario state ────────────────────────────────────────────────────────
  const [invSearch, setInvSearch] = useState("");
  const [showInvModal, setShowInvModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [invForm, setInvForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // ── Catálogos state ─────────────────────────────────────────────────────────
  const [showInsModal, setShowInsModal] = useState(false);
  const [editingIns, setEditingIns] = useState<any | null>(null);
  const [insName, setInsName] = useState("");
  const [deleteInsTarget, setDeleteInsTarget] = useState<any | null>(null);
  const [showProcModal, setShowProcModal] = useState(false);
  const [editingProc, setEditingProc] = useState<any | null>(null);
  const [procName, setProcName] = useState("");
  const [procCost, setProcCost] = useState("");
  const [deleteProcTarget, setDeleteProcTarget] = useState<any | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: usersList, isLoading: usersLoading } = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  const { data: insurances } = useQuery({
    queryKey: ["settings-insurances"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_providers").select("*");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  const { data: procedures } = useQuery({
    queryKey: ["settings-procedures"],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("*");
      return data || [];
    },
    enabled: profile?.role === "Admin",
  });

  const { data: inventoryList, isLoading: invLoading } = useQuery({
    queryKey: ["settings-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("product", { ascending: true });
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: activeTab === "inventario" && profile?.role === "Admin",
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["settings-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === "historial" && profile?.role === "Admin",
  });

  // ── Mutation: Crear usuario ─────────────────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          role: userRole,
          phone: userPhone,
          specialty: userSpecialty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "CREATE",
        module: "Usuarios",
        tableName: "profiles",
        recordId: data.userId,
        description: `Registró nuevo usuario: ${userName} (${userRole})`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      setShowUserModal(false);
      toast.success(`Invitación enviada a ${data.email}`);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      setUserSpecialty("");
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar usuario: ${error.message}`);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName,
          role: editRole,
          phone: editPhone || null,
          specialty: editSpecialty || null,
          is_active: editActive,
        })
        .eq("id", editingUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "UPDATE",
        module: "Usuarios",
        tableName: "profiles",
        recordId: editingUser?.id,
        description: `Editó usuario: ${editName} (${editRole})`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      setEditingUser(null);
      toast.success("Usuario actualizado con éxito.");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar usuario: ${error.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    },
    onSuccess: () => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "DELETE",
        module: "Usuarios",
        tableName: "profiles",
        recordId: deleteUserTarget?.id,
        description: `Eliminó usuario: ${deleteUserTarget?.name || deleteUserTarget?.id}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      setDeleteUserTarget(null);
      toast.success("Usuario eliminado con éxito.");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar usuario: ${error.message}`);
    },
  });

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPhone(u.phone || "");
    setEditSpecialty(u.specialty || "");
    setEditActive(u.is_active);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return;
    updateUserMutation.mutate();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    createUserMutation.mutate();
  };

  // ── Mutations: Inventario ───────────────────────────────────────────────────
  const upsertInvMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        product: invForm.product.trim(),
        category: invForm.category,
        initial_quantity: Number(invForm.initial_quantity),
        min_stock: Number(invForm.min_stock),
        provider: invForm.provider.trim() || null,
        unit_cost: Number(invForm.unit_cost),
        purchase_date: invForm.purchase_date || null,
        expiration_date: invForm.expiration_date || null,
        location: invForm.location.trim() || null,
        observations: invForm.observations.trim() || null,
      };
      if (isEdit && editingItem) {
        const { error } = await supabase.from("inventory").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").insert({ ...payload, created_by: profile?.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, isEdit) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: isEdit ? "UPDATE" : "CREATE",
        module: "Inventario",
        tableName: "inventory",
        recordId: editingItem?.id,
        description: isEdit
          ? `Editó insumo: ${invForm.product}`
          : `Creó nuevo insumo en inventario: ${invForm.product}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      closeInvModal();
      toast.success(isEdit ? "Producto actualizado en el inventario." : "Nuevo producto registrado en el inventario.");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar el producto: ${error.message}`);
    },
  });

  const deleteInvMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "DELETE",
        module: "Inventario",
        tableName: "inventory",
        recordId: deletedId,
        description: `Eliminó insumo del inventario: ${deleteTarget?.product || deletedId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setDeleteTarget(null);
      toast.success("Producto eliminado del inventario.");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar el producto: ${error.message}`);
    },
  });

  // ── Mutations: Catálogos (Aseguradoras y Procedimientos) ─────────────────────
  const upsertInsMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = { name: insName.trim() };
      if (isEdit && editingIns) {
        const { error } = await supabase.from("insurance_providers").update(payload).eq("id", editingIns.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_providers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, isEdit) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: isEdit ? "UPDATE" : "CREATE",
        module: "Catálogos",
        tableName: "insurance_providers",
        recordId: editingIns?.id,
        description: isEdit ? `Editó aseguradora: ${insName}` : `Agregó aseguradora: ${insName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-insurances"] });
      setShowInsModal(false);
      setEditingIns(null);
      setInsName("");
      toast.success(isEdit ? "Aseguradora actualizada." : "Aseguradora agregada al catálogo.");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar aseguradora: ${error.message}`);
    },
  });

  const deleteInsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "DELETE",
        module: "Catálogos",
        tableName: "insurance_providers",
        recordId: deletedId,
        description: `Eliminó aseguradora: ${deleteInsTarget?.name || deletedId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-insurances"] });
      setDeleteInsTarget(null);
      toast.success("Aseguradora eliminada del catálogo.");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar aseguradora: ${error.message}`);
    },
  });

  const upsertProcMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        name: procName.trim(),
        cost: Number(procCost),
      };
      if (isEdit && editingProc) {
        const { error } = await supabase.from("procedures").update(payload).eq("id", editingProc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procedures").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, isEdit) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: isEdit ? "UPDATE" : "CREATE",
        module: "Catálogos",
        tableName: "procedures",
        recordId: editingProc?.id,
        description: isEdit
          ? `Editó procedimiento: ${procName} ($${Number(procCost).toFixed(2)})`
          : `Agregó procedimiento: ${procName} ($${Number(procCost).toFixed(2)})`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-procedures"] });
      setShowProcModal(false);
      setEditingProc(null);
      setProcName("");
      setProcCost("");
      toast.success(isEdit ? "Procedimiento actualizado." : "Procedimiento agregado al catálogo.");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar procedimiento: ${error.message}`);
    },
  });

  const deleteProcMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("procedures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "DELETE",
        module: "Catálogos",
        tableName: "procedures",
        recordId: deletedId,
        description: `Eliminó procedimiento: ${deleteProcTarget?.name || deletedId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-procedures"] });
      setDeleteProcTarget(null);
      toast.success("Procedimiento eliminado del catálogo.");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar procedimiento: ${error.message}`);
    },
  });

  const openCreateIns = () => {
    setEditingIns(null);
    setInsName("");
    setShowInsModal(true);
  };

  const openEditIns = (ins: any) => {
    setEditingIns(ins);
    setInsName(ins.name);
    setShowInsModal(true);
  };

  const openCreateProc = () => {
    setEditingProc(null);
    setProcName("");
    setProcCost("");
    setShowProcModal(true);
  };

  const openEditProc = (proc: any) => {
    setEditingProc(proc);
    setProcName(proc.name);
    setProcCost(String(proc.cost));
    setShowProcModal(true);
  };

  const closeInvModal = () => {
    setShowInvModal(false);
    setEditingItem(null);
    setInvForm(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setInvForm(EMPTY_FORM);
    setShowInvModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setInvForm({
      product: item.product,
      category: item.category,
      initial_quantity: String(item.initial_quantity),
      min_stock: String(item.min_stock),
      provider: item.provider || "",
      unit_cost: String(item.unit_cost),
      purchase_date: item.purchase_date || "",
      expiration_date: item.expiration_date || "",
      location: item.location || "",
      observations: item.observations || "",
    });
    setShowInvModal(true);
  };

  const handleInvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.product) return;
    upsertInvMutation.mutate(!!editingItem);
  };

  const filteredInventory =
    inventoryList?.filter(
      (item) =>
        item.product.toLowerCase().includes(invSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(invSearch.toLowerCase()) ||
        (item.provider || "").toLowerCase().includes(invSearch.toLowerCase())
    ) || [];

  // Filtered Audit Logs
  const filteredAuditLogs =
    auditLogs?.filter((log: any) => {
      const matchSearch =
        log.description?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.module?.toLowerCase().includes(auditSearch.toLowerCase());
      const matchAction = auditActionFilter === "Todos" || log.action === auditActionFilter;
      const matchModule = auditModuleFilter === "Todos" || log.module === auditModuleFilter;
      return matchSearch && matchAction && matchModule;
    }) || [];

  const totalPages = Math.ceil(filteredAuditLogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (auditPage - 1) * ITEMS_PER_PAGE,
    auditPage * ITEMS_PER_PAGE
  );

  const exportAuditCSV = () => {
    if (!filteredAuditLogs.length) return;
    const headers = ["Fecha", "Usuario", "Acción", "Módulo", "Tabla", "Descripción"];
    const rows = filteredAuditLogs.map((l: any) => [
      new Date(l.created_at).toLocaleString("es-ES"),
      `"${l.user_name || ""}"`,
      l.action,
      `"${l.module || ""}"`,
      l.table_name,
      `"${(l.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historial_auditoria_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          Solo los Administradores de la clínica tienen permisos para configurar catálogos, horarios y usuarios del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            Administración de accesos, roles, aseguradoras y datos maestros.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md shadow-sm w-fit">
        {[
          { id: "usuarios", name: "Usuarios y Roles", icon: Users },
          { id: "catalogos", name: "Catálogos Maestros", icon: Shield },
          { id: "clinica", name: "Datos de la Clínica", icon: Building },
          { id: "inventario", name: "Inventario", icon: Package },
          { id: "historial", name: "Historial", icon: History },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-2"
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Tab 1: Usuarios y Roles */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                onClick={() => setShowUserModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Registrar Usuario
              </Button>
            </div>

            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-4 px-6">Nombre</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6">Rol</th>
                        <th className="py-4 px-6">Teléfono</th>
                        <th className="py-4 px-6">Especialidad</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-muted-foreground">
                            Cargando usuarios...
                          </td>
                        </tr>
                      ) : usersList?.map((u: any) => (
                        <tr key={u.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-foreground">{u.name}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.email}</td>
                          <td className="py-4 px-6">
                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.phone || "N/A"}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{u.specialty || "N/A"}</td>
                          <td className="py-4 px-6">
                            <Badge className={`border-0 font-bold ${u.is_active ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                              {u.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary" title="Editar" onClick={() => openEditUser(u)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar" onClick={() => setDeleteUserTarget(u)} disabled={u.id === profile?.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Catálogos Maestros */}
        {activeTab === "catalogos" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Aseguradoras */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
                <div>
                  <CardTitle className="text-base font-bold">Aseguradoras médicas</CardTitle>
                  <CardDescription>Catálogo de seguros autorizados.</CardDescription>
                </div>
                <Button
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold h-9 px-3 text-xs"
                  onClick={openCreateIns}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {insurances?.map((ins: any) => (
                  <div key={ins.id} className="flex justify-between items-center py-3.5 px-6 hover:bg-muted/10 transition-colors">
                    <span className="font-semibold text-foreground">{ins.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" title="Editar" onClick={() => openEditIns(ins)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar" onClick={() => setDeleteInsTarget(ins)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Procedimientos */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
                <div>
                  <CardTitle className="text-base font-bold">Procedimientos y Costos</CardTitle>
                  <CardDescription>Catálogo de servicios y aranceles.</CardDescription>
                </div>
                <Button
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold h-9 px-3 text-xs"
                  onClick={openCreateProc}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="divide-y divide-border/40 p-0">
                {procedures?.map((proc: any) => (
                  <div key={proc.id} className="flex justify-between items-center py-3.5 px-6 hover:bg-muted/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{proc.name}</span>
                      <span className="text-xs text-muted-foreground font-bold text-green-500">${proc.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" title="Editar" onClick={() => openEditProc(proc)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar" onClick={() => setDeleteProcTarget(proc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Datos de la Clínica */}
        {activeTab === "clinica" && (
          <Card className="border-border/60 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Datos Generales de la Clínica</CardTitle>
              <CardDescription>Información institucional y comercial para facturas y recibos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="cli-name">Nombre Comercial</Label>
                <Input id="cli-name" type="text" className="rounded-xl font-semibold" defaultValue="Centro Médico Antigravity" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cli-address">Dirección Física</Label>
                <Input id="cli-address" type="text" className="rounded-xl" defaultValue="Av. del Libertador 4500, Palermo, CABA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cli-phone">Teléfono de Atención</Label>
                  <Input id="cli-phone" type="text" className="rounded-xl" defaultValue="(011) 4899-0000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cli-hours">Horarios de Atención</Label>
                  <Input id="cli-hours" type="text" className="rounded-xl" defaultValue="Lunes a Viernes 08:00 - 18:00 hs" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border/40">
                <Button className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold px-6">
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Tab 4: Inventario ─────────────────────────────────────────────── */}
        {activeTab === "inventario" && (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar producto, categoría..."
                  className="pl-10 rounded-xl"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
              <Button
                className="rounded-xl shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                onClick={openCreateModal}
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
              </Button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Productos", value: inventoryList?.length ?? "—", color: "text-primary" },
                { label: "Stock Bajo", value: inventoryList?.filter((i) => i.current_stock < i.min_stock && i.current_stock > 0).length ?? "—", color: "text-amber-500" },
                { label: "Agotados", value: inventoryList?.filter((i) => i.current_stock === 0).length ?? "—", color: "text-destructive" },
                { label: "Valor Total", value: inventoryList ? `$${inventoryList.reduce((s, i) => s + (i.total_cost || 0), 0).toFixed(2)}` : "—", color: "text-green-500" },
              ].map((stat) => (
                <Card key={stat.label} className="border-border/60 bg-background/50 shadow-sm">
                  <CardContent className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-4 px-5">Producto</th>
                        <th className="py-4 px-5">Categoría</th>
                        <th className="py-4 px-5">Stock</th>
                        <th className="py-4 px-5">Mín.</th>
                        <th className="py-4 px-5">Proveedor</th>
                        <th className="py-4 px-5">Costo Unit.</th>
                        <th className="py-4 px-5">Vencimiento</th>
                        <th className="py-4 px-5">Ubicación</th>
                        <th className="py-4 px-5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invLoading ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">Cargando inventario...</td>
                        </tr>
                      ) : filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            {invSearch ? "Sin resultados para tu búsqueda." : "No hay productos registrados aún."}
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => {
                          const isLow = item.current_stock > 0 && item.current_stock < item.min_stock;
                          const isOut = item.current_stock === 0;
                          return (
                            <tr key={item.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-5 font-semibold text-foreground">{item.product}</td>
                              <td className="py-3.5 px-5">
                                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold text-xs">{item.category}</Badge>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`font-extrabold text-base ${isOut ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"}`}>
                                  {item.current_stock}
                                </span>
                                <span className="text-muted-foreground text-xs ml-1">uds</span>
                              </td>
                              <td className="py-3.5 px-5 text-muted-foreground font-semibold">{item.min_stock}</td>
                              <td className="py-3.5 px-5 text-muted-foreground font-medium">{item.provider || "—"}</td>
                              <td className="py-3.5 px-5 text-green-500 font-bold">${Number(item.unit_cost).toFixed(2)}</td>
                              <td className="py-3.5 px-5 text-muted-foreground text-xs font-semibold">{item.expiration_date || "Sin vencimiento"}</td>
                              <td className="py-3.5 px-5 text-muted-foreground font-medium">{item.location || "—"}</td>
                              <td className="py-3.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary" title="Editar" onClick={() => openEditModal(item)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar" onClick={() => setDeleteTarget(item)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tab 5: Historial ──────────────────────────────────────────────── */}
        {activeTab === "historial" && (
          <div className="space-y-5">
            {/* Toolbar / Filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar evento, usuario o descripción..."
                    className="pl-10 rounded-xl"
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="h-10 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold focus:ring-2 focus:ring-primary"
                    value={auditActionFilter}
                    onChange={(e) => {
                      setAuditActionFilter(e.target.value);
                      setAuditPage(1);
                    }}
                  >
                    <option value="Todos">Todas las Acciones</option>
                    <option value="CREATE">Creación (CREATE)</option>
                    <option value="UPDATE">Edición (UPDATE)</option>
                    <option value="DELETE">Eliminación (DELETE)</option>
                  </select>
                  <select
                    className="h-10 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold focus:ring-2 focus:ring-primary"
                    value={auditModuleFilter}
                    onChange={(e) => {
                      setAuditModuleFilter(e.target.value);
                      setAuditPage(1);
                    }}
                  >
                    <option value="Todos">Todos los Módulos</option>
                    <option value="Inventario">Inventario</option>
                    <option value="Usuarios">Usuarios</option>
                    <option value="Calendario">Calendario</option>
                    <option value="Gastos">Gastos</option>
                    <option value="Nómina">Nómina</option>
                    <option value="Cuentas por Cobrar">Cuentas por Cobrar</option>
                    <option value="Pacientes">Pacientes</option>
                  </select>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-border/80 font-bold self-start md:self-auto"
                onClick={exportAuditCSV}
                disabled={!filteredAuditLogs.length}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            {/* Table */}
            <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-4 px-5">Fecha / Hora</th>
                        <th className="py-4 px-5">Usuario</th>
                        <th className="py-4 px-5">Acción</th>
                        <th className="py-4 px-5">Módulo</th>
                        <th className="py-4 px-5">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLoading ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            Cargando historial de auditoría...
                          </td>
                        </tr>
                      ) : paginatedAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            {auditSearch || auditActionFilter !== "Todos" || auditModuleFilter !== "Todos"
                              ? "Sin registros para los filtros seleccionados."
                              : "Aún no hay eventos registrados en el historial."}
                          </td>
                        </tr>
                      ) : (
                        paginatedAuditLogs.map((log: any) => {
                          let badgeStyle = "bg-primary/10 text-primary border-primary/20";
                          if (log.action === "CREATE") badgeStyle = "bg-green-500/10 text-green-500 border-green-500/20";
                          if (log.action === "DELETE") badgeStyle = "bg-destructive/10 text-destructive border-destructive/20";
                          return (
                            <tr key={log.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <td className="py-3.5 px-5 font-medium text-muted-foreground text-xs whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString("es-ES", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3.5 px-5 font-semibold text-foreground">
                                {log.user_name || "Sistema"}
                              </td>
                              <td className="py-3.5 px-5">
                                <Badge variant="outline" className={`font-extrabold text-xs ${badgeStyle}`}>
                                  {log.action}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-5 font-medium text-foreground text-xs">
                                {log.module}
                              </td>
                              <td className="py-3.5 px-5 font-medium text-foreground/90">
                                {log.description}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {filteredAuditLogs.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-xs font-semibold text-muted-foreground">
                    <span>
                      Mostrando {(auditPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                      {Math.min(auditPage * ITEMS_PER_PAGE, filteredAuditLogs.length)} de{" "}
                      {filteredAuditLogs.length} registros
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3"
                        disabled={auditPage === 1}
                        onClick={() => setAuditPage((p) => p - 1)}
                      >
                        Anterior
                      </Button>
                      <span>
                        Página {auditPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 px-3"
                        disabled={auditPage >= totalPages}
                        onClick={() => setAuditPage((p) => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ══ Modal: Crear / Editar Producto ══════════════════════════════════════ */}
      {showInvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl border-border/80 shadow-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-border/40 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {editingItem ? "Editar Producto" : "Nuevo Producto"}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={closeInvModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {editingItem ? `Editando: ${editingItem.product}` : "Registrar un nuevo insumo o medicamento en el inventario."}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInvSubmit} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="pt-5 space-y-4 overflow-y-auto flex-1 px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-product">Nombre del Producto <span className="text-destructive">*</span></Label>
                    <Input id="inv-product" type="text" placeholder="Ej: Amoxicilina 500mg" className="rounded-xl" required value={invForm.product} onChange={(e) => setInvForm((f) => ({ ...f, product: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-category">Categoría</Label>
                    <select id="inv-category" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold" value={invForm.category} onChange={(e) => setInvForm((f) => ({ ...f, category: e.target.value }))}>
                      {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-initial">Cantidad Inicial</Label>
                    <Input id="inv-initial" type="number" min="0" className="rounded-xl font-bold" value={invForm.initial_quantity} disabled={!!editingItem} onChange={(e) => setInvForm((f) => ({ ...f, initial_quantity: e.target.value }))} />
                    {editingItem && <p className="text-xs text-muted-foreground">Usar entrada/salida</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-minstock">Stock Mínimo</Label>
                    <Input id="inv-minstock" type="number" min="0" className="rounded-xl font-bold" value={invForm.min_stock} onChange={(e) => setInvForm((f) => ({ ...f, min_stock: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-cost">Costo Unitario ($)</Label>
                    <Input id="inv-cost" type="number" min="0" step="0.01" className="rounded-xl font-bold" value={invForm.unit_cost} onChange={(e) => setInvForm((f) => ({ ...f, unit_cost: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-provider">Proveedor</Label>
                    <Input id="inv-provider" type="text" placeholder="Ej: Farmacéutica XYZ" className="rounded-xl" value={invForm.provider} onChange={(e) => setInvForm((f) => ({ ...f, provider: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-location">Ubicación / Almacén</Label>
                    <Input id="inv-location" type="text" placeholder="Ej: Estante A-3" className="rounded-xl" value={invForm.location} onChange={(e) => setInvForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-purchase">Fecha de Compra</Label>
                    <Input id="inv-purchase" type="date" className="rounded-xl" value={invForm.purchase_date} onChange={(e) => setInvForm((f) => ({ ...f, purchase_date: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-expiration">Fecha de Vencimiento</Label>
                    <Input id="inv-expiration" type="date" className="rounded-xl" value={invForm.expiration_date} onChange={(e) => setInvForm((f) => ({ ...f, expiration_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-obs">Observaciones</Label>
                  <textarea id="inv-obs" rows={2} placeholder="Notas adicionales sobre este producto..." className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none" value={invForm.observations} onChange={(e) => setInvForm((f) => ({ ...f, observations: e.target.value }))} />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40 flex-shrink-0">
                <Button type="button" variant="outline" className="rounded-xl border-border/80" onClick={closeInvModal}>Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold px-6" disabled={upsertInvMutation.isPending}>
                  {upsertInvMutation.isPending ? "Guardando..." : editingItem ? "Guardar Cambios" : "Registrar Producto"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ══ Modal: Aseguradora (Crear / Editar) ═══════════════════════════════════ */}
      {showInsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {editingIns ? "Editar Aseguradora" : "Agregar Aseguradora"}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowInsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Catálogo de seguros autorizados por la clínica.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (!insName.trim()) return; upsertInsMutation.mutate(!!editingIns); }}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="ins-name">Nombre de la Aseguradora <span className="text-destructive">*</span></Label>
                  <Input id="ins-name" type="text" placeholder="Ej: OSDE, Swiss Medical, IOMA" className="rounded-xl" required value={insName} onChange={(e) => setInsName(e.target.value)} />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button type="button" variant="outline" className="rounded-xl border-border/80" onClick={() => setShowInsModal(false)}>Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold" disabled={upsertInsMutation.isPending}>
                  {upsertInsMutation.isPending ? "Guardando..." : editingIns ? "Guardar Cambios" : "Agregar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ══ Modal: Procedimiento (Crear / Editar) ═════════════════════════════════ */}
      {showProcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {editingProc ? "Editar Procedimiento" : "Agregar Procedimiento"}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowProcModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Catálogo de servicios y aranceles de la clínica.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (!procName.trim()) return; upsertProcMutation.mutate(!!editingProc); }}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="proc-name">Nombre del Servicio <span className="text-destructive">*</span></Label>
                  <Input id="proc-name" type="text" placeholder="Ej: Consulta, Laboratorio, Ecografía" className="rounded-xl" required value={procName} onChange={(e) => setProcName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="proc-cost">Costo / Arancel ($) <span className="text-destructive">*</span></Label>
                  <Input id="proc-cost" type="number" min="0" step="0.01" placeholder="0.00" className="rounded-xl font-bold" required value={procCost} onChange={(e) => setProcCost(e.target.value)} />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button type="button" variant="outline" className="rounded-xl border-border/80" onClick={() => setShowProcModal(false)}>Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold" disabled={upsertProcMutation.isPending}>
                  {upsertProcMutation.isPending ? "Guardando..." : editingProc ? "Guardar Cambios" : "Agregar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ══ Modal: Confirmar Eliminación de Aseguradora ═══════════════════════════ */}
      {deleteInsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border-destructive/40 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Aseguradora
              </CardTitle>
              <CardDescription>Esta acción no se puede deshacer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">¿Estás seguro de que querés eliminar <span className="font-bold">{deleteInsTarget.name}</span> del catálogo?</p>
            </CardContent>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border/40">
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteInsTarget(null)} disabled={deleteInsMutation.isPending}>Cancelar</Button>
              <Button className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold" disabled={deleteInsMutation.isPending} onClick={() => deleteInsMutation.mutate(deleteInsTarget.id)}>
                {deleteInsMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══ Modal: Confirmar Eliminación de Procedimiento ═════════════════════════ */}
      {deleteProcTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border-destructive/40 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Procedimiento
              </CardTitle>
              <CardDescription>Esta acción no se puede deshacer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">¿Estás seguro de que querés eliminar <span className="font-bold">{deleteProcTarget.name}</span> del catálogo?</p>
            </CardContent>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border/40">
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteProcTarget(null)} disabled={deleteProcMutation.isPending}>Cancelar</Button>
              <Button className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold" disabled={deleteProcMutation.isPending} onClick={() => deleteProcMutation.mutate(deleteProcTarget.id)}>
                {deleteProcMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══ Modal: Confirmar Eliminación ════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border-destructive/40 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Producto
              </CardTitle>
              <CardDescription>Esta acción no se puede deshacer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">¿Estás seguro de que querés eliminar <span className="font-bold">{deleteTarget.product}</span> del inventario?</p>
            </CardContent>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border/40">
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleteInvMutation.isPending}>Cancelar</Button>
              <Button className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold" disabled={deleteInvMutation.isPending} onClick={() => deleteInvMutation.mutate(deleteTarget.id)}>
                {deleteInvMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══ Modal: Editar Usuario ════════════════════════════════════════════════ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Editar Usuario
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditingUser(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Editando: {editingUser.name} ({editingUser.email})</CardDescription>
            </CardHeader>
            <form onSubmit={handleEditUser}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nombre Completo</Label>
                  <Input id="edit-name" type="text" className="rounded-xl" required value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Rol / Acceso</Label>
                  <select id="edit-role" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold" value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}>
                    <option value="Recepción">Recepción</option>
                    <option value="Médico">Médico / Especialista</option>
                    <option value="Especialista">Especialista Externo</option>
                    <option value="Admin">Administrador (Acceso Total)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input id="edit-phone" type="tel" placeholder="11-2233-4455" className="rounded-xl" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                {(editRole === "Médico" || editRole === "Especialista") && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-spec">Especialidad</Label>
                    <Input id="edit-spec" type="text" placeholder="Cardiología, Pediatría..." className="rounded-xl" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Label htmlFor="edit-active">Usuario Activo</Label>
                  <input id="edit-active" type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button type="button" variant="outline" className="rounded-xl border-border/80" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ══ Modal: Confirmar Eliminación de Usuario ═══════════════════════════════ */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border-destructive/40 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Usuario
              </CardTitle>
              <CardDescription>Esta acción no se puede deshacer. El usuario perderá todo acceso al sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">¿Estás seguro de que querés eliminar a <span className="font-bold">{deleteUserTarget.name}</span> ({deleteUserTarget.email})?</p>
            </CardContent>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border/40">
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteUserTarget(null)} disabled={deleteUserMutation.isPending}>Cancelar</Button>
              <Button className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold" disabled={deleteUserMutation.isPending} onClick={() => deleteUserMutation.mutate(deleteUserTarget.id)}>
                {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══ Modal: Registrar Usuario ═════════════════════════════════════════════ */}
      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Registrar Perfil de Usuario
              </CardTitle>
              <CardDescription>Agregar un nuevo personal al sistema.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateUser}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="user-name">Nombre Completo</Label>
                  <Input
                    id="user-name"
                    type="text"
                    placeholder="Ej: Lic. Mariana López"
                    className="rounded-xl"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="mariana.lopez@clinica.com"
                    className="rounded-xl"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Rol / Acceso</Label>
                  <select
                    id="user-role"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-semibold"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                  >
                    <option value="Recepción">Recepción</option>
                    <option value="Médico">Médico / Especialista</option>
                    <option value="Especialista">Especialista Externo</option>
                    <option value="Admin">Administrador (Acceso Total)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-phone">Teléfono</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    placeholder="11-2233-4455"
                    className="rounded-xl"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>
                {(userRole === "Médico" || userRole === "Especialista") && (
                  <div className="grid gap-2 animate-fadeIn">
                    <Label htmlFor="user-spec">Especialidad</Label>
                    <Input
                      id="user-spec"
                      type="text"
                      placeholder="Cardiología, Pediatría..."
                      className="rounded-xl"
                      value={userSpecialty}
                      onChange={(e) => setUserSpecialty(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border/80"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 text-white font-bold"
                  disabled={createUserMutation.isPending}
                >
                  Registrar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
