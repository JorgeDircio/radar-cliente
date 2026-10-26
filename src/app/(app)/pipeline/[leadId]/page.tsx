import Link from "next/link"
import { ArrowLeft, ExternalLink, Mail } from "lucide-react"

import { BusinessContact } from "@/components/business-contact"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getLeadDetail } from "@/lib/leads/detail"
import { LEAD_STAGES } from "@/lib/leads/model"
import { DoNotContactForm, GenerateLeadDraftForm, LeadContactForm, LeadNoteForm } from "../lead-forms"

type Props = { params: Promise<{ leadId: string }> }

const offerNames: Record<string, string> = {
  landing: "Landing page",
  rediseno: "Rediseño web",
  sistema_a_medida: "Sistema a medida",
  ninguna: "Sin oferta definida",
}

const contactStatusNames: Record<string, string> = {
  no_contactado: "Sin contactar",
  contactado: "Contactado",
  respondio: "Respondió",
  interesado: "Interesado",
  opt_out: "No contactar",
}

export default async function LeadDetailPage({ params }: Props) {
  const { leadId } = await params
  const { lead, audit, signals, score, activities } = await getLeadDetail(leadId)
  return <div className="flex flex-col gap-6">
    <Link href="/pipeline" className="flex items-center gap-2 self-start text-sm underline underline-offset-4"><ArrowLeft className="size-4" />Volver al pipeline</Link>
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{lead.business.name}</h1><Badge>{LEAD_STAGES[lead.stage]}</Badge><Badge variant={lead.do_not_contact ? "destructive" : "secondary"}>{contactStatusNames[lead.contact_status] ?? lead.contact_status}</Badge></div>
      <p className="text-muted-foreground">{lead.business.scian_label ?? "Giro no registrado"} · {lead.business.municipio ?? lead.business.entidad ?? "Ubicación no disponible"}</p>
      {lead.next_action_at ? <p className="text-sm text-muted-foreground">Próxima acción: <time dateTime={lead.next_action_at}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lead.next_action_at))}</time></p> : null}
    </header>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader><CardTitle>Propuesta de valor</CardTitle><CardDescription>Usa la evidencia para explicar una oportunidad concreta, no para prometer resultados.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3"><BusinessContact website={lead.business.website} phone={lead.business.phone} />{lead.business.email ? <a className="flex items-center gap-1 text-sm underline underline-offset-4" href={`mailto:${lead.business.email}`}><Mail className="size-4" />{lead.business.email}</a> : null}</div>
          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 lg:grid-cols-2">
            <LeadContactForm leadId={lead.id} doNotContact={lead.do_not_contact} />
            <LeadNoteForm leadId={lead.id} />
          </div>
          <DoNotContactForm leadId={lead.id} doNotContact={lead.do_not_contact} />
          {activities.length ? <div className="flex flex-col gap-3">{activities.map((activity) => <article key={activity.id} className="rounded-lg border bg-muted/30 p-3"><div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><Badge variant="outline">{activity.type}</Badge><time dateTime={activity.occurred_at}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.occurred_at))}</time></div><p className="whitespace-pre-wrap text-sm">{activity.content}</p></article>)}</div> : <p className="text-sm text-muted-foreground">Todavía no hay una propuesta generada.</p>}
          <GenerateLeadDraftForm leadId={lead.id} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card><CardHeader><CardTitle>Score</CardTitle><CardDescription>Prioridad explicable para decidir a quién contactar primero.</CardDescription></CardHeader><CardContent>{score ? <div className="flex flex-col gap-2"><p className="text-4xl font-semibold">{score.total}/100</p><p className="text-sm text-muted-foreground">Oportunidad {score.opportunity}/60 · Viabilidad {score.viability}/40</p><Badge variant="secondary">{offerNames[score.suggested_offer] ?? score.suggested_offer}</Badge></div> : <p className="text-sm text-muted-foreground">Ejecuta el análisis desde Pipeline.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Señales detectadas</CardTitle></CardHeader><CardContent>{signals.length ? <ul className="flex flex-col gap-3">{signals.map((signal) => <li key={signal.id} className="flex flex-col gap-1"><span className="font-medium">{signal.code}</span><span className="text-xs text-muted-foreground">{signal.type} · evidencia: {JSON.stringify(signal.evidence)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Sin señales todavía.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Auditoría web</CardTitle></CardHeader><CardContent>{audit ? <div className="flex flex-col gap-2 text-sm"><a href={audit.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline underline-offset-4"><ExternalLink className="size-4" />{audit.url}</a><p>Estado: {audit.reachable ? "Disponible" : "No disponible"}</p><p>HTTPS: {audit.https === null ? "Sin dato" : audit.https ? "Sí" : "No"} · Responsive: {audit.responsive === null ? "Sin dato" : audit.responsive ? "Sí" : "No"}</p>{audit.tech && typeof audit.tech === "object" ? <p>CMS: {String((audit.tech as { cms?: unknown }).cms ?? "No detectado")}</p> : null}</div> : <p className="text-sm text-muted-foreground">Todavía no hay auditoría.</p>}</CardContent></Card>
      </div>
    </div>
  </div>
}
