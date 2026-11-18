// Lumen Help Center. These articles are the only knowledge Ask Tara may use.

export interface HelpArticle {
  id: string;
  slug: string;
  category: HelpCategory;
  title: string;
  summary: string;
  keywords: string[];
  /** Simple markup: paragraphs separated by blank lines; "- " list items; "1. " steps; "## " subheadings. */
  body: string;
}

export type HelpCategory = "getting-started" | "summaries" | "troubleshooting" | "account" | "privacy" | "support";

export const HELP_CATEGORIES: Record<HelpCategory, { title: string; blurb: string }> = {
  "getting-started": { title: "Getting started", blurb: "What Lumen is and how to use it" },
  summaries: { title: "Summaries", blurb: "Length options, key points and accuracy" },
  troubleshooting: { title: "Troubleshooting", blurb: "When a page won't summarise" },
  account: { title: "Account and history", blurb: "Guest mode, sign-in and saved summaries" },
  privacy: { title: "Privacy and security", blurb: "What we store and how we protect it" },
  support: { title: "Contact and support", blurb: "Reaching a person and ticket IDs" },
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "what-is-lumen",
    slug: "what-is-lumen",
    category: "getting-started",
    title: "What is Lumen?",
    summary: "Lumen reads a public web page and gives you a short summary and the key points.",
    keywords: ["about", "what", "lumen", "summariser", "summarizer", "purpose", "free", "cost", "price"],
    body: `Lumen is a free web app that turns any public web page into a clear summary. Paste a link, and Lumen reads the page, finds the main content and writes a TL;DR, a summary and a list of key points.

It works best on articles, blog posts, news, documentation, guides and product pages.

## Is it free?
Yes. Lumen is free to use, with or without an account. There are fair-use limits so that everyone gets a fast experience (see "Usage limits").

## Who makes Lumen?
Lumen is designed and built by Jayashree Mondal in Kolkata, India.`,
  },
  {
    id: "how-to-summarise",
    slug: "how-to-summarise-a-page",
    category: "getting-started",
    title: "How to summarise a page",
    summary: "Paste a link, pick a length and press Summarise.",
    keywords: ["how", "use", "start", "paste", "link", "url", "summarise", "summarize", "steps", "button"],
    body: `1. Copy the address of the page from your browser's address bar.
2. Paste it into the box on Lumen's home page. You can leave out "https://".
3. Choose a length: Brief, Standard or Detailed.
4. Press Summarise, or press Enter.

Lumen shows each step as it happens: fetching the page, reading the content and writing the summary. Most pages take 3 to 10 seconds.

The first time you use Lumen, we'll ask you to read and accept the Terms of Service.`,
  },
  {
    id: "length-options",
    slug: "summary-length-options",
    category: "summaries",
    title: "Brief, Standard and Detailed summaries",
    summary: "How the three length options differ.",
    keywords: ["length", "brief", "standard", "detailed", "short", "long", "words", "key points", "how many"],
    body: `- Brief: about 40 to 70 words and 3 key points. Good for a quick check.
- Standard: about 90 to 150 words and 4 to 5 key points. The default.
- Detailed: about 180 to 280 words and 6 to 7 key points. Good for long articles and documentation.

Every summary also has a one or two sentence TL;DR at the top and up to 5 topic tags.`,
  },
  {
    id: "how-it-works",
    slug: "how-lumen-reads-pages",
    category: "summaries",
    title: "How Lumen reads pages",
    summary: "What happens between pressing Summarise and seeing the result.",
    keywords: ["how", "works", "fetch", "extract", "readability", "ai", "model", "groq", "gemini", "process", "technology"],
    body: `When you press Summarise:

1. Lumen checks the address is a public web page (not a private or local network address).
2. Lumen's server downloads the page, once, like a browser would.
3. It removes menus, adverts, cookie banners and other clutter to find the main text.
4. That text is sent to an AI model, which writes the summary in a fixed format.
5. Lumen checks the AI's answer is complete and well-formed before showing it.

Lumen uses open models hosted by Groq, with Google Gemini as a backup. Very long pages are summarised from their first part only, and Lumen tells you when that happens.`,
  },
  {
    id: "accuracy",
    slug: "is-the-summary-accurate",
    category: "summaries",
    title: "Can I trust the summary?",
    summary: "Summaries are written by AI and can contain mistakes.",
    keywords: ["accurate", "accuracy", "wrong", "mistake", "error", "trust", "hallucination", "incorrect", "reliable", "fact"],
    body: `Lumen's summaries are written by AI. They are usually a good overview, but they can miss context or get details like numbers, names and dates wrong.

For anything important, open the original page (there's a link on every summary) and check.

If a summary is wrong, please raise a support ticket with the topic "Summary quality" and include the link. It helps us improve Lumen. You can read more in the AI Disclaimer.`,
  },
  {
    id: "notices",
    slug: "summary-notices",
    category: "summaries",
    title: "What the notices on a summary mean",
    summary: "Truncated text, low content and ignored instructions.",
    keywords: ["notice", "warning", "truncated", "first part", "low quality", "instructions", "ignored", "injection", "banner"],
    body: `Sometimes a summary shows a notice:

- "Long page": the page was longer than Lumen can send to the AI at once, so the summary is based on the first part.
- "Limited content": the page had very little readable text, for example a login wall, a cookie notice or a page built from images.
- "Hidden instructions ignored": the page contained text that tried to give orders to AI tools. Lumen ignored it and summarised the rest.`,
  },
  {
    id: "page-failed",
    slug: "why-a-page-wont-summarise",
    category: "troubleshooting",
    title: "Why a page won't summarise",
    summary: "The most common reasons and what to try.",
    keywords: ["fail", "failed", "error", "not working", "won't", "cannot", "can't", "problem", "blocked", "403", "404", "javascript", "login", "paywall", "timeout"],
    body: `Common reasons:

- The site blocked automated access (error 401 or 403). Some sites only allow real browsers.
- The page needs JavaScript to show its text, or it's behind a login or paywall. Lumen can only read what the server sends.
- The page doesn't exist (error 404), or the link has a typo.
- The site was too slow and the request timed out.
- The link is a PDF, image or video, not a web page.
- The address points to a private, local or internal network. Lumen blocks these for security.

What to try: check the link opens in a private browser window without signing in, try another article on the same site, or wait a minute and try again.`,
  },
  {
    id: "pdf",
    slug: "pdf-and-other-files",
    category: "troubleshooting",
    title: "Can Lumen summarise PDFs, videos or images?",
    summary: "Lumen currently supports web pages only.",
    keywords: ["pdf", "video", "youtube", "image", "file", "upload", "document", "docx"],
    body: `Not yet. Lumen summarises web pages (HTML) and plain-text pages. Links to PDFs, images, videos and other files are rejected with a clear message.

Tip: many sites publish the same content as a web page. Look for an "HTML" or "Read online" version.`,
  },
  {
    id: "limits",
    slug: "usage-limits",
    category: "troubleshooting",
    title: "Usage limits",
    summary: "How many summaries you can make, and why there are limits.",
    keywords: ["limit", "limits", "rate", "too many", "quota", "429", "per day", "per minute", "wait", "slow down"],
    body: `To keep Lumen fast and free, there are fair-use limits:

- 6 summaries per minute
- 60 summaries per day

If you reach a limit, Lumen tells you how long to wait. Pages are also limited to about 3 MB, and very long text is shortened before it's sent to the AI.`,
  },
  {
    id: "guest-mode",
    slug: "guest-mode",
    category: "account",
    title: "Using Lumen without an account",
    summary: "Guest mode gives you every core feature, with history kept in your browser.",
    keywords: ["guest", "without account", "no account", "anonymous", "sign up", "need account", "local", "browser"],
    body: `You don't need an account. As a guest you can summarise pages, copy and download summaries, see your history and ask Tara.

Guest history is stored only in this browser (up to 50 summaries). It isn't sent to our servers, so it won't appear on other devices, and clearing your browser data deletes it.

Create a free account if you want your history saved across devices.`,
  },
  {
    id: "create-account",
    slug: "create-an-account",
    category: "account",
    title: "Creating an account and verifying your email",
    summary: "Sign up with email and password, then confirm your address.",
    keywords: ["create", "account", "sign up", "signup", "register", "verify", "verification", "confirm", "email", "link", "google"],
    body: `1. Select Sign in, then Create account.
2. Enter your name, email and a password of at least 8 characters.
3. Read and accept the Terms of Service.
4. Open the verification email we send you and select the link. You'll be signed in automatically.

Didn't get the email? Check your spam folder, wait a couple of minutes, and make sure the address is spelled correctly. You can request a new link from the sign-in page.`,
  },
  {
    id: "password",
    slug: "reset-your-password",
    category: "account",
    title: "Reset your password",
    summary: "Use Forgot password on the sign-in page.",
    keywords: ["password", "forgot", "reset", "change password", "can't sign in", "login", "log in", "locked"],
    body: `1. Go to Sign in and select "Forgot password?".
2. Enter your email address.
3. Open the email and select the reset link.
4. Choose a new password.

For your security the link expires after a short time. If it has expired, request a new one.`,
  },
  {
    id: "history",
    slug: "your-history",
    category: "account",
    title: "Finding and deleting saved summaries",
    summary: "Everything you've summarised is on the History page.",
    keywords: ["history", "saved", "find", "previous", "past", "delete", "remove", "clear", "search"],
    body: `Open History from the top menu to see your past summaries, newest first. You can search by title or site, open a summary again, or delete it.

Signed in: summaries are saved to your account automatically.
Guest: summaries are saved in this browser only.`,
  },
  {
    id: "delete-account",
    slug: "delete-your-account",
    category: "account",
    title: "Download your data or delete your account",
    summary: "Both are available on the Account page.",
    keywords: ["delete account", "close account", "remove account", "export", "download data", "my data", "erase", "withdraw consent"],
    body: `On the Account page you can:

- Download my data: a JSON file with your profile, saved summaries, support tickets and consent records.
- Delete account: permanently removes your account and saved summaries. This can't be undone.

Deleting your account also withdraws your consent to processing.`,
  },
  {
    id: "privacy-data",
    slug: "what-data-lumen-stores",
    category: "privacy",
    title: "What data Lumen stores",
    summary: "As little as possible, and never your raw IP address.",
    keywords: ["privacy", "data", "store", "collect", "personal", "ip", "tracking", "cookies", "sell", "dpdp", "gdpr"],
    body: `- Guests: nothing on our servers except a consent record and anonymous rate-limit counters. Your history stays in your browser.
- Account holders: your email, name and the summaries you save.
- Support tickets: the name, email and message you send.

We never store your raw IP address (only a one-way hash, for abuse prevention). We don't use advertising or analytics cookies and we don't sell data. Full details are in the Privacy Policy, written for India's DPDP Act, 2023.`,
  },
  {
    id: "ai-providers",
    slug: "what-is-sent-to-ai",
    category: "privacy",
    title: "What is sent to the AI?",
    summary: "Only the page text, its URL and title. Never your name or email.",
    keywords: ["ai", "sent", "share", "groq", "gemini", "google", "training", "model", "third party", "provider"],
    body: `To write a summary, Lumen sends the readable text of the page, its URL and title, and the length you chose to the AI provider. Your name, email, account and IP address are never included.

When you ask Tara a question, your question and the matching Help Center articles are sent the same way.

Please don't summarise private pages that contain your own sensitive information.`,
  },
  {
    id: "security",
    slug: "how-lumen-keeps-you-safe",
    category: "privacy",
    title: "How Lumen keeps you safe",
    summary: "Private-network blocking, strict browser security and isolated accounts.",
    keywords: ["security", "safe", "secure", "ssrf", "hack", "attack", "injection", "protect", "encryption", "rls"],
    body: `- Lumen refuses to open private, local and cloud-internal addresses, and re-checks every redirect.
- Page text is treated as untrusted data and escaped before the AI sees it; the AI's answer must match a fixed format.
- API keys stay on the server and never reach your browser.
- A strict Content Security Policy and other security headers protect every page.
- Each account can only read its own data (row-level security).
- Rate limits and spam checks protect the service and the support inbox.`,
  },
  {
    id: "contact",
    slug: "contact-support",
    category: "support",
    title: "Talk to a person",
    summary: "Raise a support ticket and get a reply by email.",
    keywords: ["contact", "support", "human", "person", "agent", "talk", "help", "email", "ticket", "complaint", "grievance", "report"],
    body: `If the Help Center doesn't answer your question:

1. Ask Tara and choose "Raise a support ticket", or open the Contact support page.
2. Enter your name, email, a subject and a description.
3. Submit. You'll get a confirmation email with your ticket ID straight away.

A person will reply by email, usually within 2 working days. Please don't include passwords or other sensitive data in your message.`,
  },
  {
    id: "ticket-id",
    slug: "ticket-ids",
    category: "support",
    title: "Ticket IDs and confirmation emails",
    summary: "What your ticket ID means and what to do if no email arrives.",
    keywords: ["ticket id", "reference", "confirmation", "no email", "didn't receive", "follow up", "reply", "status", "LUM"],
    body: `Every ticket has an ID like LUM-261118-7K4Q. It's shown on screen and in the confirmation email.

To add information, reply to the confirmation email and keep the ticket ID in the subject.

No confirmation email? Check your spam or promotions folder. If it isn't there, the address may have a typo: raise a new ticket with the right address.`,
  },
  {
    id: "about-tara",
    slug: "about-tara",
    category: "support",
    title: "Who is Tara?",
    summary: "Tara is Lumen's automated help assistant.",
    keywords: ["tara", "assistant", "bot", "chatbot", "who", "robot", "ai assistant", "help bot"],
    body: `Tara is Lumen's help assistant. She answers questions using only the articles in this Help Center, so her answers stay accurate and on topic.

Tara is automated, not a person. If she can't answer, she'll offer to raise a support ticket so a person can help.`,
  },
];

/* ------------------------------------------------------------------ */
/* Search (used by the Help Center page and by Ask Tara retrieval)     */
/* ------------------------------------------------------------------ */

const STOP = new Set(
  "a an and are as at be but by can do does for from how i if in is it its me my of on or so that the this to was what when where which who why will with you your lumen please".split(
    " ",
  ),
);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(ing|ed|es|s)$/, "") || t);
}

export function searchHelp(query: string, limit = 3): Array<{ article: HelpArticle; score: number }> {
  const q = tokenize(query);
  if (!q.length) return [];
  const qs = query.toLowerCase();
  return HELP_ARTICLES.map((article) => {
    const title = tokenize(article.title);
    const kws = article.keywords.flatMap((k) => tokenize(k));
    const body = tokenize(`${article.summary} ${article.body}`);
    let score = 0;
    for (const t of q) {
      if (title.includes(t)) score += 3;
      if (kws.includes(t)) score += 2.5;
      if (body.includes(t)) score += 0.6;
    }
    for (const k of article.keywords) if (k.includes(" ") && qs.includes(k)) score += 4;
    return { article, score };
  })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function helpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function helpArticleById(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.id === id);
}
