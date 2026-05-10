export function publicRegistrationEnabled() {
  return process.env.KITE_ALLOW_PUBLIC_REGISTRATION === "true";
}
