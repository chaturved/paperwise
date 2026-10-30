import { AudiencePage, audienceMetadata } from "@/components/site/audience-page";
import { CitedRows } from "@/components/site/product-preview";

export const metadata = audienceMetadata("Paperwise for researchers and students", "Ask a paper, a textbook or a manual a question and see the passage and page it came from.");

export default function ResearchersAndStudentsPage() {
  return (
    <AudiencePage
      content={{
        crumb: "For researchers and students",
        title: "Ask your reading list a question",
        intro: "Ask a paper, a textbook or a manual a question and see the passage and page it came from.",
        statement: { lead: "Get to the passage faster.", rest: "Pull a method, a figure or a definition out of a long paper, then open the page and read it in context before you rely on it." },
        split: {
          title: "Every answer shows its passage and page",
          description: "Read the original wording, not just a summary of it. For PDFs, the page opens with the passage highlighted.",
          tone: "paint",
          card: (
            <CitedRows title="Research paper" rows={[
              { text: "How the sample was chosen", source: "study.pdf" },
              { text: "The main finding and its limits", source: "study.pdf" },
              { text: "How the authors define the key term", source: "study.pdf" },
            ]} />
          ),
          rows: [
            { title: "Methods and results", text: "Find how a study was run and what it found, without rereading the whole paper." },
            { title: "Definitions and concepts", text: "Look up a term the way the author defines it." },
            { title: "Textbooks and manuals", text: "Ask a chapter or a manual a question instead of paging through it." },
            { title: "Your reading list", text: "Add each paper once, then choose which one to ask about. Free holds five at a time." },
          ],
        },
        questions: [
          "What method did the authors use?",
          "How large was the sample?",
          "What are the main limitations?",
          "How does the author define this term?",
          "What does the textbook say about this topic?",
        ],
        cta: "Ask your next paper a question",
      }}
    />
  );
}
