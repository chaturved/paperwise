import { AudiencePage, audienceMetadata } from "@/components/site/audience-page";
import { CitedRows } from "@/components/site/product-preview";

export const metadata = audienceMetadata(
  "Paperwise for freelancers",
  "Read a client contract, brief or invoice policy by asking it questions, and see the passage behind every answer.",
);

export default function FreelancersPage() {
  return (
    <AudiencePage
      content={{
        crumb: "For freelancers",
        title: "Read the contract before you sign it",
        intro:
          "Ask a client agreement, a brief or an invoice policy a plain question and see the passage that answers it.",
        statement: {
          lead: "Know what you are agreeing to.",
          rest: "Pull the payment terms, the notice period or the ownership clause out of a long agreement, and read the exact words before you reply.",
        },
        split: {
          title: "Every answer points to the clause",
          description:
            "Paperwise shows the passages behind a reply, so you can check the wording instead of trusting a summary.",
          tone: "paint",
          card: (
            <CitedRows
              title="Client agreement"
              rows={[
                { text: "Payment due within 30 days of invoice", source: "client-agreement.pdf" },
                { text: "Late fee of 2 percent a month", source: "client-agreement.pdf" },
                { text: "Notice needed to end the agreement", source: "client-agreement.pdf" },
              ]}
            />
          ),
          rows: [
            {
              title: "Payment terms and deadlines",
              text: "Find when you get paid, what late payment costs and which dates matter.",
            },
            { title: "What you own", text: "Check who owns the finished work and what rights the client keeps." },
            { title: "Scope and changes", text: "See what is included and what the agreement says about extra work." },
            { title: "Ending the work", text: "Find the notice period and any fee for stopping early." },
          ],
        },
        questions: [
          "When do I get paid?",
          "What happens if the client pays late?",
          "Who owns the work when it is finished?",
          "How much notice do we each need to give?",
          "Is there anything about revisions or extra work?",
        ],
        cta: "Ask your next contract a question",
      }}
    />
  );
}
