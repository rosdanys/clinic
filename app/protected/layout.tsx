import { Suspense } from "react";
import { Activity } from "lucide-react";
import { ProtectedContent } from "@/components/protected-content";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground gap-4">
          <Activity className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm font-medium tracking-wide">Cargando clínica médica...</p>
        </div>
      }
    >
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
