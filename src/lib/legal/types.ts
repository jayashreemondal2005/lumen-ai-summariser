export type Block = string | { list: string[] } | { h3: string };

export interface LegalSection {
  id: string;
  title: string;
  body: Block[];
}

export interface LegalDocument {
  slug: "terms" | "privacy" | "cookies" | "ai-disclaimer" | "acceptable-use";
  title: string;
  shortTitle: string;
  version: string;
  summary: string;
  sections: LegalSection[];
}
