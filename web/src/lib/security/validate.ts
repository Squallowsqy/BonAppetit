import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail invalide.")
  .max(254);

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Indique ton prénom.")
  .max(80, "Prénom trop long.")
  .regex(/^[\p{L}\p{M}\s'-]+$/u, "Prénom invalide.");

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

/** Soft cap on vault JSON (~512 KB) to limit abuse. */
export const MAX_VAULT_BYTES = 512 * 1024;

export function assertVaultSize(data: unknown): void {
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  if (size > MAX_VAULT_BYTES) {
    throw new Error("Vault trop volumineux.");
  }
}
