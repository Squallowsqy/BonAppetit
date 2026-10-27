import bcrypt from "bcryptjs";

/** Cost 12 ≈ 250ms — resistant to offline cracking without DoS on register. */
const BCRYPT_ROUNDS = 12;

const MIN_LEN = 10;
const MAX_LEN = 128;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_LEN) {
    return `Mot de passe : ${MIN_LEN} caractères minimum.`;
  }
  if (password.length > MAX_LEN) {
    return "Mot de passe trop long.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Mot de passe : majuscule et minuscule requises.";
  }
  if (!/[0-9]/.test(password)) {
    return "Mot de passe : au moins un chiffre.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Mot de passe : au moins un caractère spécial.";
  }
  return null;
}

export async function hashPasswordSecure(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPasswordSecure(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Real bcrypt hash of a fixed string — equalizes login timing when user missing. */
const TIMING_PAD_HASH =
  "$2b$12$jC6kSuNGndE1yLhsH3fn6Op9T2PrAe7BEv9x.Kb5jhNmXnnUEpAoy";

export async function dummyPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, TIMING_PAD_HASH);
}
