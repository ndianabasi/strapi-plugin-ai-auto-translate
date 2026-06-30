import type { Core } from '@strapi/strapi';
import { diff, create } from 'jsondiffpatch';
import { createHash } from 'crypto';
import type { CacheService } from "."

export default ({ strapi }: { strapi: Core.Strapi }): CacheService => {
  const UID = 'plugin::ai-auto-translate.translation-cache';

  const generateHash = (value: any): string =>
    createHash('sha256').update(JSON.stringify(value ?? '')).digest('hex');

  const getNestedValue = (obj: any, path: string): any =>
    path.split('.').reduce((o, key) => o?.[key], obj);

  return {
    async getCachedFields(
      strapiDocumentId: string,
      contentType: string,
      targetLocale: string,
      currentEnglishData: Record<string, any>
    ) {
      const cached = await strapi.documents(UID).findMany({
        filters: { strapiDocumentId, contentType, targetLocale },
      });

      const result: Record<string, any> = {};
      const toTranslate: string[] = [];

      for (const entry of cached) {
        const currentValue = getNestedValue(currentEnglishData, entry.fieldPath);
        if (entry.originalHash === generateHash(currentValue)) {
          result[entry.fieldPath] = entry.translatedValue;
        } else {
          toTranslate.push(entry.fieldPath);
        }
      }

      return { cached: result, toTranslate };
    },

    async storeCache(
      strapiDocumentId: string,
      contentType: string,
      targetLocale: string,
      fieldPath: string,
      originalValue: any,
      translatedValue: any,
      tokensUsed: number
    ) {
      const hash = generateHash(originalValue);

      // Ensure translatedValue is a valid JSON string for PostgreSQL json column
      const safeTranslatedValue = 
        translatedValue === null || translatedValue === undefined
          ? null
          : typeof translatedValue === 'object'
            ? JSON.stringify(translatedValue)
            : translatedValue;

      // Upsert logic (Strapi v5 Document Service)
      await strapi.documents(UID).create({
        data: {
          strapiDocumentId,
          contentType,
          fieldPath,
          targetLocale,
          originalHash: hash,
          translatedValue: safeTranslatedValue,
          lastTranslated: new Date(),
          provider: 'grok',
          tokensUsed,
        },
      });
    },
  };
};