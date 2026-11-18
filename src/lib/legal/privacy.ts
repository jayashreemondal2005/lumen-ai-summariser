import { LEGAL_VERSIONS } from "../config";
import type { LegalDocument } from "./types";

export const privacy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  shortTitle: "Privacy",
  version: LEGAL_VERSIONS.privacy,
  summary:
    "This notice explains what personal data Lumen processes, why, for how long, who we share it with, and the rights you have under India's Digital Personal Data Protection Act, 2023 (DPDP Act).",
  sections: [
    {
      id: "who",
      title: "1. Who is responsible for your data",
      body: [
        "Lumen is operated by Jayashree Mondal, Kolkata, West Bengal, India, who is the Data Fiduciary for personal data processed through Lumen under the DPDP Act. In this notice, \"we\", \"us\" and \"our\" refer to the operator.",
        "Our Grievance Officer is Jayashree Mondal. You can contact the Grievance Officer through the in-app support form by choosing the topic \"Privacy and data\". We acknowledge grievances by email with a ticket ID and aim to resolve them within 30 days.",
      ],
    },
    {
      id: "summary",
      title: "2. The short version",
      body: [
        {
          list: [
            "You can use Lumen as a guest. Guest history stays in your browser; we don't store it.",
            "If you create an account, we store your email, your display name and the summaries you choose to keep.",
            "The text of the pages you summarise is sent to an AI provider to produce the summary. We do not send your name or email with it.",
            "We never store your raw IP address. We keep a one-way hash of it for abuse prevention and consent records.",
            "We don't use advertising or analytics cookies, and we don't sell your data.",
            "You can download or delete your data at any time from the Account page.",
          ],
        },
      ],
    },
    {
      id: "what",
      title: "3. Personal data we process",
      body: [
        { h3: "Account data (only if you sign up)" },
        "Email address, display name, a password hash (managed by our authentication provider, never visible to us), sign-in timestamps and, if you use a sign-in provider, the basic profile it shares (name, email, profile image URL).",
        { h3: "Summaries you save" },
        "For signed-in users: the URL you submitted, the page title and site name, the generated summary, key points and topics, word count and the time it was created.",
        { h3: "Support requests" },
        "Your name, email address, the topic, subject and message you send, and, if you escalate from Ask Tara, the last few messages of that conversation.",
        { h3: "Consent records" },
        "The legal document and version you accepted, the date and time, a salted one-way hash of your IP address, your browser's user-agent string, and either your account ID or a random identifier generated in your browser.",
        { h3: "Technical and security data" },
        "Salted hashes of IP addresses used for rate limiting, and short-lived server logs (request time, route, status code and error type) kept by our hosting provider. We do not log the content of your summaries.",
        { h3: "Data stored only on your device" },
        "Your theme preference, your Terms acceptance status, guest summary history and your Ask Tara conversation are kept in your browser's local or session storage. See the Cookie Policy.",
      ],
    },
    {
      id: "why",
      title: "4. Why we process it, and our legal basis",
      body: [
        "Under the DPDP Act we process personal data on the basis of your consent, which you give when you accept the Terms or create an account, and for certain legitimate uses permitted by section 7 of the Act, such as complying with law. We use personal data to:",
        {
          list: [
            "provide the service: fetch and summarise pages, save your history, and keep you signed in;",
            "answer your support requests and send you transactional emails such as ticket confirmations and account verification;",
            "keep Lumen secure: prevent abuse, enforce rate limits and investigate misuse;",
            "keep a record of which version of our Terms you accepted;",
            "meet our legal obligations.",
          ],
        },
        "We do not use your personal data for advertising, profiling or automated decisions that have legal or similarly significant effects on you.",
      ],
    },
    {
      id: "ai",
      title: "5. How AI processing works",
      body: [
        "To create a summary, our server sends the readable text of the web page you submitted, its URL and title, and the summary length you chose, to our AI provider. We do not include your name, email, account ID or IP address.",
        "Our primary AI provider is Groq, Inc. (United States). If it is unavailable, we may use Google's Gemini API (Google LLC). Ask Tara sends your question and the relevant Help Center articles to the same providers. These providers process the data under their API terms in order to return a response.",
        "Please don't submit URLs to pages that contain your own sensitive personal data, such as private documents shared by link.",
      ],
    },
    {
      id: "sharing",
      title: "6. Who we share data with",
      body: [
        "We share personal data only with service providers (Data Processors) that help us run Lumen, and only as needed for the purposes above:",
        {
          list: [
            "Supabase, Inc.: authentication and database hosting for accounts, saved summaries, tickets and consent records;",
            "Netlify, Inc.: website and server hosting;",
            "Groq, Inc. and Google LLC: AI processing of page text and Ask Tara questions, as described above;",
            "Google LLC (Gmail): delivery of support and confirmation emails.",
          ],
        },
        "We may also disclose data if required by law, a court order or a lawful request from a government authority, or to protect the rights, safety or property of users, the public or the operator.",
        "We do not sell or rent personal data.",
      ],
    },
    {
      id: "transfers",
      title: "7. International transfers",
      body: [
        "Some of our providers process data outside India, including in the United States and the European Union. We transfer personal data only to countries that are not restricted by the Central Government under section 16 of the DPDP Act, and we rely on our providers' contractual and security commitments.",
      ],
    },
    {
      id: "retention",
      title: "8. How long we keep data",
      body: [
        {
          list: [
            "Account data and saved summaries: until you delete them or your account.",
            "Support tickets: up to 24 months after the ticket is closed, then deleted.",
            "Consent records: for as long as your account or the related identifier exists, plus up to 3 years, so we can show which terms applied.",
            "Rate-limit records: automatically deleted after about 2 days.",
            "Hosting logs: kept by our hosting provider for a short period according to its own retention settings.",
          ],
        },
        "When you delete your account, we delete your profile and saved summaries straight away. Support tickets are unlinked from your account. Backups held by our providers are overwritten on their normal cycle.",
      ],
    },
    {
      id: "rights",
      title: "9. Your rights",
      body: [
        "Under the DPDP Act you have the right to:",
        {
          list: [
            "access a summary of the personal data we process about you and how we process it;",
            "correct, complete or update inaccurate or incomplete data;",
            "erase your personal data, unless we must keep it to comply with law;",
            "withdraw consent at any time, as easily as you gave it, by deleting your account or contacting us. Withdrawal doesn't affect processing that happened before it;",
            "nominate another person to exercise your rights in the event of your death or incapacity;",
            "have your grievance addressed by our Grievance Officer, and, if you are not satisfied, complain to the Data Protection Board of India.",
          ],
        },
        "You can download a copy of your data and delete your account yourself from the Account page. For anything else, use the support form with the topic \"Privacy and data\".",
      ],
    },
    {
      id: "children",
      title: "10. Children",
      body: [
        "Lumen is not directed at children. Under the DPDP Act, a child is anyone under 18. We do not knowingly process children's personal data without verifiable consent from a parent or lawful guardian, and we do not track, monitor behaviour or target advertising at children. If you believe a child has created an account without such consent, contact us and we will delete it.",
      ],
    },
    {
      id: "security",
      title: "11. Security",
      body: [
        "We use reasonable security safeguards, including encryption in transit (HTTPS), row-level security so each account can only access its own data, secret keys kept only on the server, strict content security policies, input validation, rate limiting and protections that stop Lumen from accessing private networks.",
        "No system is perfectly secure. If a personal data breach occurs, we will inform the Data Protection Board of India and affected users as required by the DPDP Act and its rules.",
      ],
    },
    {
      id: "changes",
      title: "12. Changes to this notice",
      body: [
        "We will update this notice when our practices change. The version number and effective date are shown at the top. If changes are significant, we will tell you in the app and, where required, ask for your consent again.",
      ],
    },
  ],
};
