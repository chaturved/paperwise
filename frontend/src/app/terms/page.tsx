import { LegalBullets as Bullets, LegalP as P, LegalPage, LegalSection as Section } from "@/components/site/legal";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms govern your access to and use of Paperwise. Please read them carefully."
      updated="May 2026"
    >
        <Section title="Acceptance of terms" first>
          <P>By creating a Paperwise account or using the Paperwise service, you agree to these Terms of Service. If you do not agree, do not use the service.</P>
          <P>These terms may be updated from time to time. Continued use after changes means you accept the new terms. We&apos;ll notify you of material changes by email or by displaying a notice in the app.</P>
        </Section>

        <Section title="Acceptable use">
          <P>You may use Paperwise to upload documents and ask questions about them for lawful purposes. You agree not to:</P>
          <Bullets items={[
            "Upload content that is illegal, abusive, harassing, or infringes third-party intellectual property rights.",
            "Attempt to reverse-engineer, scrape, or systematically extract content from the service.",
            "Share your account credentials with others.",
            "Use the service to train AI models or build competing products.",
            "Circumvent usage limits through multiple accounts or automated requests.",
            "Upload malware or code designed to harm Paperwise systems or other users.",
          ]} />
        </Section>

        <Section title="Free tier limits">
          <P>The Free plan includes:</P>
          <Bullets items={[
            "5 documents stored simultaneously",
            "20 AI queries in a rolling 24-hour window",
            "10 MB maximum file size",
            "PDF, DOCX, TXT, and Markdown file formats",
            "7-day conversation history retention",
          ]} />
          <P>We reserve the right to adjust free tier limits with reasonable notice. If you exceed limits, queries will be blocked until the next reset or until you upgrade.</P>
        </Section>

        <Section title="Your content">
          <P>You own your documents. By uploading content to Paperwise, you grant us a limited, non-exclusive license to store, process, and index your content for the sole purpose of providing the service to you.</P>
          <P>We do not claim ownership of your documents. We do not use your documents to train AI models. When you delete content or your account, we remove it from our systems as described in our Privacy Policy.</P>
        </Section>

        <Section title="Prohibited content">
          <P>You must not upload or process the following types of content:</P>
          <Bullets items={[
            "Content that violates any applicable law or regulation",
            "Child sexual abuse material (CSAM) — violations will be reported to relevant authorities",
            "Documents containing another person's private information without their consent",
            "Copyrighted material you do not have rights to process",
            "Content designed to deceive, defraud, or harm others",
          ]} />
        </Section>

        <Section title="Account termination">
          <P>You may delete your account at any time from Settings → Profile → Danger Zone. All your data will be permanently deleted within 30 days.</P>
          <P>We may suspend or terminate accounts that violate these terms, with or without notice depending on the severity of the violation. Severe violations (illegal content, fraud, abuse) may result in immediate termination without refund.</P>
          <P>If your account is terminated erroneously, contact <a href="mailto:hello@paperwise.ai" className="underline underline-offset-4 hover:opacity-70 transition">hello@paperwise.ai</a> within 14 days.</P>
        </Section>

        <Section title="Limitation of liability">
          <P>Paperwise is provided &quot;as is&quot; without warranty of any kind. We make no guarantees about uptime, accuracy of AI-generated responses, or fitness for any particular purpose. Always verify important information from primary sources.</P>
          <P>To the maximum extent permitted by law, Paperwise and its operators shall not be liable for indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</P>
        </Section>

        <Section title="Governing law">
          <P>These terms are governed by the laws of the jurisdiction in which Paperwise is operated, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration, except where prohibited by law.</P>
          <P>If any provision of these terms is found unenforceable, the remaining provisions remain in full effect.</P>
        </Section>

        <Section title="Contact">
          <P>Questions about these terms? Email <a href="mailto:hello@paperwise.ai" className="underline underline-offset-4 hover:opacity-70 transition">hello@paperwise.ai</a> — we aim to respond within 2 business days.</P>
        </Section>

    </LegalPage>
  );
}
