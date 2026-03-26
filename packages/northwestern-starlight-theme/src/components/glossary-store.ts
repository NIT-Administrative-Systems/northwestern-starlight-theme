/** Module-level glossary store. Populated by Glossary, read by Term during the same Astro build pass. */
const terms = new Map<string, string>();

export function setTerms(entries: Record<string, string>): void {
    for (const [key, value] of Object.entries(entries)) {
        terms.set(key, value);
    }
}

export function getTerm(key: string): string | undefined {
    return terms.get(key);
}
