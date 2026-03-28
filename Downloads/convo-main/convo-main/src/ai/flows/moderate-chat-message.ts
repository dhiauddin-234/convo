'use server';

/**
 * @fileOverview This file defines a Genkit flow for moderating chat message content.
 *
 * The flow analyzes the input text and flags it if it violates platform guidelines.
 * It exports the following:
 * - `moderateChatMessage`: Function to moderate chat messages.
 * - `ModerateChatMessageInput`: Input type for the moderation function.
 * - `ModerateChatMessageOutput`: Output type for the moderation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateChatMessageInputSchema = z.object({
  text: z.string().describe('The chat message text to moderate.'),
});
export type ModerateChatMessageInput = z.infer<typeof ModerateChatMessageInputSchema>;

const ModerateChatMessageOutputSchema = z.object({
  isHarmful: z.boolean().describe('Whether the message violates platform guidelines.'),
  reason: z.string().describe('The reason why the message was flagged as harmful, if applicable.'),
});
export type ModerateChatMessageOutput = z.infer<typeof ModerateChatMessageOutputSchema>;

export async function moderateChatMessage(input: ModerateChatMessageInput): Promise<ModerateChatMessageOutput> {
  return moderateChatMessageFlow(input);
}

const moderateChatMessagePrompt = ai.definePrompt({
  name: 'moderateChatMessagePrompt',
  input: {schema: ModerateChatMessageInputSchema},
  output: {schema: ModerateChatMessageOutputSchema},
  prompt: `You are an AI assistant specializing in moderating chat message content.

  Your task is to analyze the provided text and determine if it violates platform guidelines.

  Guidelines:
  - No hate speech or discrimination.
  - No harassment or bullying.
  - No threats or violence.
  - No sexually explicit content.
  - No illegal activities.

  Based on these guidelines, determine if the following message is harmful. Return a boolean value in the isHarmful field. If the message is flagged as harmful, provide a reason in the reason field. Otherwise, the reason should be 'No violation'.

  Text: {{{text}}}`,
});

const moderateChatMessageFlow = ai.defineFlow(
  {
    name: 'moderateChatMessageFlow',
    inputSchema: ModerateChatMessageInputSchema,
    outputSchema: ModerateChatMessageOutputSchema,
  },
  async input => {
    const {output} = await moderateChatMessagePrompt(input);
    return output!;
  }
);
