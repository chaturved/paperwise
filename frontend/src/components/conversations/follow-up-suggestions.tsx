import { Button } from "@/components/ui/button";

interface Props {
  questions: string[];
  onPick: (question: string) => void;
}

export function FollowUpSuggestions({ questions, onPick }: Props) {
  if (questions.length === 0) return null;

  return (
    <div className="msg-in mb-3 flex flex-wrap gap-2" role="group" aria-label="Suggested follow-up questions">
      {questions.map((question) => (
        <Button key={question} type="button" variant="secondary" size="sm" onClick={() => onPick(question)} className="h-auto max-w-full whitespace-normal py-1.5 text-left">
          {question}
        </Button>
      ))}
    </div>
  );
}
