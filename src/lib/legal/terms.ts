import { LEGAL_VERSIONS } from "../config";
import type { LegalDocument } from "./types";

export const terms: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  shortTitle: "Terms",
  version: LEGAL_VERSIONS.terms,
  summary:
    "These terms are the agreement between you and the operator of Lumen. They explain what Lumen does, what you may and may not do with it, and the limits of our responsibility. Please read them in full.",
  sections: [
    {
      id: "about",
      title: "1. About these terms",
      body: [
        "Lumen (\"Lumen\", \"the service\", \"we\", \"us\" or \"our\") is a web application that reads publicly available web pages and produces AI-generated summaries and key points. Lumen is designed, built and operated by Jayashree Mondal, an individual based in Kolkata, West Bengal, India (\"the operator\").",
        "These Terms of Service (\"Terms\") form a binding agreement between you and the operator. By ticking the acceptance box, pressing \"I agree\", creating an account, or otherwise using Lumen, you confirm that you have read, understood and agree to these Terms, our Privacy Policy, Cookie Policy, AI Disclaimer and Acceptable Use Policy, each of which forms part of these Terms.",
        "If you do not agree with any part of these Terms, you must not use Lumen.",
        "These Terms are an electronic record under the Information Technology Act, 2000 and the rules made under it. They do not require a physical or digital signature.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Who may use Lumen",
      body: [
        "You may use Lumen only if you are at least 18 years old and able to enter into a legally binding contract under the Indian Contract Act, 1872, or if you are using Lumen with the verifiable consent and supervision of a parent or lawful guardian who accepts these Terms on your behalf.",
        "If you use Lumen on behalf of an organisation, you confirm that you are authorised to accept these Terms for that organisation, and \"you\" includes that organisation.",
        "You must not use Lumen if you are barred from doing so under the laws of India or of the country from which you access it.",
      ],
    },
    {
      id: "service",
      title: "3. What Lumen does",
      body: [
        "When you submit a web address (URL), Lumen's servers request that page from the public internet, extract its readable text, and send that text to a third-party artificial intelligence (AI) model provider to generate a summary, a short \"TL;DR\", key points and topic tags. The result is shown to you and, if you are signed in, saved to your account history.",
        "Lumen also offers Ask Tara, an automated help assistant that answers questions using only the articles in Lumen's Help Center, and a support form through which you can contact a person.",
        "Lumen is provided free of charge. We may add, change, limit or remove features at any time, including usage limits, supported page types, summary formats and the AI providers we use.",
      ],
    },
    {
      id: "guest-accounts",
      title: "4. Guest use and accounts",
      body: [
        "You can use the core features of Lumen without an account (\"guest mode\"). In guest mode, your summary history is stored only in your own browser and is not sent to our database. Clearing your browser data removes it.",
        "You may create an account with an email address and password, or with a supported sign-in provider where offered. You agree to give accurate information, to keep your password confidential, and to tell us promptly through the support form if you believe your account has been used without your permission.",
        "You are responsible for all activity under your account. We are not responsible for loss caused by someone else using your password, unless that loss was caused by our failure to take reasonable security measures.",
        "You may delete your account at any time from the Account page. Deletion permanently removes your saved summaries and profile as described in the Privacy Policy.",
      ],
    },
    {
      id: "acceptable-use",
      title: "5. Acceptable use",
      body: [
        "You must use Lumen lawfully, responsibly and in line with the Acceptable Use Policy. In particular, you must not:",
        {
          list: [
            "submit URLs that you do not have a lawful right to access, or that point to private, internal, intranet or local network resources;",
            "use Lumen to probe, scan or attack any network, server or service, or to get around any website's access controls, paywalls, logins or robots rules;",
            "submit or request content that is unlawful, defamatory, obscene, harassing, hateful, or that infringes anyone's intellectual property, privacy or other rights;",
            "attempt to manipulate the AI model through instructions hidden in pages or messages (prompt injection), or to make Lumen reveal its internal instructions, keys or configuration;",
            "automate requests, scrape Lumen, exceed or evade rate limits, or use Lumen to build a competing dataset or service;",
            "interfere with, overload or disrupt the service, its security features or its infrastructure;",
            "impersonate anyone, or misrepresent your connection with any person or organisation;",
            "use Lumen's output to mislead others, for example by presenting an AI summary as the original author's words or as verified fact.",
          ],
        },
        "We may block URLs, domains, IP addresses or accounts that we reasonably believe are being used in breach of this section.",
      ],
    },
    {
      id: "third-party-content",
      title: "6. Third-party websites and content",
      body: [
        "The pages you summarise belong to their owners. Lumen does not own, control, endorse or take responsibility for any third-party website or its content, availability, accuracy or legality.",
        "Lumen fetches a page once, at your request, in order to summarise it for you. We do not republish full pages. Summaries are short, transformative overviews meant for your personal reference, and you are responsible for how you use them.",
        "If you are a website owner and do not want Lumen to access your pages, you can block requests whose User-Agent contains \"LumenSummariser\", or contact us through the support form and we will add your domain to a block list.",
      ],
    },
    {
      id: "ai-output",
      title: "7. AI-generated output",
      body: [
        "Summaries, key points, topic tags and Ask Tara answers are generated automatically by AI models. AI output can be incomplete, out of date, biased or simply wrong, even when it sounds confident. It may miss nuance, misread tables or numbers, or misunderstand sarcasm and context.",
        "Lumen's output is provided for general information only. It is not legal, medical, financial, tax, investment, engineering or any other professional advice, and it must not be relied on as a substitute for reading the original source or consulting a qualified professional.",
        "You are solely responsible for checking any important information against the original page before you rely on it, share it or act on it. Please also read our AI Disclaimer.",
      ],
    },
    {
      id: "your-content",
      title: "8. Your content and licence to us",
      body: [
        "\"Your content\" means the URLs you submit, the messages you send to Ask Tara, the support requests you send us, and the summaries generated for you.",
        "As between you and the operator, you keep whatever rights you have in your content. You grant the operator a non-exclusive, worldwide, royalty-free licence to store, process, transmit and display your content only as needed to provide, secure and improve Lumen and to respond to you. This licence ends when your content is deleted from our systems, except for copies we must keep by law or that remain in backups for a limited time.",
        "We do not sell your content, and we do not use your account details to train AI models.",
      ],
    },
    {
      id: "our-ip",
      title: "9. Lumen's intellectual property",
      body: [
        "The Lumen name, logo, the Tara character, the design of the service and its original text are owned by or licensed to the operator. Lumen's source code is published under the MIT licence; that licence applies to the code only and does not grant rights in the Lumen name, logo or the Tara character.",
        "You must not use the Lumen name, logo or Tara in a way that suggests endorsement by, or affiliation with, the operator without written permission.",
      ],
    },
    {
      id: "privacy",
      title: "10. Privacy and data protection",
      body: [
        "We process personal data in line with the Digital Personal Data Protection Act, 2023 and our Privacy Policy, which explains what we collect, why, how long we keep it, who we share it with, and the rights you have, including how to contact our Grievance Officer.",
        "When you accept these Terms, we keep a consent record containing the version of the Terms you accepted, the date and time, a one-way hash of your IP address and your browser's user-agent string, so that we can show which version applied to you.",
      ],
    },
    {
      id: "limits",
      title: "11. Usage limits and availability",
      body: [
        "To keep Lumen fast, fair and free, we apply limits such as the number of summaries per minute and per day, the maximum page size, and the maximum length of text sent to the AI model. Very long pages may be summarised from their first part only, and Lumen will tell you when that happens.",
        "Lumen depends on third-party services, including hosting, database and AI providers. We aim to keep Lumen available but do not promise that it will be uninterrupted, timely, secure or error-free. We may suspend the service for maintenance, security or reasons outside our control.",
      ],
    },
    {
      id: "support",
      title: "12. Support",
      body: [
        "You can get help from the Help Center, from Ask Tara, or by raising a support ticket. When you raise a ticket, we will email you a confirmation with a ticket ID. We aim to reply within two working days, but response times are not guaranteed.",
        "Support emails are sent to the address you give us. Please do not include passwords, card numbers, government identifiers or other sensitive personal data in support messages.",
      ],
    },
    {
      id: "suspension",
      title: "13. Suspension and termination",
      body: [
        "You may stop using Lumen at any time. We may suspend or end your access, with or without notice, if we reasonably believe that you have breached these Terms, that your use creates a risk or legal exposure for us or others, or if we are required to do so by law.",
        "Sections that by their nature should survive termination, including sections 7, 8, 9, 14, 15, 16 and 18, continue to apply after your access ends.",
      ],
    },
    {
      id: "disclaimers",
      title: "14. Disclaimers",
      body: [
        "To the fullest extent permitted by law, Lumen is provided \"as is\" and \"as available\", without warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement.",
        "We do not warrant that summaries will be accurate, complete or suitable for any purpose, that any particular page can be summarised, or that the service will be free of viruses or other harmful components. Nothing in these Terms excludes any right you have that cannot lawfully be excluded, including under the Consumer Protection Act, 2019.",
      ],
    },
    {
      id: "liability",
      title: "15. Limitation of liability",
      body: [
        "To the fullest extent permitted by law, the operator will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data, goodwill or opportunity, arising out of or in connection with your use of, or inability to use, Lumen or its output, even if advised of the possibility of such damages.",
        "Because Lumen is provided free of charge, the operator's total aggregate liability for all claims relating to Lumen is limited to INR 1,000 (one thousand Indian rupees).",
        "Nothing in these Terms limits liability for fraud, or for death or personal injury caused by negligence, or any other liability that cannot be limited by law.",
      ],
    },
    {
      id: "indemnity",
      title: "16. Indemnity",
      body: [
        "You agree to indemnify and hold harmless the operator from any claim, demand, loss or expense (including reasonable legal fees) brought by a third party that arises from your breach of these Terms or the Acceptable Use Policy, your misuse of Lumen's output, or your violation of any law or the rights of a third party.",
      ],
    },
    {
      id: "changes",
      title: "17. Changes to these terms",
      body: [
        "We may update these Terms from time to time, for example to reflect new features, legal requirements or feedback. Each version has a version number and an effective date shown at the top of this page.",
        "If a change materially affects your rights, we will ask you to review and accept the new version before you continue to use Lumen. If you do not accept the updated Terms, you must stop using the service. Earlier versions remain available on request.",
      ],
    },
    {
      id: "law",
      title: "18. Governing law and disputes",
      body: [
        "These Terms are governed by the laws of India. Subject to any mandatory consumer protection rights you have, the courts at Kolkata, West Bengal have exclusive jurisdiction over any dispute arising out of or relating to these Terms or Lumen.",
        "Before starting formal proceedings, please contact us through the support form so that we can try to resolve the issue informally within 30 days.",
      ],
    },
    {
      id: "general",
      title: "19. General",
      body: [
        "If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions remain in full force. Our failure to enforce a provision is not a waiver of our right to do so later.",
        "You may not transfer your rights under these Terms without our consent. We may transfer our rights and obligations to someone who takes over the operation of Lumen, provided your rights are not reduced.",
        "These Terms, together with the documents they refer to, are the entire agreement between you and the operator about Lumen.",
      ],
    },
    {
      id: "contact",
      title: "20. Contact",
      body: [
        "Lumen is operated by Jayashree Mondal, Kolkata, West Bengal, India. The quickest way to reach us about these Terms is the support form in the app (Help Center, then Contact support). You will receive a ticket ID by email, and you can reply to that email to continue the conversation.",
      ],
    },
  ],
};
