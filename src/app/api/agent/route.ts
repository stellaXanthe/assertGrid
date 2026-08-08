import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, projectId, context } = await req.json();

    const systemPrompt = `You are the AssertGrid Agent.
You help users diagnose issues, inspect logs, and build or run automated test suites.
${projectId ? `Current Project ID: ${projectId}` : ""}
${context ? `Current Context: ${JSON.stringify(context)}` : ""}`;

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages,
      tools: {
        createTestCase: tool({
          description: "Create a new automated test case inside Supabase.",
          inputSchema: z.object({
            title: z.string().describe("Title or brief name of the test case"),
            steps: z.array(
              z.object({
                name: z.string().describe("Step display name"),
                action: z.string().describe("Action type, e.g., 'click', 'navigate', 'type'"),
                target: z.string().optional().describe("Selector, element ID, or target URL"),
              })
            ).describe("Ordered list of execution steps"),
          }),
          execute: async ({ title, steps }) => {
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

    return result.toTextStreamResponse();
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