"use server";

import { signIn, signOut } from "@/auth";

// Anmelde-/Abmelde-Aktionen (Auth.js v5, Microsoft Entra ID).
export async function signInAction() {
  await signIn("microsoft-entra-id", { redirectTo: "/admin" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/anmelden" });
}
