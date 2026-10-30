import { readFileSync } from "node:fs";

export function readSecret(name: string): string {
  const file = process.env[`${name}_FILE`];
  if (file) {
    return readFileSync(file, 'utf8').trim();
  }

  const value = process.env[name];
  if (!value) {
    throw new Error(`variable d'environnement manquante: ${name} (ou ${name}_FILE)`);
  }
  return value;
}
