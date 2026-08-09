import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
    const {
      messages,
      projectId,
      context,
    }: {
      messages: UIMessage[];
      projectId?: string;
      context?: unknown;
    } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY is not configured on the server.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are the AssertGrid Agent.
You help users diagnose issues, inspect logs, and build or run automated test suites.
${projectId ? `Current Project ID: ${projectId}` : "There is no active project selected right now. If the user asks you to create a test case, tell them to open a specific project workspace first — do not attempt to call createTestCase without a project."}
${context ? `Current Context: ${JSON.stringify(context)}` : ""}`;

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        createTestCase: tool({
          description:
            "Create a new automated test case inside Supabase. Only call this if a project is currently active.",
          inputSchema: z.object({
            title: z.string().describe("Title or brief name of the test case"),
            steps: z
              .array(
                z.object({
                  name: z.string().describe("Step display name"),
                  action: z
                    .string()
                    .describe(
                      "Action type, e.g., 'click', 'navigate', 'type'"
                    ),
                  target: z
                    .string()
                    .optional()
                    .describe("Selector, element ID, or target URL"),
                })
              )
              .describe("Ordered list of execution steps"),
          }),
          execute: async ({ title, steps }) => {
            if (!projectId) {
              throw new Error(
                "No project is currently open. Please open a project workspace before asking me to create a test case."
              );
            }

            const supabase = await createClient();

            const { data, error } = await supabase
              .from("test_cases")
              .insert({ project_id: projectId, title, steps })
              .select();

            if (error) {
              throw new Error(`Failed to create test case: ${error.message}`);
            }

            const createdId = data?.[0]?.id;

            return {
              success: true,
              testCaseId: typeof createdId === "string" ? createdId : null,
              message: `Test case "${title}" successfully created.`,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      // Expose real error messages to the client instead of the generic default.
      onError: (error) => {
        if (error instanceof Error) return error.message;
        return "An unexpected error occurred.";
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to process agent request";
    console.error("Error in /api/agent:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}