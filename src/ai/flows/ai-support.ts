'use server';

/**
 * @fileOverview AI-powered customer support agent for the Speed Shop app.
 *
 * - askAiSupport - A function that allows users to ask questions about the app and receive helpful answers.
 * - AiSupportInput - The input type for the askAiSupport function.
 * - AiSupportOutput - The return type for the askAiSupport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSupportInputSchema = z.object({
  question: z.string().describe('The user\u0027s question about the Speed Shop app.'),
});
export type AiSupportInput = z.infer<typeof AiSupportInputSchema>;

const AiSupportOutputSchema = z.object({
  answer: z.string().describe('The AI\u0027s answer to the user\u0027s question.'),
});
export type AiSupportOutput = z.infer<typeof AiSupportOutputSchema>;

export async function askAiSupport(input: AiSupportInput): Promise<AiSupportOutput> {
  return aiSupportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSupportPrompt',
  input: {schema: AiSupportInputSchema},
  output: {schema: AiSupportOutputSchema},
  prompt: `You are a customer support agent for the Speed Shop app. Your name is Speedy.

  You should answer questions about the app in a helpful and informative way, as if you are a human agent.

  If the user asks about your name or role, introduce yourself as Speedy, the Speed Shop support agent.

  If asked about how the app works, explain that Speed Shop is a delivery app that allows users to order from multiple restaurants and shops.

  Now answer the following question:

  {{question}}`,
});

const aiSupportFlow = ai.defineFlow(
  {
    name: 'aiSupportFlow',
    inputSchema: AiSupportInputSchema,
    outputSchema: AiSupportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
