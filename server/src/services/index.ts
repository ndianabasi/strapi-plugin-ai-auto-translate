import aiProvider from './ai-provider';
import providerConfig from './provider-config';
import translationConfig from './translation-config';
import cacheService from './cache';
import type { ContentType } from '@strapi/types/dist/uid';
import type { SchemaAttributes } from '@strapi/types/dist/struct';
import type {
  Create,
  FindMany as FindManyResult,
  FindOne,
  Update as UpdateResult,
} from '@strapi/types/dist/modules/documents/result/document-engine';
import type { FindMany, Update } from '@strapi/types/dist/modules/documents/params/document-engine';
import supportedProviders from '../supportProviders';
import sse from './sse/sse';

export default {
  'provider-config': providerConfig,
  'translation-config': translationConfig,
  'ai-provider': aiProvider,
  cache: cacheService,
  sse: sse,
};

export interface TranslationConfigService {
  findOne(contentType: string): Promise<any | null>;
  createOrUpdate(data: any): Promise<any>;
  getAllEnabled(): Promise<any[]>;
  getAll(): Promise<any[]>;
}

export interface DefaultProvider {
  provider: SupportedProvider;
  apiKey?: string | null;
  teamId?: string | null;
  mgmtApiKey?: string | null;
  documentId: string;
  id: number;
}

export interface ProviderConfigService {
  getDefaultProvider(): Promise<DefaultProvider | null>;
  ensureProviders(): Promise<void>;
  updateCredentials(
    provider: string,
    apiKey?: string,
    teamId?: string,
    mgmtApiKey?: string
  ): Promise<any>;
  findAll(): FindManyResult<
    'plugin::ai-auto-translate.provider-config',
    FindMany<'plugin::ai-auto-translate.provider-config'>
  >;
  create(data: ProviderUpdateData): Create<
    'plugin::ai-auto-translate.provider-config',
    {
      readonly data: ProviderUpdateData;
    }
  >;
  update(
    id: string,
    data: ProviderUpdateData
  ): UpdateResult<
    'plugin::ai-auto-translate.provider-config',
    Update<'plugin::ai-auto-translate.provider-config'>
  >;
  findOne(id: string): FindOne<
    'plugin::ai-auto-translate.provider-config',
    {
      readonly documentId: string;
    }
  >;
}

// Instance contract – public API of any AI provider
export interface AiProviderBaseContract {
  readonly name: SupportedProvider;
  translate(request: TranslationRequest): Promise<TranslationResponse>;
  getLiveBalance(): Promise<AiBalanceResponse>;
}

// Constructor contract – for typing the class itself (un-instantiated)
export interface AiProviderBaseConstructorContract {
  new (apiKey: string, teamId?: string | null, mgmtApiKey?: string | null): AiProviderBaseContract;
  resolveProviderClass(providerName: SupportedProvider): AiProviderBaseConstructorContract;
  validateUpdatePayload(
    payload: ProviderUpdateData
  ): Promise<true | ProviderUpdatePayloadValidationErrors>;
}

export interface AiBalanceResponse {
  balance: number;
  currency: string;
}

export interface TranslationRequest {
  documentId: string;
  contentType: string;
  targetLocale: string;
  fields: Record<string, { value: any; type: string }>;
}

export interface TranslationResponse {
  [fieldPath: string]: { value: any; type: string };
}
export interface NormalisedTranslationResponse {
  [fieldPath: string]: any;
}

export interface ExecutionTranslationPayload {
  documentId: string;
  model: ContentType;
  collectionType: 'collection-types' | 'single-types';
  targetLocale: string;
}

export interface AiProviderService {
  getProviderInstance(options?: { provider?: SupportedProvider }): Promise<AiProviderBaseContract>;

  // Preview & Execute Translation (backend-driven)
  previewTranslation(data: {
    documentId: string;
    model: string; // full uid e.g. "api::article.article"
    collectionType: 'collection-types' | 'single-types';
    targetLocale: string;
  }): Promise<{
    fields: string[];
    estimatedCost: string;
    totalFields: number;
    reason?: string;
  }>;

  executeTranslation(data: ExecutionTranslationPayload): Promise<{
    success: boolean;
    translatedFields: string[];
    translatedData: NormalisedTranslationResponse;
    tokensUsed?: number;
  }>;

  getNestedValue(obj: any, path: string): any;
  getComponentAttributes(componentUID: `${string}.${string}`): SchemaAttributes;
  getNestedComponentAttributes(
    contentTypeUID: ContentType,
    attributeName: string
  ): SchemaAttributes;
  sanitizeForUpdate(data: Record<string, any>, model: ContentType): Record<string, any>;
  getFieldTypeFromSchema(
    model: ContentType,
    path: string
  ): {
    minLength?: number;
    maxLength?: number;
    type: SchemaAttributes[keyof SchemaAttributes]['type'];
    pluginOptions?: { i18n?: { localized: boolean } };
  };

  /**
   * Strip off `relations` from the populate object.
   */
  sanitizePopulate(populate: any, modelUid: ContentType): any;
  nonTranslatableFields: SchemaAttributes[keyof SchemaAttributes]['type'][];
  getDeepPopulate(
    modelUid: ContentType | `${string}.${string}`,
    isComponent?: boolean
  ): Record<string, any> | true;

  /**
   * Splits the englishDoc into two objects:
   * 1. nonTranslatable - fields that should NOT be sent to the LLM (relations, dates, numbers, etc.)
   * 2. translatable - fields that should be sent to the LLM for translation
   */
  splitTranslatableAndNonTranslatable(
    englishDoc: any,
    model: ContentType
  ): {
    nonTranslatable: Record<string, any>;
    translatable: Record<string, any>;
  };
  resolveProviderClass(providerName: SupportedProvider): AiProviderBaseConstructorContract;
}

export interface CacheService {
  getCachedFields(
    strapiDocumentId: string,
    contentType: string,
    targetLocale: string,
    currentEnglishData: Record<string, any>
  ): Promise<{
    cached: Record<string, any>;
    toTranslate: string[];
  }>;

  storeCache(
    strapiDocumentId: string,
    contentType: string,
    targetLocale: string,
    fieldPath: string,
    originalValue: any,
    translatedValue: any,
    tokensUsed: number
  ): Promise<void>;
}

export interface ProviderUpdateData {
  provider?: SupportedProvider;
  enabled?: boolean;
  apiKey?: string;
  teamId?: string;
  mgmtApiKey?: string;
  isDefault?: boolean;
}

type ProviderUpdateDataKey = keyof ProviderUpdateData;

export type ProviderUpdatePayloadValidationErrors = { [Key in ProviderUpdateDataKey]?: string[] };

export type SupportedProvider = (typeof supportedProviders)[number];

export interface SSEService {
  broadcast(payload: {
    type: 'success' | 'failure';
    namespace: 'translation';
    data: Record<string, any>;
  }): void;
}
