"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AiAssistantProps {
  projectId?: string;
  currentContext?: any;
}

export function AiAssistant({ projectId, currentContext }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent",
      body: {
        projectId,
        context: currentContext,
      },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const quickPrompts = [
    "How do I automate a login page?",
    "How to extract variables from API responses?",
    "What browser actions does AssertGrid support?",
  ];

  const handleQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: promptText }],
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input.trim() }],
    });
    setInput("");
  };

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
            {messages.map((m) => (
              <div
                key={m.id}
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
                  {m.parts?.map((part: any, index: number) => {
                    if (part.type === "text") {
                      return <span key={index}>{part.text}</span>;
                    }

                    // v5 UI message stream tool parts are named "tool-<toolName>"
                    if (part.type === "tool-createTestCase") {
                      const isDone =
                        part.state === "output-available" ||
                        part.state === "output-error";

                      return (
                        <div
                          key={part.toolCallId || index}
                          className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono"
                        >
                          {!isDone ? (
                            <div className="flex items-center gap-2 text-amber-600">
                              <span className="animate-spin">⚙️</span>
                              Creating test case in Supabase...
                            </div>
                          ) : part.state === "output-error" ? (
                            <div className="text-red-600">
                              ✕ Failed to create test case:{" "}
                              {String(part.errorText)}
                            </div>
                          ) : (
                            <div className="text-emerald-600">
                              ✓ Test Case Created! (ID:{" "}
                              {part.output?.testCaseId})
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-[11px]">
                Error: {error.message}
              </div>
            )}

            {isLoading && (
              <div className="bg-gray-50 p-2.5 rounded text-gray-400 italic">
                AssertGrid AI is thinking...
              </div>
            )}

            {messages.length === 0 && !isLoading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">
                  Suggested Questions
                </p>
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="w-full text-left p-2 rounded bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 border border-blue-100 text-[11px] transition-colors"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            )}
          </CardContent>

          <form
            onSubmit={onSubmit}
            className="p-3 border-t flex gap-2 bg-gray-50"
          >
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to use AssertGrid..."
              className="text-xs h-9 bg-white"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
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