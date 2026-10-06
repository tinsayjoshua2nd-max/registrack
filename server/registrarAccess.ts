// Keep the legacy role compatible without exposing it as a separate office role.
export function hasRegistrarAccess(role: string | undefined): boolean {
  return role === 'registrar' || role === 'superadmin';
}
