import type { ProviderUpdateData, ProviderUpdatePayloadValidationErrors, TranslationRequest, TranslationResponse } from "../index"
import { AiProviderBase } from "./base"
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

export class GrokProvider extends AiProviderBase {
  readonly name = 'grok';

  constructor(private apiKey?: string | null, private teamId?: string | null, private mgmtApiKey?: string | null) {
    super();
  }

  public async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const userMessage = JSON.stringify(request.fields);

    const xai = createXai({ apiKey: this.apiKey });

    const { text, response } = await generateText({
      model: xai.responses('grok-4-1-fast-reasoning'),
      system: this.systemPrompt({targetLocale: request.targetLocale}),
      prompt: userMessage,
    });

    // console.log(text)
    // console.log(response.headers)
    // console.log(JSON.stringify(response.messages))

    // Strict validation
    const parsed = this.validateResponse(JSON.parse(text), Object.keys(request.fields));
    // console.log(parsed)

    return parsed;
  }

  public async getLiveBalance() {
    if (!this.teamId) {
      throw new Error('Grok requires Team ID');
    }

    try {
      const res = await fetch(`https://management-api.x.ai/v1/billing/teams/${this.teamId}/prepaid/balance`, {
        headers: { Authorization: `Bearer ${this.mgmtApiKey}` },
      });

      if (!res.ok) {
        throw new Error(`Balance API failed: ${res.status} ${res.statusText}`);
      }

      const data: {
        total?: { val?: string };
        // changes array is present but not needed for live balance
      } = await res.json();

      // The API now returns `total.val` (string, USD cents).
      // Sign convention (per docs + response examples):
      //   - Purchases/refunds -> negative values (adding credit)
      //   - Spends -> positive values (consuming credit)
      //   -> Current prepaid balance is therefore always <= 0.
      //   Live balance in USD = -total.val / 100 (or 0 if no credit).
      const totalVal = data.total?.val ?? '0';
      const totalCents = parseInt(totalVal, 10);

      // Safeguard: if the value is somehow positive (manual adjustment / edge case), treat as 0 balance
      const balanceUSD = totalCents <= 0 ? Math.abs(totalCents) / 100 : 0;

      return {
        balance: balanceUSD,
        currency: 'USD',
      };
    } catch (err) {
      // Original behaviour preserved (return null on any error).
      // You could also log the error here if you have a logger.
      console.warn('Failed to fetch live balance:', err);
      return null;
    }
  }

  public static validateUpdatePayload(payload: ProviderUpdateData): Promise<true | ProviderUpdatePayloadValidationErrors> {
    const errors: ProviderUpdatePayloadValidationErrors = {}
    
    if (!payload.apiKey) {
      if (!errors['apiKey']) {
        errors.apiKey = ['"apiKey" is expected']
      } else {
        errors.apiKey.push('"apiKey" is expected')
      }
    }

    if (!payload.mgmtApiKey) {
      if (!errors['mgmtApiKey']) {
        errors.mgmtApiKey = ['"mgmtApiKey" is expected']
      } else {
        errors.mgmtApiKey.push('"mgmtApiKey" is expected')
      }
    }

    if (!payload.teamId) {
      if (!errors['teamId']) {
        errors.teamId = ['"teamId" is expected']
      } else {
        errors.teamId.push('"teamId" is expected')
      }
    }

    if (Object.keys(errors).length) {
      return Promise.resolve(errors)
    }
    
    return Promise.resolve(true)
  }
}