"use client"

import { useActionState } from "react"
import { SearchIcon } from "lucide-react"
import { ActionFeedback } from "@/components/action-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { ActionState } from "@/lib/discovery/model"
import { MEXICAN_STATES } from "@/lib/discovery/states"
import { createSearch, retrySearch } from "./actions"

export function SearchForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSearch, {})
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup className="md:grid md:grid-cols-[2fr_2fr_1fr] md:items-start">
        <Field data-invalid={Boolean(state.fieldErrors?.keywords)} data-disabled={pending || !configured}>
          <FieldLabel htmlFor="keywords">Giro o palabra clave</FieldLabel>
          <Input id="keywords" name="keywords" placeholder="Ej. dentistas, restaurantes…" required minLength={2} maxLength={100} disabled={pending || !configured} aria-invalid={Boolean(state.fieldErrors?.keywords)} aria-describedby="keywords-error" />
          <FieldError id="keywords-error">{state.fieldErrors?.keywords?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.entidad)} data-disabled={pending || !configured}>
          <FieldLabel htmlFor="entidad">Estado</FieldLabel>
          <NativeSelect id="entidad" name="entidad" defaultValue="" required disabled={pending || !configured} aria-invalid={Boolean(state.fieldErrors?.entidad)} aria-describedby="entidad-error">
            <NativeSelectOption value="" disabled>Selecciona un estado</NativeSelectOption>
            {MEXICAN_STATES.map(([code, name]) => <NativeSelectOption key={code} value={code}>{name}</NativeSelectOption>)}
          </NativeSelect>
          <FieldError id="entidad-error">{state.fieldErrors?.entidad?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.maxResults)} data-disabled={pending || !configured}>
          <FieldLabel htmlFor="maxResults">Máximo de negocios</FieldLabel>
          <Input id="maxResults" name="maxResults" type="number" min={1} max={500} step={1} defaultValue={100} required disabled={pending || !configured} aria-invalid={Boolean(state.fieldErrors?.maxResults)} aria-describedby="maxResults-help maxResults-error" />
          <FieldDescription id="maxResults-help">Entre 1 y 500.</FieldDescription>
          <FieldError id="maxResults-error">{state.fieldErrors?.maxResults?.[0]}</FieldError>
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending || !configured} className="self-start"><SearchIcon data-icon="inline-start" />{pending ? "Creando búsqueda…" : "Buscar negocios"}</Button>
    </form>
  )
}

export function RetrySearchForm({ searchId }: { searchId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(retrySearch, {})
  return <form action={action} className="flex flex-col items-start gap-2"><input type="hidden" name="searchId" value={searchId} /><Button type="submit" variant="outline" disabled={pending}>{pending ? "Reintentando…" : "Reintentar búsqueda"}</Button><ActionFeedback state={state} /></form>
}
