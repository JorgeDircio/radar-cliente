"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const credentials = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type LoginState = { error?: string }

export type SignupState = { error?: string; success?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Correo o contraseña inválidos" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Credenciales incorrectas" }

  redirect("/radar")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = credentials.extend({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
  }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) return { error: "No se pudo crear la cuenta. Revisa el correo o intenta con otra contraseña." }
  if (!data.session) return { success: "Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión." }

  redirect("/radar")
}
