const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

type OpenAIContentItem = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentItem[];
};

type OpenAIError = {
  message?: string;
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: OpenAIError;
};

type StructuredJsonRequest = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

function extractOutputText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text' && typeof item.text === 'string')
    ?.text;

  if (text && text.trim().length > 0) {
    return text;
  }

  throw new Error(payload.error?.message ?? 'OpenAI API returned no text output.');
}

export async function fetchStructuredJson<T>({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  schemaName,
  schema,
}: StructuredJsonRequest): Promise<T> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      reasoning: {
        effort: 'none',
      },
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI API request failed with ${response.status}.`);
  }

  return JSON.parse(extractOutputText(payload)) as T;
}
