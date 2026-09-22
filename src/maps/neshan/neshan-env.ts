import { connection } from "next/server";

export const NESHAN_PUBLIC_MAP_KEY_ENV = "NEXT_PUBLIC_NESHAN_MAP_KEY";
export const NESHAN_SERVICE_API_KEY_ENV = "NESHAN_SERVICE_API_KEY";

/**
 * Reads one runtime environment value on the server.
 * Bracket access plus connection() keeps the value out of the build-time
 * client bundle, including NEXT_PUBLIC names that Next would otherwise inline.
 */
export async function readRuntimeEnv(name: string): Promise<string | null> {
  await connection();
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
