"use client"

import { useActionState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { SignupState } from "@/app/login/actions"
import { signup } from "@/app/login/actions"

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {})
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field data-disabled={pending}>
        <FieldLabel htmlFor="email">Correo</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} />
      </Field>
      <Field data-disabled={pending}>
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={pending} />
        <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
      </Field>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</Button>
    </form>
  )
}
