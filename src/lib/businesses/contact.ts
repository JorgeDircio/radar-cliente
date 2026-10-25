export function websiteUrl(value: string | null | undefined): string | null {
  const text = value?.trim()
  if (!text) return null
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`,
    )
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return null
    return url.href
  } catch {
    return null
  }
}

export function phoneUrl(value: string | null): string | null {
  const number = value?.replace(/[^\d+]/g, "")
  return number && /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null
}
