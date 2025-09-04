
'use server';

/**
 * @fileOverview An AI support agent that can answer user questions.
 *
 * - askAiSupport - A function that handles the AI support process.
 * - AiSupportInput - The input type for the askAiSupport function.
 * - AiSupportOutput - The return type for the askAiSupport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Message } from '@/lib/types';


export const AiSupportInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'admin']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type AiSupportInput = z.infer<typeof AiSupportInputSchema>;


export const AiSupportOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
export type AiSupportOutput = z.infer<typeof AiSupportOutputSchema>;


const prompt = ai.definePrompt({
    name: 'aiSupportPrompt',
    input: { schema: AiSupportInputSchema },
    output: { schema: AiSupportOutputSchema },
    prompt: `You are Speedy, a friendly and helpful AI support agent for the "Speed Shop" delivery app.
Your goal is to answer user questions and solve their problems.
If the user's question is about something you don't know or you are unable to help, politely ask them to request help from the human support team.

Here is the conversation history:
{{#each history}}
- {{role}}: {{content}}
{{/each}}

Based on the history, provide a helpful response to the user's latest message.`,
});


const aiSupportFlow = ai.defineFlow(
  {
    name: 'aiSupportFlow',
    inputSchema: AiSupportInputSchema,
    outputSchema: AiSupportOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function askAiSupport(
  input: AiSupportInput
): Promise<AiSupportOutput> {
  return aiSupportFlow(input);
}
