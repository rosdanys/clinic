export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditPayload {
  supabase: any;
  userId: string | undefined;
  userName: string | undefined;
  action: AuditAction;
  module: string;
  tableName: string;
  recordId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logAudit(p: AuditPayload) {
  if (!p.userId) return;
  try {
    await p.supabase.from('audit_log').insert({
      user_id: p.userId,
      user_name: p.userName ?? 'Desconocido',
      action: p.action,
      module: p.module,
      table_name: p.tableName,
      record_id: p.recordId ?? null,
      description: p.description,
      metadata: p.metadata ?? null,
    });
  } catch (err) {
    console.error('Error recording audit log:', err);
  }
}
