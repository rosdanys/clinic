"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CheckCircle,
  Truck,
  Edit2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/app-providers";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export default function InventoryPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { profile } = useUser();
  
  const [search, setSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState("Todos");

  // Estado para el modal de entrada/salida
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"entrada" | "salida">("entrada");
  const [actionQuantity, setActionQuantity] = useState("10");

  // Cargar inventario
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("product", { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];

      const mapped = data?.map((item: any) => {
        let alertStatus = "OK";
        const stock = item.current_stock;
        
        if (stock === 0) {
          alertStatus = "AGOTADO";
        } else if (stock < item.min_stock) {
          alertStatus = "STOCK BAJO";
        }

        if (item.expiration_date) {
          const expDate = new Date(item.expiration_date);
          const diffDays = Math.ceil(
            (expDate.getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays < 0) {
            alertStatus = "VENCIDO";
          } else if (diffDays <= 30 && alertStatus === "OK") {
            alertStatus = "POR VENCER";
          }
        }
        return { ...item, alertStatus };
      });

      return mapped || [];
    }
  });

  // Mutación para registrar entradas/salidas
  const stockMutation = useMutation({
    mutationFn: async () => {
      const qty = Number(actionQuantity);
      const isEntrada = actionType === "entrada";
      
      const payload: any = {};
      if (isEntrada) {
        payload.entries = Number(selectedProduct.entries || 0) + qty;
      } else {
        payload.exits = Number(selectedProduct.exits || 0) + qty;
      }

      const { error } = await supabase
        .from("inventory")
        .update(payload)
        .eq("id", selectedProduct.id);

      if (error) throw error;
    },
    onSuccess: () => {
      logAudit({
        supabase,
        userId: profile?.id,
        userName: profile?.name,
        action: "UPDATE",
        module: "Inventario",
        tableName: "inventory",
        recordId: selectedProduct?.id,
        description: `Registró ${actionType} de ${actionQuantity} uds en insumo: ${selectedProduct?.product}`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      setSelectedProduct(null);
      setActionQuantity("10");
      toast.success("Ajuste de inventario realizado con éxito.");
    }
  });

  const getAlertBadge = (status: string) => {
    switch (status) {
      case "OK":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 font-bold">OK</Badge>;
      case "STOCK BAJO":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> STOCK BAJO</Badge>;
      case "AGOTADO":
        return <Badge className="bg-destructive text-destructive-foreground border-0 font-bold flex items-center gap-1 animate-pulse"><AlertOctagon className="h-3 w-3" /> AGOTADO</Badge>;
      case "POR VENCER":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 font-bold">POR VENCER</Badge>;
      case "VENCIDO":
        return <Badge className="bg-red-700 text-white border-0 font-bold animate-bounce">VENCIDO</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionQuantity || Number(actionQuantity) <= 0) return;
    stockMutation.mutate();
  };

  const filteredInventory = inventory?.filter((item: any) => {
    const searchMatch = item.product?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
    if (alertFilter === "Todos") return searchMatch;
    if (alertFilter === "Stock Crítico") return searchMatch && (item.alertStatus === "STOCK BAJO" || item.alertStatus === "AGOTADO");
    return searchMatch && item.alertStatus === alertFilter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario de Insumos</h1>
        <p className="text-muted-foreground mt-0.5 text-sm font-medium">
          Control de vacunas, descartables y medicamentos con alertas de reabastecimiento y vencimiento.
        </p>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar insumos o categorías..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-border/80 bg-background/50 p-1 backdrop-blur-md">
            {["Todos", "Stock Crítico", "OK", "VENCIDO"].map((filter) => (
              <Button
                key={filter}
                variant={alertFilter === filter ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4"
                onClick={() => setAlertFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm bg-background/50 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs font-semibold uppercase">
                  <th className="py-4 px-6">Producto</th>
                  <th className="py-4 px-6">Categoría</th>
                  <th className="py-4 px-6">Existencia Actual</th>
                  <th className="py-4 px-6">Stock Mínimo</th>
                  <th className="py-4 px-6">Proveedor</th>
                  <th className="py-4 px-6">Vencimiento</th>
                  <th className="py-4 px-6">Ubicación</th>
                  <th className="py-4 px-6">Alerta</th>
                  <th className="py-4 px-6 text-right">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">
                      Cargando inventario...
                    </td>
                  </tr>
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-foreground">{item.product}</td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-foreground text-base">
                        {item.current_stock} uds
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-semibold">Min: {item.min_stock}</td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">{item.provider || "N/A"}</td>
                      <td className="py-4 px-6 text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {item.expiration_date || "Sin vencimiento"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-semibold">{item.location}</td>
                      <td className="py-4 px-6">{getAlertBadge(item.alertStatus)}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-green-500 hover:bg-green-500/10"
                            title="Registrar Entrada"
                            onClick={() => {
                              setSelectedProduct(item);
                              setActionType("entrada");
                            }}
                          >
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                            title="Registrar Salida (Consumo)"
                            onClick={() => {
                              setSelectedProduct(item);
                              setActionType("salida");
                            }}
                          >
                            <ArrowDownRight className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">
                      No hay insumos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 capitalize">
                <Package className="h-5 w-5 text-primary" /> Registrar {actionType}
              </CardTitle>
              <CardDescription>Insumo: {selectedProduct.product}</CardDescription>
            </CardHeader>
            <form onSubmit={handleStockSubmit}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground">
                  <span>Stock Actual:</span>
                  <span className="text-foreground text-lg font-bold">{selectedProduct.current_stock} uds</span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adj-qty">Cantidad a registrar</Label>
                  <Input
                    id="adj-qty"
                    type="number"
                    min="1"
                    className="rounded-xl font-bold"
                    required
                    value={actionQuantity}
                    onChange={(e) => setActionQuantity(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-border/80"
                  onClick={() => setSelectedProduct(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary/95 text-white font-bold"
                  disabled={stockMutation.isPending}
                >
                  {stockMutation.isPending ? "Registrando..." : "Guardar Ajuste"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
