import type { Metadata } from "next"
import Link from "next/link"

import { getPublicProposal } from "@/lib/proposals/public"

type Props = { params: Promise<{ token: string }> }

// Public proposals are backed by a live token lookup and must render at request time.
export const instant = false

const offerNames: Record<string, string> = {
  landing: "Landing page enfocada en conversión",
  rediseno: "Rediseño web con una experiencia más clara",
  sistema_a_medida: "Sistema digital a la medida",
  ninguna: "Una revisión inicial sin compromiso",
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const proposal = await getPublicProposal(token, false)
  return { title: proposal.title, description: proposal.summary }
}

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params
  const proposal = await getPublicProposal(token)
  const offer = offerNames[proposal.offer] ?? proposal.offer

  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8">
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="text-sm font-medium tracking-[0.2em] text-cyan-300 uppercase">Radar de Clientes</div>
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-cyan-950/30 sm:p-10">
        <p className="text-sm text-cyan-200">Una idea concreta para tu negocio</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{proposal.title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">{proposal.summary}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><p className="text-xs font-medium tracking-wider text-slate-400 uppercase">Oportunidad observada</p><p className="mt-2 leading-7 text-slate-200">{proposal.rationale}</p></div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5"><p className="text-xs font-medium tracking-wider text-cyan-200 uppercase">Propuesta sugerida</p><p className="mt-2 font-medium leading-7 text-white">{offer}</p></div>
        </div>
        {proposal.whatsapp_message ? <blockquote className="mt-8 border-l-2 border-cyan-300 pl-4 text-slate-300">“{proposal.whatsapp_message}”</blockquote> : null}
        {proposal.cta_url ? <Link href={`/api/proposals/${token}/cta`} className="mt-8 inline-flex rounded-full bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200">Platiquemos de esta idea</Link> : <p className="mt-8 text-sm text-slate-400">Si te interesa, responde a la persona que te compartió esta propuesta.</p>}
      </section>
      <p className="text-center text-xs text-slate-500">Propuesta informativa, preparada a partir de señales públicas. No implica compromiso.</p>
      <Link href="/" className="mx-auto text-xs text-slate-500 underline underline-offset-4">Conocer Radar de Clientes</Link>
    </div>
  </main>
}
