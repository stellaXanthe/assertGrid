"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  currentContext?: any;
}

export function AiAssistant({ currentContext }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to **AssertGrid AI**! 🚀\n\nI can help you build web automation flows, configure API tests, or answer any questions about using AssertGrid.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "How do I automate a login page?",
    "How to extract variables from API responses?",
    "What browser actions does AssertGrid support?",
  ];

  async function sendMessage(textToSend: string) {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: "user", content: textToSend.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: currentContext,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Failed to get response."}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Network error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-6 shadow-xl flex items-center gap-2 font-medium"
        >
          <span>✨ AssertGrid AI Assistant</span>
        </Button>
      ) : (
        <Card className="w-80 md:w-96 h-[520px] shadow-2xl flex flex-col bg-white border border-gray-200">
          <CardHeader className="bg-blue-600 text-white py-3 px-4 flex flex-row justify-between items-center rounded-t-lg">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>🤖</span> AssertGrid AI Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 h-7 w-7 p-0"
            >
              ✕
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  m.role === "user"
                    ? "bg-blue-50 text-blue-900 ml-6 border border-blue-100"
                    : "bg-gray-100 text-gray-800 mr-6 border border-gray-200"
                }`}
              >
                <div className="font-bold mb-1 text-[10px] uppercase text-gray-500">
                  {m.role === "user" ? "You" : "AssertGrid AI"}
                </div>
                <div className="whitespace-pre-wrap font-sans leading-relaxed">
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="bg-gray-50 p-2.5 rounded text-gray-400 italic">
                AssertGrid AI is analyzing your request...
              </div>
            )}

            {/* Quick Suggestions */}
            {messages.length <= 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">
                  Suggested Questions
                </p>
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left p-2 rounded bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 border border-blue-100 text-[11px] transition-colors"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            )}
          </CardContent>

          <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-gray-50">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to use AssertGrid..."
              className="text-xs h-9 bg-white"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="sm"
              className="bg-blue-600 text-xs h-9 px-4"
            >
              Send
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}