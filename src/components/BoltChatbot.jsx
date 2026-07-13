import { useMemo, useState } from "react";
import { Bot, Send, X } from "lucide-react";

const quickReplies = [
  "How to connect wallet?",
  "How to cast vote?",
  "I forgot password",
  "Contact helpdesk"
];

export default function BoltChatbot({ authSession }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "BOLT",
      text: "Hello, I am BOLT. I can help with login, wallet connection, voting steps, and helpdesk support."
    }
  ]);

  const helpdesk = useMemo(
    () => ({
      phone: "1800-202-1950",
      email: "helpdesk@blockvote.local"
    }),
    []
  );

  function answerFor(text) {
    const query = text.toLowerCase();

    if (query.includes("wallet") || query.includes("metamask")) {
      return "Click Connect Wallet, approve MetaMask, and stay on the configured network shown in the top bar.";
    }

    if (query.includes("vote") || query.includes("cast")) {
      return "Open Voter Panel, select a candidate, click Cast Secure Vote, then confirm the blockchain transaction in MetaMask.";
    }

    if (query.includes("forgot") || query.includes("password")) {
      return "Use Forgot Password on the login screen. For this academic demo, the recovery notice shows the saved demo password.";
    }

    if (query.includes("help") || query.includes("contact")) {
      return `Helpdesk is available at ${helpdesk.phone} or ${helpdesk.email}.`;
    }

    if (authSession?.role === "admin") {
      return "Admin tip: add candidates and register voters before starting the election.";
    }

    return "Voter tip: keep your login ID ready, connect the correct wallet, and vote before the election closes.";
  }

  function sendMessage(text = message) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { sender: "You", text: trimmed },
      { sender: "BOLT", text: answerFor(trimmed) }
    ]);
    setMessage("");
  }

  return (
    <>
      <button
        className="focus-ring fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-white shadow-2xl"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Bot size={20} />
        BOLT
      </button>

      {open ? (
        <section className="fixed bottom-20 right-5 z-40 grid w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div>
              <strong>BOLT Helpdesk</strong>
              <p className="text-xs text-slate-300">Online voting assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </header>

          <div className="grid max-h-80 gap-3 overflow-y-auto p-4">
            {messages.map((item, index) => (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  item.sender === "BOLT"
                    ? "bg-slate-100 text-slate-800"
                    : "ml-auto bg-brand text-white"
                }`}
                key={`${item.sender}-${index}`}
              >
                <strong className="block text-xs">{item.sender}</strong>
                {item.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line p-3">
            {quickReplies.map((reply) => (
              <button
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-slate-700"
                key={reply}
                type="button"
                onClick={() => sendMessage(reply)}
              >
                {reply}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              className="focus-ring min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
              placeholder="Ask BOLT..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button className="rounded-lg bg-brand px-3 text-white" type="submit">
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
