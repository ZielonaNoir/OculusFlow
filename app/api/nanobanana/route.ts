import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Extract the `messages` from the body of the request
    const { messages } = await req.json();

    // Call the language model
    const result = streamText({
      model: google('gemini-2.5-flash'), // NanoBanana equivalent
      messages,
      // You can add system prompts or other configurations here
      // system: 'You are a helpful assistant.',
    });

    // Respond with the stream
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in NanoBanana proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request with Google API' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
