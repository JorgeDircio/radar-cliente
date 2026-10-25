"use client"

import { useActionState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { ActionState } from "@/lib/discovery/model"
import { LEAD_STAGES, type LeadStage } from "@/lib/leads/model"
import { addLead, updateLeadStage } from "./actions"

export function AddLeadForm({ businessId, searchId }: { businessId: string; searchId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addLead, {})
  return <form action={action} className="flex flex-col items-start gap-2"><input type="hidden" name="businessId" value={businessId} /><input type="hidden" name="searchId" value={searchId} /><Button type="submit" size="sm" disabled={pending || Boolean(state.success)}>{pending ? "Agregando…" : state.success ? "En pipeline" : "Agregar al pipeline"}</Button><ActionFeedback state={state} /></form>
}

export function LeadStageForm({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateLeadStage, {})
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="leadId" value={leadId} />
    <Field data-disabled={pending}><FieldLabel htmlFor={`stage-${leadId}`}>Etapa</FieldLabel><NativeSelect id={`stage-${leadId}`} name="stage" defaultValue={stage} disabled={pending}>{Object.entries(LEAD_STAGES).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect></Field>
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Guardando…" : "Guardar etapa"}</Button><ActionFeedback state={state} />
  </form>
}
