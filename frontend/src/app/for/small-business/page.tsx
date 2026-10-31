import { AudiencePage, audienceMetadata } from "@/components/site/audience-page";
import { CitedRows } from "@/components/site/product-preview";

export const metadata = audienceMetadata(
  "Paperwise for small businesses",
  "Keep leases, policies and supplier terms in one library and ask them questions in plain language.",
);

export default function SmallBusinessPage() {
  return (
    <AudiencePage
      content={{
        crumb: "For small businesses",
        title: "Find the answer in your paperwork",
        intro: "Keep your leases, policies and supplier terms in one library and ask them questions in plain language.",
        statement: {
          lead: "Stop searching through folders.",
          rest: "Ask what the lease says about renewal, what the handbook says about leave, or what a supplier agreed on delivery, and see the exact passage.",
        },
        split: {
          title: "The passage comes with every answer",
          description: "Read the original wording before you act on it, or open the page it came from.",
          tone: "warm",
          card: (
            <CitedRows
              title="Employee handbook"
              rows={[
                { text: "How annual leave builds up", source: "handbook.pdf" },
                { text: "Who to tell about sick leave", source: "handbook.pdf" },
                { text: "Deadline for expense claims", source: "handbook.pdf" },
              ]}
            />
          ),
          rows: [
            { title: "Policies and handbooks", text: "Answer a staff question without rereading the whole handbook." },
            { title: "Leases and supplier terms", text: "Check renewal, notice and delivery terms before you act." },
            { title: "Insurance and compliance papers", text: "Find what a policy covers, and what it leaves out." },
            { title: "One library", text: "Add each document once, then choose which one to ask about." },
          ],
        },
        questions: [
          "What does the lease say about renewal?",
          "How much leave does the handbook give?",
          "What did the supplier agree on delivery times?",
          "What does the insurance policy not cover?",
          "Who do we notify if something goes wrong?",
        ],
        cta: "Ask your first business document a question",
      }}
    />
  );
}
