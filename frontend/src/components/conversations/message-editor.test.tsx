import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageEditor } from "./message-editor";

afterEach(cleanup);

const setup = () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<MessageEditor initial="What is the rent?" onSave={onSave} onCancel={onCancel} />);
  const box = screen.getByLabelText("Edit your message") as HTMLTextAreaElement;
  const save = screen.getByRole("button", { name: "Save and resend" }) as HTMLButtonElement;
  return { onSave, onCancel, box, save };
};

describe("MessageEditor", () => {
  it("starts with the original text and nothing to save", () => {
    const { box, save } = setup();

    expect(box.value).toBe("What is the rent?");
    expect(save.disabled).toBe(true);
  });

  it("saves the edited text, trimmed", () => {
    const { box, save, onSave } = setup();

    fireEvent.change(box, { target: { value: "  What is the monthly rent?  " } });
    fireEvent.click(save);

    expect(onSave).toHaveBeenCalledWith("What is the monthly rent?");
  });

  it("cannot save an empty message or one that only changes the spacing", () => {
    const { box, save } = setup();

    fireEvent.change(box, { target: { value: "   " } });
    expect(save.disabled).toBe(true);

    fireEvent.change(box, { target: { value: "What is the rent?  " } });
    expect(save.disabled).toBe(true);
  });

  it("saves with Ctrl+Enter and cancels with Escape", () => {
    const { box, onSave, onCancel } = setup();

    fireEvent.change(box, { target: { value: "Another question" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(box, { key: "Escape" });

    expect(onSave).toHaveBeenCalledWith("Another question");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not save with Ctrl+Enter when nothing changed", () => {
    const { box, onSave } = setup();

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });
});
