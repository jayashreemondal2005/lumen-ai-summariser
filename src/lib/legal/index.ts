import { terms } from "./terms";
import { privacy } from "./privacy";
import { acceptableUse, aiDisclaimer, cookies } from "./others";
import type { LegalDocument } from "./types";

export const LEGAL_DOCS: LegalDocument[] = [terms, privacy, cookies, aiDisclaimer, acceptableUse];

export function legalDoc(slug: string): LegalDocument | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

export { terms, privacy, cookies, aiDisclaimer, acceptableUse };
export type { LegalDocument, LegalSection, Block } from "./types";
