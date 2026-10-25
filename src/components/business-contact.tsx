import { phoneUrl, websiteUrl } from "@/lib/businesses/contact"

export function BusinessContact({
  website,
  phone,
}: {
  website: string | null
  phone: string | null
}) {
  const web = websiteUrl(website)
  const telephone = phoneUrl(phone)
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {web ? (
        <a
          href={web}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Visitar web
        </a>
      ) : (
        <span className="text-muted-foreground">Sin web registrada</span>
      )}
      {telephone ? (
        <a href={telephone} className="underline underline-offset-4">
          {phone}
        </a>
      ) : (
        <span className="text-muted-foreground">Sin teléfono válido</span>
      )}
    </div>
  )
}
