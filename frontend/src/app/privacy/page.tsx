import Link from "next/link";
import { LegalBullets as Bullets, LegalMail, LegalP as P, LegalPage, LegalSection as Section } from "@/components/site/legal";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="Your documents are yours. We collect only what we need to run Paperwise, and we do not sell it."
      updated="October 2026"
    >
      <Section title="What we collect" first>
        <Bullets items={[
          ["Account details", "your email address and name when you sign up, or the same details from Google if you sign in with Google."],
          ["Your documents", "the files you upload, and the text we read from them."],
          ["Your conversations", "the questions you ask and the answers you receive."],
          ["Usage counts", "how many documents you have and how many questions you ask, so we can apply the limits of your plan."],
          ["Sign-in cookies", "small cookies that keep you signed in (see Cookies below)."],
        ]} />
        <P>We do not collect payment details. When Pro billing arrives, card details will be handled by Stripe, not by us.</P>
      </Section>

      <Section title="How we use it">
        <P>We use your information to run Paperwise for you: to store your files, find the passages that match a question, write an answer, and keep your history.</P>
        <P>We do not sell your data, and we do not share it with advertisers or use it for advertising or analytics. Your documents are only ever searched when you ask a question in your own account.</P>
        <P>
          To read your files and answer questions we send text to an AI service. What is sent, and when, is explained in{" "}
          <Link href="/legal/ai" className="underline underline-offset-4 transition hover:opacity-70">AI and your documents</Link>.
          We do not train or fine-tune our own models on your documents.
        </P>
      </Section>

      <Section title="Who we share it with">
        <P>We use a small number of service providers to run Paperwise. Each one receives only what it needs for its job:</P>
        <Bullets items={[
          ["Storage and database", "Supabase stores your uploaded files, your account details and your conversations."],
          ["AI service", "an AI provider receives the text of your documents, your questions and the matching passages, so that documents can be searched and questions answered."],
          ["Email", "an email delivery service sends welcome messages, sign-in links and password resets to your address."],
          ["Google", "if you choose Google sign-in, Google tells us your name and email address."],
          ["Hosting", "our hosting provider runs the servers that Paperwise runs on."],
        ]} />
        <P>We may also disclose information if the law requires it.</P>
      </Section>

      <Section title="How we protect it">
        <P>Your files are kept in private storage. They are not available at a public address, and the link that opens a file expires after a few minutes.</P>
        <P>Connections to Paperwise use HTTPS, and passwords are stored in a scrambled (hashed) form that we cannot read back. Our storage and database provider encrypts stored data. See <Link href="/security" className="underline underline-offset-4 transition hover:opacity-70">Security</Link> for the details.</P>
      </Section>

      <Section title="How long we keep it">
        <Bullets items={[
          ["Documents", "stay until you delete them or delete your account. Deleting a document removes the file from storage and the text we read from it, straight away."],
          ["Conversations", "Free accounts can open the last 7 days of history, and older conversations stay stored until you delete them. Pro accounts can open their full history."],
          ["Your account", "when you delete your account we remove your documents, stored files, conversations and account details. Copies in provider backups are gone within 30 days."],
        ]} />
      </Section>

      <Section title="Your rights">
        <Bullets items={[
          ["See it", "everything you have uploaded and asked is in your workspace."],
          ["Delete it", "delete any document or conversation at any time, or your whole account from Settings → Profile → Danger Zone."],
          ["Correct it", "update your name and email from Settings → Profile."],
          ["Export it", <>email <LegalMail /> and we will send you a copy of your data.</>],
        ]} />
        <P>If you are in the EU or UK you also have the rights set out in data protection law, including erasure and data portability. Email us to use them.</P>
      </Section>

      <Section title="Cookies">
        <P>We use two cookies, both only to keep you signed in:</P>
        <Bullets items={[
          [<code key="a" className="rounded bg-ink/[0.07] px-1.5 py-0.5 text-xs text-ink">paperwise_access_token</code>, "lasts about an hour and proves who you are on each request."],
          [<code key="r" className="rounded bg-ink/[0.07] px-1.5 py-0.5 text-xs text-ink">paperwise_refresh_token</code>, "lasts up to 7 days and signs you back in without asking again."],
        ]} />
        <P>Page scripts cannot read these cookies. We do not use cookies for advertising or tracking.</P>
      </Section>

      <Section title="Changes to this policy">
        <P>If we change this policy in a way that matters, we will email you or show a notice in the app before the change takes effect. The date at the top shows when it was last updated.</P>
      </Section>

      <Section title="Contact">
        <P>Questions about this policy? Email <LegalMail />. We aim to reply within 2 business days.</P>
      </Section>
    </LegalPage>
  );
}
