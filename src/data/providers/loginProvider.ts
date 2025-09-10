import path from 'node:path';
import { readFileSync } from 'node:fs';
import { LoginCase, LoginCredentials, LoginOutcome } from '../models/Login';

const SETS_DIR = path.join(process.cwd(), 'src', 'data', 'sets');

function loadJSON<T>(file: string): T {
  const p = path.join(SETS_DIR, file);
  const raw = readFileSync(p, 'utf-8');
  return JSON.parse(raw) as T;
}

// Diccionario de credenciales por alias
const CREDENTIALS: Record<string, LoginCredentials> = loadJSON('login.credentials.json');

// Lista de casos de prueba de login
const CASES: LoginCase[] = loadJSON('login.cases.json');

export const loginProvider = {
  // Credenciales crudas por alias (ej: 'standard', 'locked', etc.)
  getCreds(alias: keyof typeof CREDENTIALS | string): LoginCredentials {
    const key = String(alias);
    const creds = CREDENTIALS[key];
    if (!creds) throw new Error(`[loginProvider] alias no encontrado: ${key}`);
    return creds;
  },

  // Caso por id
  getCase(id: string): LoginCase {
    const found = CASES.find(c => c.id === id);
    if (!found) throw new Error(`[loginProvider] caso no encontrado: ${id}`);
    return found;
  },

  // Filtra casos por outcome
  listCases(filter?: { outcome?: LoginOutcome; tagsInclude?: string[] }): LoginCase[] {
    let items = CASES.slice();
    if (filter?.outcome) items = items.filter(c => c.outcome === filter.outcome);
    if (filter?.tagsInclude?.length) {
      items = items.filter(c => (c.tags || []).some(t => filter.tagsInclude!.includes(t)));
    }
    return items;
  },

  // Exponer todos (útil en outlines)
  allCases(): LoginCase[] {
    return CASES.slice();
  }
};
