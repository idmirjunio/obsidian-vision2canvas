import { requestUrl, RequestUrlResponse } from 'obsidian';
import { VisionAnalysisResult, Vision2CanvasSettings } from '../types';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './promptTemplates';

export class VisionClient {
  private static readonly DEFAULT_REMOTE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai';
  private static readonly DEFAULT_LOCAL_ENDPOINT = 'http://127.0.0.1:1234/v1';
  private settings: Vision2CanvasSettings;

  constructor(settings: Vision2CanvasSettings) {
    this.settings = settings;
  }

  /**
   * Analyze image via Vision MLLM API endpoint (with automatic retry for 503/429 transient errors)
   */
  public async analyzeImage(base64ImageData: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    const configuredEndpoint = this.settings.apiEndpoint.trim();
    const baseEndpoint = this.settings.aiProvider === 'local' &&
      (!configuredEndpoint || configuredEndpoint === VisionClient.DEFAULT_REMOTE_ENDPOINT)
      ? VisionClient.DEFAULT_LOCAL_ENDPOINT
      : configuredEndpoint;
    const normalizedBaseEndpoint = baseEndpoint.replace(/\/+$/, '');
    const endpoint = normalizedBaseEndpoint + '/chat/completions';

    if (this.settings.aiProvider === 'local') {
      await this.loadLocalModel(normalizedBaseEndpoint);
    }

    const systemPrompt = this.settings.customPrompt || DEFAULT_VISION_SYSTEM_PROMPT;

    const dataUrl = base64ImageData.startsWith('data:') 
      ? base64ImageData 
      : `data:${mimeType};base64,${base64ImageData}`;

    const requestBody = this.buildRequestBody(systemPrompt, dataUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log('[Gemini] Status:');
        const response: RequestUrlResponse = await requestUrl({
          url: endpoint,
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          throwOnError: false
        });
        console.log('[Gemini] Headers:', response.headers);
        console.log('[Gemini] Text:', response.text);


        if (response.status === 503 || response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
            continue;
          }
          throw new Error(`AI API service temporarily unavailable (${response.status}). Please retry in a few seconds.`);
        }

        if (response.status >= 400) {
          throw new Error(`AI API request failed (${response.status}): ${response.text}`);
        }

        const responseJson = response.json as {
          choices?: Array<{
            message?: {
              content?: string | Array<{ text?: string }>;
            };
          }>;
        };
        const rawContent = this.getResponseContent(responseJson);

        if (!rawContent) {
          throw new Error('AI API returned empty response content.');
        }

        return this.parseJsonResponse(rawContent);
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        lastError = errorObj;
        if (attempt < maxRetries && (errorObj.message.includes('503') || errorObj.message.includes('429'))) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('Failed to analyze image with Vision AI.');
  }

  /**
   * Builds the request payload according to the selected provider.
   * Local providers usually follow the OpenAI-like format with a simple chat payload.
   * Remote providers may accept extra response controls or stricter JSON formatting.
   */
  private buildRequestBody(systemPrompt: string, dataUrl: string): Record<string, unknown> {
    const model = this.settings.modelName || 'gemini-flash-latest';
    const userPrompt = 'Please analyze this handwritten note photo and output the JSON canvas structure.';

    if (this.settings.aiProvider === 'local') {
      return {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        stream: false
      };
    }

    return {
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      /*temperature: 0.2,*/
      /*max_tokens: 4096,*/
     /*response_format: { type: 'json_object'} */
    };
  }

  /**
   * Loads the selected model through LM Studio's REST API before inference.
   */
  private async loadLocalModel(baseEndpoint: string): Promise<void> {
    const apiRoot = baseEndpoint.endsWith('/v1')
      ? baseEndpoint.slice(0, -3)
      : baseEndpoint;
    const loadEndpoint = `${apiRoot}/api/v1/models/load`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    const response = await requestUrl({
      url: loadEndpoint,
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.settings.modelName,
        echo_load_config: false
      }),
      throwOnError: false
    });

    if (response.status >= 400) {
      throw new Error(
        `LM Studio could not load model "${this.settings.modelName}" (${response.status}): ${response.text}`
      );
    }
  }

  /**
   * Extracts text from the OpenAI-compatible response returned by local models.
   */
  private getResponseContent(response: {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string }>;
      };
    }>;
  }): string {
    const content = response.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text || '')
        .join('')
        .trim();
    }

    return '';
  }

  /**
   * Parses JSON even when a local model adds markdown or a short explanation.
   */
  public parseJsonResponse(rawText: string): VisionAnalysisResult {
    const cleanJson = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const jsonStart = cleanJson.indexOf('{');
    const jsonEnd = cleanJson.lastIndexOf('}');

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new Error('AI API response did not contain a JSON object.');
    }

    const parsed = JSON.parse(cleanJson.slice(jsonStart, jsonEnd + 1)) as { nodes?: unknown[] };
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Parsed JSON is missing "nodes" array.');
    }
    return parsed as unknown as VisionAnalysisResult;
  }
}
