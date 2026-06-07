"use client";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      // This is what catches the "service not running" type errors
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.reply },
      ]);

    } catch (err: any) {
      setError(err.message || "Could not reach assistant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-1">AI Assistant</h1>
      <p className="text-gray-500 text-sm mb-6">
        Ask anything about your career — I know who you are.
      </p>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto border rounded-xl p-4 mb-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <p className="text-lg">👋 Hello! I'm your CareerPilot.</p>
            <p className="text-sm mt-2">Try asking: "What skills am I missing for a Google internship?"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400 shadow-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">
          ⚠️ {error}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask me anything about your career..."
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}