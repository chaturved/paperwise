import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalBullets as Bullets,
  LegalMail,
  LegalP as P,
  LegalPage,
  LegalSection as Section,
} from "@/components/site/legal";

export const metadata: Metadata = {
  title: "AI and your documents — Paperwise",
  description: "What is sent to the AI service when you upload a file or ask a question.",
};

export default function AiPolicyPage() {
  return (
    <LegalPage
      title="AI and your documents"
      summary="What is sent to the AI service when you upload a file or ask a question, and what is not."
      updated="October 2026"
    >
      <Section title="When you upload a file" first>
        <P>
          Paperwise reads the text in your file and splits it into short passages. Those passages are sent to an AI
          service, which turns each one into a set of numbers that lets Paperwise find it again later. The passages and
          their numbers are stored in your account.
        </P>
      </Section>

      <Section title="When you ask a question">
        <Bullets
          items={[
            "Your question is turned into numbers in the same way, and Paperwise finds the best-matching passages in your own documents, up to five.",
            "Your question and those passages are sent to an AI model, which writes the answer.",
            "A short second request uses the same passages to write the title and labels shown above the answer.",
          ]}
        />
        <P>Only your own documents are searched. Nothing from another customer is ever used to answer you.</P>
      </Section>

      <Section title="What we do not do">
        <Bullets
          items={[
            "We do not train or fine-tune our own models on your documents.",
            "We do not sell your documents or use them for advertising.",
            "We do not send your whole library with a question, only the few passages that match it.",
          ]}
        />
        <P>
          The AI service processes these requests on our behalf. Its own terms govern how it handles them, and we only
          send what is described on this page.
        </P>
      </Section>

      <Section title="Checking an answer">
        <P>
          Paperwise gives the model numbered passages and asks it to cite them. A citation only appears in the answer if
          its number matches a real passage, and for PDFs you can open the cited page with the passage highlighted. If
          nothing relevant is found, Paperwise says so, and it tells the model to say so rather than guess.
        </P>
        <P>AI can still misread a passage or leave something out, so check the source for anything that matters.</P>
      </Section>

      <Section title="Not professional advice">
        <P>
          Paperwise is a tool for reading your documents faster. It is not a lawyer, accountant or other professional,
          and its answers are not legal, financial or professional advice.
        </P>
      </Section>

      <Section title="More information">
        <P>
          See the{" "}
          <Link href="/privacy" className="underline underline-offset-4 transition hover:opacity-70">
            Privacy Policy
          </Link>{" "}
          for how long we keep your data and how to delete it, or email <LegalMail />.
        </P>
      </Section>
    </LegalPage>
  );
}
