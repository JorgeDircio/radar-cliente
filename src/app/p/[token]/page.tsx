import type { Metadata } from "next"
import Link from "next/link"

import { fallbackProposalCreative } from "@/lib/proposals/creative"
import { proposalCreativeSchema } from "@/lib/proposals/model"
import { getPublicProposal } from "@/lib/proposals/public"
import { getLandingVariant } from "@/lib/proposals/variants"

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
  const variant = getLandingVariant(proposal.design_variant)
  const creativeResult = proposalCreativeSchema.safeParse(proposal.creative)
  const creative = creativeResult.success
    ? creativeResult.data
    : fallbackProposalCreative({ businessName: proposal.title, scianLabel: null, offer: proposal.offer, summary: proposal.summary })
  const offer = offerNames[proposal.offer] ?? proposal.offer
  const dark = variant.id === "conversion" || variant.id === "premium"

  return <main className={`min-h-screen px-5 py-8 sm:px-8 sm:py-12 ${variant.pageClass}`}>
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className={`flex items-center justify-between text-xs font-semibold tracking-[0.2em] uppercase ${variant.accentClass}`}><span>Una idea para tu negocio</span><span className="tracking-normal opacity-60">{variant.label}</span></div>
      <section className={`overflow-hidden rounded-[2rem] border p-7 shadow-2xl sm:p-12 ${variant.shellClass}`}>
        <div className={variant.id === "bold" || variant.id === "conversion" ? "grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end" : "grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"}>
          <div>
            <p className={`text-sm font-medium ${variant.accentClass}`}>{variant.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">{creative.headline}</h1>
            <p className={`mt-6 max-w-2xl text-lg leading-8 ${variant.mutedClass}`}>{creative.subheadline}</p>
            {proposal.cta_url ? <Link href={`/api/proposals/${token}/cta`} className={`mt-8 inline-flex rounded-full px-6 py-3 font-semibold transition ${variant.buttonClass}`}>{creative.ctaLabel}</Link> : null}
          </div>
          <div className={`rounded-3xl border p-6 ${dark ? "border-white/15 bg-white/[0.06]" : "border-current/10 bg-black/[0.03]"}`}>
            <p className={`text-xs font-semibold tracking-[0.16em] uppercase ${variant.accentClass}`}>Propuesta sugerida</p>
            <p className="mt-3 text-xl font-medium leading-8">{offer}</p>
            <p className={`mt-4 text-sm leading-6 ${variant.mutedClass}`}>{proposal.summary}</p>
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {creative.valuePillars.map((pillar) => <div key={pillar} className={`rounded-2xl border px-4 py-4 text-sm font-medium ${dark ? "border-white/10 bg-white/[0.04]" : "border-current/10 bg-background/40"}`}>{pillar}</div>)}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <article className={`rounded-3xl border p-6 ${variant.shellClass}`}><p className={`text-xs font-semibold tracking-[0.16em] uppercase ${variant.accentClass}`}>Lo que observamos</p><p className={`mt-3 leading-7 ${variant.mutedClass}`}>{proposal.rationale}</p></article>
        <article className={`rounded-3xl border p-6 ${variant.shellClass}`}><p className={`text-xs font-semibold tracking-[0.16em] uppercase ${variant.accentClass}`}>Siguiente paso</p><blockquote className={`mt-3 border-l-2 pl-4 leading-7 ${variant.mutedClass} ${variant.id === "premium" ? "border-[#e7c78d]" : "border-current/30"}`}>“{proposal.whatsapp_message ?? "¿Te comparto una idea breve?"}”</blockquote></article>
      </section>
      <footer className={`flex flex-col items-center gap-2 text-center text-xs ${variant.mutedClass}`}><p>Propuesta informativa, preparada a partir de señales públicas. No implica compromiso.</p><Link href="/" className="underline underline-offset-4">Conocer Radar de Clientes</Link></footer>
    </div>
  </main>
}
