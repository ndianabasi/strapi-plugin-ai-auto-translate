import { type Core } from '@strapi/strapi';
import { GrokProvider } from './ai-provider/grok';
import type {
  AiProviderBaseConstructorContract,
  AiProviderService,
  NormalisedTranslationResponse,
  ProviderConfigService,
  SupportedProvider,
  ExecutionTranslationPayload,
} from '.';
import type { ContentType } from '@strapi/types/dist/uid';
import merge from 'lodash.merge';
import type { AnyDocument } from '@strapi/types/dist/modules/documents';
import type { AnyAttribute } from '@strapi/types/dist/schema/attribute';
import { AiProviderBase } from './ai-provider/base';

export default ({ strapi }: { strapi: Core.Strapi }): AiProviderService => ({
  nonTranslatableFields: [
    'biginteger',
    'boolean',
    'date',
    'datetime',
    'timestamp',
    'decimal',
    'email',
    'float',
    'integer',
    'media',
    'password',
    'time',
    'uid',
    'relation',
    'enumeration',
  ],

  async getProviderInstance(options?: { provider?: SupportedProvider }) {
    const providerConfigService = strapi
      .plugin('ai-auto-translate')
      .service('provider-config') as ProviderConfigService;

    const config = await providerConfigService.getDefaultProvider();
    const provider = options?.provider || config.provider;

    if (!config) {
      throw new Error('No default AI provider configured');
    }

    if (!provider) {
      throw new Error('No provider configured');
    }

    let ProviderClass: AiProviderBaseConstructorContract;

    switch (provider) {
      case 'grok':
        ProviderClass = GrokProvider;
        break;

      default:
        throw new Error('Invalid AI provider provided');
    }

    return new ProviderClass(config.apiKey, config.teamId, config.mgmtApiKey);
  },

  sanitizeForUpdate(data: Record<string, any>, model: ContentType): Record<string, any> {
    const omitFields = [
      'localizations',
      'id',
      'documentId',
      'createdAt',
      'updatedAt',
      'publishedAt',
    ];

    if (!data || typeof data !== 'object') return data;

    // console.log('sanitizeForUpdate', data)

    // Deep clone
    const cleaned = JSON.parse(JSON.stringify(data));

    // Add `path` parameter to track the full dot-notation path
    const sanitizeRecursively = (obj: any, path = ''): any => {
      if (Array.isArray(obj)) {
        // Pass `path` exactly as-is without array indices,
        // to match Strapi's schema lookup requirements
        return obj.map((item) => sanitizeRecursively(item, path));
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};

        Object.keys(obj).forEach((key) => {
          let value = obj[key];

          // Build the full path for accurate schema lookups
          const fullPath = path ? `${path}.${key}` : key;

          // Remove id and documentId fields from components / repeatable items
          if (omitFields.includes(key)) {
            return;
          }

          // Use fullPath to get the attribute type
          const attribute = this.getFieldTypeFromSchema(model, fullPath);
          const fieldType = attribute?.type;

          // Convert null to empty string for string fields
          if (value === null) {
            if (fieldType === 'string' || fieldType === 'text') {
              value = '';
            }
          }

          // Convert null or empty string to false for boolean fields
          if (value === null || value === '') {
            if (fieldType === 'boolean') {
              value = false;
            }
          }

          // Recurse into nested objects/arrays, passing the fullPath down
          if (value && typeof value === 'object') {
            sanitized[key] = sanitizeRecursively(value, fullPath);
          } else {
            sanitized[key] = value;
          }
        });

        return sanitized;
      }

      return obj;
    };

    return sanitizeRecursively(cleaned);
  },

  async previewTranslation(ctxData: {
    documentId: string;
    model: ContentType;
    collectionType: 'collection-types' | 'single-types';
    targetLocale: string;
  }) {
    const { documentId, model } = ctxData;

    const configService = strapi.plugin('ai-auto-translate').service('translation-config');
    const config = await configService.findOne(model);

    if (!config?.enabled) {
      return {
        fields: [],
        estimatedCost: '$0.00',
        reason: 'Translation not enabled for this content type',
        totalFields: 0,
      };
    }

    // Fetch English source
    const englishDoc = await strapi.documents(model).findOne({
      documentId,
      locale: 'en',
      populate: '*',
    });

    if (!englishDoc) {
      return {
        fields: [],
        estimatedCost: '$0.00',
        reason: 'English version not found',
        totalFields: 0,
      };
    }

    const translatableFields = config.translatableFields || [];

    // Use cache + diff to determine which fields actually need translation
    const cacheService = strapi.plugin('ai-auto-translate').service('cache');
    const { toTranslate } = await cacheService.getCachedFields(
      documentId,
      model,
      ctxData.targetLocale,
      englishDoc
    );

    const fieldsToTranslate = translatableFields.filter((f: string) =>
      toTranslate.length ? toTranslate.includes(f) : true
    );

    // Very rough token estimation (can be refined later)
    const estimatedTokens = fieldsToTranslate.length * 150;
    const estimatedCost = `$${((estimatedTokens / 1_000_000) * 0.0005).toFixed(4)}`;

    return {
      fields: fieldsToTranslate,
      estimatedCost,
      totalFields: translatableFields.length,
    };
  },

  getComponentAttributes(componentUID: `${string}.${string}`) {
    // Get the component schema
    const componentSchema = strapi.getModel(componentUID);

    // Access the attributes
    return componentSchema.attributes;
  },

  sanitizePopulate(populate: any, modelUid: ContentType): any {
    if (!populate || typeof populate !== 'object') {
      return populate;
    }

    if (Array.isArray(populate)) {
      return populate.map((item) => this.sanitizePopulate(item, modelUid));
    }

    const sanitized: any = {};

    Object.keys(populate).forEach((key) => {
      const attr = strapi.contentType(modelUid).attributes[key];

      // If it's a relation, exclude it completely or set to false
      if (attr && attr.type === 'relation') {
        sanitized[key] = false;
        return;
      }

      // Recurse for nested populate (components, dynamic zones, etc.)
      if (typeof populate[key] === 'object') {
        sanitized[key] = this.sanitizePopulate(populate[key], modelUid);
      } else {
        sanitized[key] = populate[key];
      }
    });

    return sanitized;
  },

  // Get a specific attribute from a content-type's component field
  getNestedComponentAttributes(contentTypeUID: ContentType, attributeName: string) {
    const contentType = strapi.contentType(contentTypeUID);
    const attribute = contentType.attributes[attributeName];

    if (attribute.type === 'component') {
      const component = strapi.getModel(attribute.component);
      return component.attributes;
    }

    return null;
  },

  async executeTranslation(ctxData: ExecutionTranslationPayload) {
    const provider = await this.getProviderInstance();
    const configService = strapi.plugin('ai-auto-translate').service('translation-config');
    // const config = await configService.findOne(ctxData.model)
    const isSingleType = ctxData.collectionType === 'single-types';

    // if (!config?.enabled) throw new Error('Translation not enabled for this content type')

    const safePopulate = this.getDeepPopulate(ctxData.model);
    console.log('safePopulate', JSON.stringify(safePopulate));

    const englishDoc = await strapi.documents(ctxData.model).findOne({
      documentId: ctxData.documentId,
      locale: 'en',
      populate: safePopulate === true ? '*' : safePopulate,
    });

    if (!englishDoc) throw new Error('English source document not found');

    console.log('englishDoc', JSON.stringify(englishDoc));

    // Split document into translatable vs non-translatable parts
    const { nonTranslatable, translatable } = this.splitTranslatableAndNonTranslatable(
      englishDoc,
      ctxData.model
    );

    // console.log('translatable', JSON.stringify(translatable))
    // console.log('nonTranslatable', JSON.stringify(nonTranslatable))

    // const cacheService = strapi.plugin('ai-auto-translate').service('cache') as CacheService
    // const { toTranslate, cached } = await cacheService.getCachedFields(
    //   ctxData.documentId,
    //   ctxData.model,
    //   ctxData.targetLocale,
    //   translatable
    // )

    // const translatableFields = config.translatableFields || []

    // Prepare request for AI model
    const fieldsToSend: any = {};

    Object.keys(translatable).forEach((path) => {
      const value = this.getNestedValue(translatable, path);
      const {
        type: fieldType,
        minLength,
        maxLength,
      } = this.getFieldTypeFromSchema(ctxData.model, path);
      fieldsToSend[path] = { value, type: fieldType, minLength, maxLength };
    });

    console.log('"fieldsToSend" sent to LLM:', JSON.stringify(fieldsToSend));

    // console.log('cached', cached)
    // console.log('toTranslate', toTranslate)
    // console.log('translatableFields', translatableFields)

    const result = await provider.translate({
      documentId: ctxData.documentId,
      contentType: ctxData.model,
      targetLocale: ctxData.targetLocale,
      fields: fieldsToSend,
    });

    const normalisedResult = Object.entries(result).reduce((acc, [key, value]) => {
      acc[key] = value.value;
      return acc;
    }, {} as NormalisedTranslationResponse);

    let mergedData = merge({}, nonTranslatable, translatable);
    mergedData = merge({}, mergedData, normalisedResult);

    console.log('result (merged)', JSON.stringify(mergedData));

    // Fetch existing target document with relations populated
    // We reuse safePopulate to ensure Tags and ContactSubmissions are fetched
    const existingTargetDoc = await strapi.documents(ctxData.model).findOne({
      documentId: ctxData.documentId,
      locale: ctxData.targetLocale,
      populate: safePopulate === true ? '*' : safePopulate,
    });

    // Dynamically process Relation fields
    const schema = strapi.getModel(ctxData.model);
    const relationFields = Object.entries(schema.attributes)
      .filter(([key]) => schema.attributes[key].type === 'relation')
      .map(
        ([key, value]: [
          string,
          AnyAttribute & { relation: 'oneToOne' | 'manyToMany' | 'oneToMany' },
        ]) => ({ key, relationType: value.relation })
      );

    // Helper to safely extract an array of id from a relation object/array
    const extractDocumentIds = (relationData: any, allowsMultiple: boolean): string[] => {
      if (!relationData) {
        return allowsMultiple ? [] : null;
      }
      // If it's a many-to-many/one-to-many (Array)
      if (Array.isArray(relationData)) {
        return relationData.map((item) => item.id).filter(Boolean);
      }
      // If it's a one-to-one/many-to-one (Object)
      return relationData.id ? (allowsMultiple ? [relationData.id] : relationData.id) : [];
    };

    // Apply the fallback logic
    for (const { key: relField, relationType } of relationFields) {
      const allowsMultiple = relationType === 'manyToMany' || relationType === 'oneToMany';
      const targetRelData = existingTargetDoc?.[relField];
      const englishRelData = englishDoc?.[relField];

      const targetHasData =
        !!targetRelData &&
        (Array.isArray(targetRelData)
          ? targetRelData.length > 0
          : Object.keys(targetRelData).length > 0);

      if (existingTargetDoc && targetHasData) {
        // Condition A: Target locale exists AND has relations assigned.
        // Keep the target locale's existing relations.
        mergedData[relField] = extractDocumentIds(targetRelData, allowsMultiple);
      } else if (englishRelData) {
        // Condition B: Target locale doesn't exist, OR it exists but relations are empty.
        // Fallback to mapping the relations from the English document.
        mergedData[relField] = extractDocumentIds(englishRelData, allowsMultiple);
      } else {
        // Condition C: Neither document has relations for this field.
        mergedData[relField] = [];
      }
    }

    // CRITICAL: Clean component data (recursively) before updating
    const cleanTranslatedData = this.sanitizeForUpdate(mergedData, ctxData.model);

    // Extra precautions:
    delete cleanTranslatedData.localizations;
    delete cleanTranslatedData.createdAt;
    delete cleanTranslatedData.updatedAt;
    delete cleanTranslatedData.publishedAt;
    delete cleanTranslatedData.id;
    delete cleanTranslatedData.documentId;

    console.log('Final Sanitized Payload with Relations:', cleanTranslatedData);

    let translatedDocument: AnyDocument;

    try {
      // The locale exists -> UPDATE it
      translatedDocument = await strapi.documents(ctxData.model).update({
        documentId: ctxData.documentId,
        locale: ctxData.targetLocale,
        data: cleanTranslatedData,
      });
      strapi.log.info(
        `Successfully updated document "${ctxData.documentId}" for locale "${ctxData.targetLocale}"`
      );
    } catch (error) {
      console.error(error);
      throw error;
    }

    strapi.log.debug('[ai-provider] Document translated', JSON.stringify(translatedDocument));

    return {
      success: true,
      translatedFields: Object.keys(cleanTranslatedData),
      tokensUsed: 420, // Placeholder
      translatedData: cleanTranslatedData,
    };
  },

  // Helper used internally
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => o?.[key], obj);
  },

  getFieldTypeFromSchema(model: ContentType, path: string) {
    const schemaAttrs = strapi.contentType(model).attributes;
    const parts = path.split('.');

    // console.log('getFieldTypeFromSchema', model, path, parts)

    let current = schemaAttrs;
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      const attr = current[key] as AnyAttribute & { minLength?: number; maxLength?: number };

      // console.log('getFieldTypeFromSchema -> attr', attr)

      if (!attr) return { type: 'text' }; // fallback

      if (attr.type === 'component') {
        return {
          type: 'json',
          minLength: attr.minLength || attr.min,
          maxLength: attr.maxLength || attr.max,
          pluginOptions: attr.pluginOptions,
        }; // Handle components as JSON
      }

      if (attr.type === 'dynamiczone' && i === parts.length - 1) {
        return {
          type: 'json',
          minLength: attr.minLength || attr.min,
          maxLength: attr.maxLength || attr.max,
          pluginOptions: attr.pluginOptions,
        }; // Handle dynamic zone as JSON
      }

      return {
        type: attr.type || 'text',
        minLength: attr.minLength,
        maxLength: attr.maxLength,
        pluginOptions: attr.pluginOptions,
      };
    }

    return { type: 'text' };
  },

  getDeepPopulate(modelUid: ContentType | `${string}.${string}`, isComponent = false) {
    // Use the correct Strapi API based on whether it's a component or regular content type
    const model = isComponent
      ? strapi.getModel(modelUid)
      : strapi.contentType(modelUid as ContentType);

    if (!model?.attributes) return true;

    const populate: any = {};

    Object.entries(model.attributes).forEach(([fieldName, attr]) => {
      if (attr.type === 'relation') {
        // Populate relations, but only first level (no deep recursion into related entity)
        populate[fieldName] = true;
        return;
      }

      if (attr.type === 'component') {
        const compUid = attr.component;
        if (compUid) {
          const nested = this.getDeepPopulate(compUid, true);

          // Base the syntax on depth, not repeatability.
          // If 'nested' is exactly true, we just want `fieldName: true`.
          // If 'nested' is an object of deeper fields, we wrap it in { populate: ... }
          if (nested === true) {
            populate[fieldName] = true;
          } else {
            populate[fieldName] = { populate: nested };
          }
        }
      } else if (attr.type === 'dynamiczone' && Array.isArray(attr.components)) {
        // Dynamic zone: populate all possible component types
        populate[fieldName] = {
          populate: attr.components.reduce((acc: any, compUid: `${string}.${string}`) => {
            const nested = this.getDeepPopulate(compUid, true);
            // Also apply the depth check here to prevent `{ populate: true }` inside fragments
            acc[compUid] = nested === true ? true : { populate: nested };
            return acc;
          }, {} as any),
        };
      }
    });

    // If no specific populate rules were added, return true (fetch everything)
    return Object.keys(populate).length > 0 ? populate : true;
  },

  splitTranslatableAndNonTranslatable(englishDoc: any, model: ContentType) {
    const nonTranslatable: any = {};
    const translatable: any = {};

    const walk = (current: any, nonTarget: any, transTarget: any, path = '') => {
      // Base case
      if (!current || typeof current !== 'object') return;

      // Array case
      if (Array.isArray(current)) {
        current.forEach((item) => {
          // Handle primitive values in arrays (e.g., array of strings)
          // `typeof null` is 'object' in JS, so we explicitly check for null as well
          if (item === null || typeof item !== 'object') {
            // Push directly to both to maintain index alignment and ensure it gets translated
            nonTarget.push(item);
            transTarget.push(item);
            return;
          }

          // Initialize the child correctly based on whether the array item itself is an array or object
          const isArr = Array.isArray(item);
          const nonItem: any = isArr ? [] : {};
          const transItem: any = isArr ? [] : {};

          // Pass `path` exactly as-is.
          // Do NOT append `[${index}]` because Strapi schema lookup requires strict dot-notation
          // without array indices (e.g., "ProfessionalExperience.JobTitle", NOT "ProfessionalExperience[0].JobTitle")
          walk(item, nonItem, transItem, path);

          // Because we initialized the targets correctly in the parent, we can safely push
          nonTarget.push(nonItem);
          transTarget.push(transItem);
        });
        return;
      }

      // Object case
      Object.keys(current).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        const value = current[key];

        // Fetch the full attribute definition from the schema
        const attribute = this.getFieldTypeFromSchema(model, fullPath);
        const fieldType = attribute?.type;

        // Check if the field explicitly has localization enabled in pluginOptions
        const isLocalized = attribute?.pluginOptions?.i18n?.localized === true;

        // Determine if field should be excluded from translation.
        // It is non-translatable if its type is in the blocked list OR
        // if an attribute definition exists but it is explicitly NOT localized.
        const isNonTranslatable =
          (fieldType && this.nonTranslatableFields.includes(fieldType)) ||
          (attribute && !isLocalized);

        // if (key === 'ProfessionalExperience' || key === 'Education') {
        //   console.log('key -> fullPath', key, fullPath);
        //   console.log('key -> attribute', key, attribute);
        //   console.log('key -> isLocalized', key, isLocalized);
        //   console.log('key -> isNonTranslatable', key, isNonTranslatable);
        // }

        // Handle nulls safely without crashing typeof
        if (value === null) {
          if (isNonTranslatable) {
            nonTarget[key] = value;
          } else {
            transTarget[key] = value;
          }
          return;
        }

        if (isNonTranslatable) {
          // If the field (or entire component) is not translatable, copy the whole value over to nonTarget
          nonTarget[key] = value;
        } else {
          if (typeof value === 'object') {
            // Check if the nested value is an array or object
            const isArr = Array.isArray(value);

            // Initialize with [] for arrays, {} for objects
            const nonChild: any = isArr ? [] : {};
            const transChild: any = isArr ? [] : {};

            walk(value, nonChild, transChild, fullPath);

            // Attach BOTH children to their respective targets to prevent data loss
            // of nested non-translatable fields (like IDs) inside components
            nonTarget[key] = nonChild;
            transTarget[key] = transChild;
          } else {
            transTarget[key] = value;
          }
        }
      });
    };

    walk(englishDoc, nonTranslatable, translatable);
    return { nonTranslatable, translatable };
  },

  resolveProviderClass(providerName) {
    return AiProviderBase.resolveProviderClass(providerName);
  },
});
