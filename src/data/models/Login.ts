export interface LoginCredentials {
  username: string;
  password: string;
}

export type LoginOutcome =
  | 'success'
  | 'locked'
  | 'invalid'
  | 'missing-username'
  | 'missing-password';

export interface LoginCase {
  id: string;                 // identificador único (ej: "ok-standard", "locked-out")
  description?: string;       // descripción breve del caso
  creds: LoginCredentials;    // credenciales usadas
  outcome: LoginOutcome;      // resultado esperado
  expectedError?: string;     // texto de error esperado si aplica
  tags?: string[];            // opcional, para agrupar/filtrar
}
