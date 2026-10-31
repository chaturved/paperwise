export interface ContractPrompt {
  title: string;
  detail: string;
  question: string;
}

export const CONTRACT_PROMPTS: ContractPrompt[] = [
  {
    title: "Payment terms",
    detail: "Amounts, due dates and late fees",
    question: "What are the payment terms: amounts, due dates, late fees and how payment is made?",
  },
  {
    title: "Ending the agreement",
    detail: "Notice periods and termination",
    question: "How can either side end this agreement, and what notice is required?",
  },
  {
    title: "Who owns the work",
    detail: "Ownership, licences and limits",
    question:
      "Who owns the work or intellectual property, and are there any licences or restrictions on how it can be used?",
  },
  {
    title: "Liability",
    detail: "Limits and who covers costs",
    question:
      "What limits on liability or indemnities does the agreement set, and who has to cover costs if something goes wrong?",
  },
  {
    title: "Renewal and deadlines",
    detail: "Term, renewal and key dates",
    question: "What is the term, does it renew automatically, and what are the key dates and deadlines?",
  },
  {
    title: "Obligations",
    detail: "What each side must do",
    question: "What must each party do under this agreement, and by when?",
  },
];
