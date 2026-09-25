import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import { MessageCircle, X, RotateCcw } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

const KEY = "sa-streetwear-chat";
const SUGGESTIONS = ["Black hoodie under R300", "Sneakers size 8", "Bucket hats", "Something for a braai"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    try {
      setInitial(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      setInitial([]);
    }
  }, []);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg"
        >
          <MessageCircle className="h-5 w-5" /> Ask the Stylist
        </button>
      )}
      {open && initial && <ChatPanel initial={initial} onClose={() => setOpen(false)} onReset={() => { localStorage.removeItem(KEY); setInitial([]); }} key={initial.length === 0 ? "fresh" : "saved"} />}
    </>
  );
}

function ChatPanel({ initial, onClose, onReset }: { initial: UIMessage[]; onClose: () => void; onReset: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { messages, sendMessage, status, setMessages } = useChat({
    id: "sa-streetwear",
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => setError(e.message || "Something went wrong"),
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "ready" || status === "error") localStorage.setItem(KEY, JSON.stringify(messages));
    wrapRef.current?.querySelector("textarea")?.focus();
  }, [messages, status]);

  const send = (text: string) => {
    if (!text.trim() || status === "submitted" || status === "streaming") return;
    setError(null);
    void sendMessage({ text: text.trim() });
  };

  return (
    <div ref={wrapRef} className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col border-2 border-foreground bg-background shadow-2xl sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[400px] sm:rounded">
      <div className="flex items-center gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background font-display text-sm text-foreground">SA</div>
        <div className="flex-1">
          <p className="font-display leading-none">Mzansi Stylist</p>
          <p className="text-xs opacity-70">Find clothes & shoes from local vendors</p>
        </div>
        <button aria-label="New conversation" onClick={() => { setMessages([]); onReset(); }} className="rounded p-1.5 hover:bg-background/20"><RotateCcw className="h-4 w-4" /></button>
        <button aria-label="Close" onClick={onClose} className="rounded p-1.5 hover:bg-background/20"><X className="h-5 w-5" /></button>
      </div>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <p className="font-display text-xl">Sho! What are you looking for?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:border-foreground">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((part, i) => {
                  if (part.type === "text")
                    return m.role === "user"
                      ? <p key={i} className="whitespace-pre-wrap text-sm text-primary-foreground">{part.text}</p>
                      : <MessageResponse key={i}>{part.text}</MessageResponse>;
                  if (part.type.startsWith("tool-") && "state" in part) {
                    const tp = part as ToolUIPart;
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader type={tp.type} state={tp.state} title="Searching listings" />
                        <ToolContent>
                          <ToolInput input={tp.input} />
                          <ToolOutput output={tp.output} errorText={tp.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer className="text-sm">Looking through the stalls…</Shimmer>}
          {error && <p className="rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
          <PromptInputTextarea placeholder="e.g. white sneakers under R500" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={status === "submitted" || status === "streaming"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
