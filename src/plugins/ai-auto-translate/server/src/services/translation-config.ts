import type { Core } from '@strapi/strapi';
import type { TranslationConfigService } from "."

export default ({ strapi }: { strapi: Core.Strapi }): TranslationConfigService => {
  const UID = 'plugin::ai-auto-translate.translation-config' as const;

  return {
    async findOne(contentType: string) {
      const results = await strapi.documents(UID).findMany({
        filters: { contentType },
        limit: 1,
      });
      return results[0] ?? null;
    },

    async createOrUpdate(data: any) {
      const existing = await this.findOne(data.contentType);

      const payload = {
        ...data,
        isComponent: data.isComponent || false,
      };

      if (existing?.documentId) {
        return strapi.documents(UID).update({
          documentId: existing.documentId,
          data: payload,
        });
      }

      return strapi.documents(UID).create({ data: payload });
    },

    async getAllEnabled() {
      return strapi.documents(UID).findMany({
        filters: { enabled: true },
      });
    },

    async getAll() {
      return strapi.documents(UID).findMany();
    },
  };
};