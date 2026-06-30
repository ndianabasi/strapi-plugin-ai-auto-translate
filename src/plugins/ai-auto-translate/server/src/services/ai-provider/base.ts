import z from "zod"
import type { AiProviderBaseContract, TranslationRequest, TranslationResponse, AiBalanceResponse, ProviderUpdateData, ProviderUpdatePayloadValidationErrors, AiProviderBaseConstructorContract, SupportedProvider } from "../index"
import { GrokProvider } from "./grok"

// Store in dedicated file to avoid circular dependency error

export abstract class AiProviderBase implements AiProviderBaseContract {
  public abstract readonly name: SupportedProvider;
  public abstract translate(request: TranslationRequest): Promise<TranslationResponse>;
  public abstract getLiveBalance(): Promise<AiBalanceResponse>;

  protected validateResponse(
    response: unknown,
    expectedFields: string[]
  ): TranslationResponse {
    const schema = z.object(
      expectedFields.reduce((acc, field) => {
        acc[field] = z.object({value: z.any(), type: z.string()}).optional().nullable();
        return acc;
      }, {} as Record<string, any>)
    );
    return schema.parse(response) as TranslationResponse;
  }

  protected calculateCost(tokens: number): number {
    // Real Grok pricing will be injected later
    return (tokens / 1_000_000) * 0.0005;
  }

  protected systemPrompt(options: {targetLocale: string}): string {
    return `You are a precise translation assistant.
Translate the following fields from source language "en" to target language "${options.targetLocale}". You should infer the context of the use of words and their relation with other words or sentences and correctly translate the words or sentences. You must remain unopinionated, unbiased, and accurate.

INPUT FORMAT:
Each field is provided as an object with this exact shape:
{
  "fieldName": {
    "value": "the text to translate",
    "type": "fieldType",
    "minLength": 50,
    "maxLength": 300,
  }
}

CRITICAL RULES:
- Return ONLY a valid JSON object. No explanations, no markdown, no extra text.
- Keys must exactly match the field names provided.
- Preserve the exact same structure: for each field, keep the "value" and "type" keys.
- Values must be strings (preserve HTML/Markdown if the field is rich-text).
- If a value is JSON or stringified JSON, translate only the translatable properties inside it and return it as valid JSON/stringified JSON.
- Some values may contain ID, number, date/datetime/timestamp, or boolean fields. Do NOT translate those values — return them unchanged.
- Do not add, remove, or rename any keys.
- If a field cannot be translated, return the original "value".
- You must preserve capitalisations. If a text is in title case, preserve the title case (where first first letter of all significant words are in uppercase).
- If the "minLength" property is provided within field's object, the translation MUST not be LESS THAN the minimum length to avoid validation failures. Carefully rephrase the translation to fit the character limit without loss of meaning.
- If the "maxLength" property is provided within field's object, the translation MUST not be MORE THAN the maximum length to avoid validation failures. Carefully rephrase the translation to fit the character limit without loss of meaning.

Example input:
{
  "title": { "value": "Welcome to our platform", "type": "string", "maxLength": 150 },
  "body": { "value": "<p>This is a <strong>rich text</strong> example.</p>", "type": "richtext" },
  "seo": { "value": { "metaDescription": "SEO description here" }, "type": "json" }
}

Expected output:
{
  "title": { "value": "Bienvenue sur notre plateforme", "type": "string", "maxLength": 150 },
  "body": { "value": "<p>Ceci est un exemple de <strong>texte enrichi</strong>.</p>", "type": "richtext" },
  "seo": { "value": { "metaDescription": "Description SEO ici" }, "type": "json" }
}`;
  }

  public static resolveProviderClass(providerName: SupportedProvider): AiProviderBaseConstructorContract {
    let ProviderClass: AiProviderBaseConstructorContract;

    switch (providerName) {
      case 'grok':
        ProviderClass = GrokProvider
        break;
    
      default:
        throw new Error('Invalid AI provider provided');
    }

    if (!ProviderClass.validateUpdatePayload) {
      throw new Error('static method "validateUpdatePayload" is required')
    }

    return ProviderClass
  }
}