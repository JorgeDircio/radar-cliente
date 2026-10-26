"use client"

import { useActionState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { ActionState } from "@/lib/discovery/model"
import { LEAD_STAGES, type LeadStage } from "@/lib/leads/model"
import { addLead, addLeadNote, auditLead, generateLeadDraft, markLeadDoNotContact, publishProposalPage, recordLeadContact, saveOutreachDraft, simulateOutreach, updateLeadStage } from "./actions"

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

export function AuditLeadForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(auditLead, {})
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="leadId" value={leadId} />
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Analizando…" : "Analizar prospecto"}</Button>
    <ActionFeedback state={state} />
  </form>
}

export function GenerateLeadDraftForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(generateLeadDraft, {})
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="leadId" value={leadId} />
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Generando…" : "Generar borrador IA"}</Button>
    <ActionFeedback state={state} />
  </form>
}

export function PublishProposalForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishProposalPage, {})
  return <form action={action} className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
    <input type="hidden" name="leadId" value={leadId} />
    <p className="text-sm font-medium">Propuesta visual compartible</p>
    <p className="text-xs text-muted-foreground">Crea una página breve con la oferta y un CTA medible. Puedes revisarla antes de compartirla.</p>
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Publicando…" : "Publicar propuesta visual"}</Button>
    <ActionFeedback state={state} />
  </form>
}

export function OutreachForm({ leadId, defaultContent, doNotContact }: { leadId: string; defaultContent?: string; doNotContact: boolean }) {
  const [draftState, draftAction, draftPending] = useActionState<ActionState, FormData>(saveOutreachDraft, {})
  const [simState, simAction, simPending] = useActionState<ActionState, FormData>(simulateOutreach, {})
  const pending = draftPending || simPending
  return <form action={draftAction} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
    <input type="hidden" name="leadId" value={leadId} />
    <div className="flex flex-col gap-1"><label htmlFor={`outreach-channel-${leadId}`} className="text-sm font-medium">Canal de prueba</label><NativeSelect id={`outreach-channel-${leadId}`} name="channel" defaultValue="whatsapp" disabled={pending}><NativeSelectOption value="whatsapp">WhatsApp (sandbox)</NativeSelectOption><NativeSelectOption value="email">Email (sandbox)</NativeSelectOption></NativeSelect></div>
    <div className="flex flex-col gap-1"><label htmlFor={`outreach-content-${leadId}`} className="text-sm font-medium">Mensaje listo para revisar</label><textarea id={`outreach-content-${leadId}`} name="content" required minLength={2} maxLength={4000} rows={5} defaultValue={defaultContent} placeholder="Genera un borrador IA o escribe el mensaje…" className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></div>
    <p className="text-xs text-muted-foreground">Modo sandbox: registra el envío y la actividad, pero no contacta a ningún negocio.</p>
    <div className="flex flex-wrap gap-2"><Button type="submit" variant="outline" size="sm" disabled={pending || doNotContact}>{draftPending ? "Guardando…" : "Guardar borrador"}</Button><Button type="submit" formAction={simAction} size="sm" disabled={pending || doNotContact}>{simPending ? "Simulando…" : "Simular envío"}</Button></div>
    <ActionFeedback state={draftState} />
    <ActionFeedback state={simState} />
  </form>
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addLeadNote, {})
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="leadId" value={leadId} />
    <Field><FieldLabel htmlFor={`note-${leadId}`}>Nota interna</FieldLabel><textarea id={`note-${leadId}`} name="content" required minLength={2} maxLength={2000} rows={4} placeholder="Qué aprendiste, qué pidió o qué debes revisar…" className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></Field>
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Guardando…" : "Guardar nota"}</Button>
    <ActionFeedback state={state} />
  </form>
}

export function LeadContactForm({ leadId, doNotContact }: { leadId: string; doNotContact: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordLeadContact, {})
  return <form action={action} className="flex flex-col gap-3">
    <input type="hidden" name="leadId" value={leadId} />
    <div className="grid gap-3 sm:grid-cols-2">
      <Field><FieldLabel htmlFor={`channel-${leadId}`}>Canal</FieldLabel><NativeSelect id={`channel-${leadId}`} name="channel" defaultValue="whatsapp" disabled={pending}><NativeSelectOption value="whatsapp">WhatsApp</NativeSelectOption><NativeSelectOption value="llamada">Llamada</NativeSelectOption><NativeSelectOption value="email">Email</NativeSelectOption><NativeSelectOption value="reunion">Reunión</NativeSelectOption></NativeSelect></Field>
      <Field><FieldLabel htmlFor={`contact-status-${leadId}`}>Resultado</FieldLabel><NativeSelect id={`contact-status-${leadId}`} name="contactStatus" defaultValue="contactado" disabled={pending}><NativeSelectOption value="contactado">Contactado</NativeSelectOption><NativeSelectOption value="respondio">Respondió</NativeSelectOption><NativeSelectOption value="interesado">Interesado</NativeSelectOption><NativeSelectOption value="opt_out">Pidió no contactar</NativeSelectOption></NativeSelect></Field>
    </div>
    <Field><FieldLabel htmlFor={`contact-content-${leadId}`}>Qué ocurrió</FieldLabel><textarea id={`contact-content-${leadId}`} name="content" required minLength={2} maxLength={2000} rows={3} placeholder="Resumen de la conversación y respuesta…" className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></Field>
    <Field><FieldLabel htmlFor={`next-action-${leadId}`}>Próxima acción (opcional)</FieldLabel><Input id={`next-action-${leadId}`} name="nextActionAt" type="datetime-local" disabled={pending} /></Field>
    <Button type="submit" variant="outline" size="sm" disabled={pending || doNotContact}>{pending ? "Registrando…" : doNotContact ? "No contactar está activo" : "Registrar contacto"}</Button>
    <ActionFeedback state={state} />
  </form>
}

export function DoNotContactForm({ leadId, doNotContact }: { leadId: string; doNotContact: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markLeadDoNotContact, {})
  if (doNotContact) return <p className="text-sm text-destructive">Este prospecto está marcado como no contactar.</p>
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="leadId" value={leadId} />
    <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Actualizando…" : "Marcar como no contactar"}</Button>
    <ActionFeedback state={state} />
  </form>
}
