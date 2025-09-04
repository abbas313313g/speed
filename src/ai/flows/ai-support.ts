
'use server';

/**
 * @fileOverview An AI support agent that can answer user questions.
 *
 * - askAiSupport - A function that handles the AI support process.
 * - AiSupportInput - The input type for the askAiSupport function.
 * - AiSupportOutput - The return type for the askAiSupport function.
 */

import {ai} from '@/ai/genkit';
import { AiSupportInputSchema, AiSupportOutputSchema, type AiSupportInput, type AiSupportOutput } from '@/lib/types';


const prompt = ai.definePrompt({
    name: 'aiSupportPrompt',
    input: { schema: AiSupportInputSchema },
    output: { schema: AiSupportOutputSchema },
    prompt: `You are Speedy, a friendly and helpful AI support agent for the "Speed Shop" delivery app.
Your goal is to answer user questions and solve their problems.
If you don't know the answer or you are unable to help, politely ask them to request help from the human support team by pressing the button.

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
