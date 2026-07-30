import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "Admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { email, name, role, phone, specialty } = await req.json();
  if (!email || !name || !role) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID().slice(0, 16) + "Aa1!",
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ phone: phone || null, specialty: specialty || null })
    .eq("id", authUser.user.id);

  if (updateError) {
    console.error("Error al actualizar perfil con teléfono/especialidad:", updateError);
  }

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${req.nextUrl.origin}/auth/update-password`,
  });

  if (resetError) {
    console.error("Error al enviar email de reset:", resetError);
  }

  return NextResponse.json({
    success: true,
    userId: authUser.user.id,
    email,
  });
}
