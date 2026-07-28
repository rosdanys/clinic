"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserRole } from "@/components/providers/app-providers";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  TrendingDown,
  Package,
  Coins,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
  badgeKey?: "dashboard" | "calendar" | "cobros" | "inventario" | "cxc";
}

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/protected/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "Médico", "Recepción", "Especialista"],
  },
  {
    name: "Pacientes",
    href: "/protected/patients",
    icon: Users,
    roles: ["Admin", "Médico", "Recepción", "Especialista"],
  },
  {
    name: "Calendario",
    href: "/protected/calendar",
    icon: Calendar,
    roles: ["Admin", "Médico", "Recepción", "Especialista"],
    badgeKey: "calendar",
  },
  {
    name: "Cobros",
    href: "/protected/payments",
    icon: CreditCard,
    roles: ["Admin", "Recepción"],
    badgeKey: "cobros",
  },
  {
    name: "Gastos",
    href: "/protected/expenses",
    icon: TrendingDown,
    roles: ["Admin"],
  },
  {
    name: "Inventario",
    href: "/protected/inventory",
    icon: Package,
    roles: ["Admin", "Recepción"],
    badgeKey: "inventario",
  },
  {
    name: "Nómina",
    href: "/protected/payroll",
    icon: Coins,
    roles: ["Admin"],
  },
  {
    name: "Cuentas por Cobrar",
    href: "/protected/accounts-receivable",
    icon: FileText,
    roles: ["Admin", "Recepción"],
    badgeKey: "cxc",
  },
  {
    name: "Reportes",
    href: "/protected/reports",
    icon: BarChart3,
    roles: ["Admin", "Médico", "Especialista"],
  },
  {
    name: "Configuración",
    href: "/protected/settings",
    icon: Settings,
    roles: ["Admin"],
  },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, isLoading: userLoading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Soportar colapso en tablets por defecto
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Consultas de badges en tiempo real usando React Query y Supabase
  const { data: badges } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // 1. Citas pendientes hoy
      const { count: pendingCitas } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pendiente")
        .eq("date", today);

      // 2. Cobros pendientes
      const { count: pendingCobros } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pendiente");

      // 3. Stock bajo
      const { data: inventoryItems } = await supabase
        .from("inventory")
        .select("initial_quantity, entries, exits, min_stock");
      
      const lowStockCount = inventoryItems
        ? inventoryItems.filter(
            (item: any) =>
              (item.initial_quantity + item.entries - item.exits) < item.min_stock
          ).length
        : 0;

      // 4. CxC vencidos
      const { count: overdueCxC } = await supabase
        .from("accounts_receivable")
        .select("*", { count: "exact", head: true })
        .gt("pending_amount", 0)
        .lt("limit_date", today);

      return {
        calendar: pendingCitas || 0,
        cobros: pendingCobros || 0,
        inventario: lowStockCount || 0,
        cxc: overdueCxC || 0,
        dashboard: 0,
      };
    },
    refetchInterval: 10000, // Actualizar cada 10s
    enabled: !!profile,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground gap-4">
        <Activity className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-wide">Cargando clínica médica...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Filtrar menú por rol
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(profile.role)
  );

  const getBadgeValue = (key?: MenuItem["badgeKey"]) => {
    if (!key || !badges) return 0;
    return badges[key] || 0;
  };

  const getBadgeColor = (key?: MenuItem["badgeKey"]) => {
    if (key === "inventario") return "bg-amber-500 hover:bg-amber-600 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex flex-col bg-background/80 border-r border-border/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static ${
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none tracking-tight">Centro Médico</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 tracking-wider">Clinic Control</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const badgeVal = getBadgeValue(item.badgeKey);

            return (
              <Link key={item.href} href={item.href} passHref>
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </div>
                  {sidebarOpen && badgeVal > 0 && (
                    <Badge className={`h-5 min-w-5 shrink-0 rounded-full px-1.5 text-[10px] font-bold flex items-center justify-center border-0 ${getBadgeColor(item.badgeKey)}`}>
                      {badgeVal}
                    </Badge>
                  )}
                  {!sidebarOpen && badgeVal > 0 && (
                    <span className="absolute left-14 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/10 space-y-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-semibold uppercase shadow-inner">
                {profile.name.substring(0, 2)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">{profile.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full w-fit">
                  {profile.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-semibold uppercase shadow-inner">
                {profile.name.substring(0, 2)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size={sidebarOpen ? "default" : "icon"}
              className={`w-full justify-start rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/50 hover:border-destructive/20 transition-colors ${
                !sidebarOpen && "justify-center"
              }`}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="ml-2">Cerrar Sesión</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/50 backdrop-blur-md px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:flex"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>Clínica Médica</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold capitalize">
                {pathname.split("/").pop() || "Dashboard"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="h-6 w-px bg-border/60" />
            <div className="flex items-center gap-2 text-xs font-semibold bg-accent/60 px-3 py-1.5 rounded-xl border border-border/50 text-accent-foreground">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Rol: {profile.role}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Activity className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
