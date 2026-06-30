import type { Core } from '@strapi/strapi';
import type { DefaultProvider, ProviderConfigService, ProviderUpdateData } from "./index"
import supportedProviders from "../supportProviders"

export default ({ strapi }: { strapi: Core.Strapi }): ProviderConfigService => {
  const UID = 'plugin::ai-auto-translate.provider-config' as const;

  return {
    async getDefaultProvider() {
      const results = await strapi.documents(UID).findMany({
        filters: { isDefault: true, enabled: true },
        limit: 1,
      });
      return (results[0] as unknown as DefaultProvider) || null;
    },

    async ensureProviders() {      
      for (const providerName of supportedProviders) {
        const existing = await strapi.documents(UID).findMany({
          filters: { provider: providerName },
          limit: 1,
        });

        const shouldBeDefault = providerName === 'grok'
        
        if (existing.length === 0) {
          await strapi.documents(UID).create({
            data: {
              provider: providerName,
              enabled: true,
              isDefault: shouldBeDefault,
              // apiKey, teamId, mgmtApiKey will be filled via the settings UI
            },
          });
          strapi.log.info(`[plugin::ai-auto-translate]: "${providerName}" provider seeded. Please update the rest of the provider settings such as "apiKey" via the Settings UI.`);   
        }
      }
    },

    async updateCredentials(provider: string, apiKey: string, teamId?: string) {
      const existing = await strapi.documents(UID).findMany({
        filters: { provider },
        limit: 1,
      });

      if (existing.length === 0) {
        throw new Error(`Provider ${provider} not found`);
      }

      return strapi.documents(UID).update({
        documentId: existing[0].documentId,
        // @ts-expect-error Object literal may only specify known properties, and 'apiKey' does not exist in type 'Partial<Input<"plugin::ai-auto-translate.provider-config">>'
        data: { apiKey, teamId },
      });
    },

    async findAll() {
      return strapi.documents(UID).findMany();
    },

    async findOne(id: string) {
      return strapi.documents(UID).findOne({documentId: id});
    },

    async create(data: ProviderUpdateData) {
      // Ensure only one provider is default
      if (data.isDefault) {
        const currentDefault = await this.getDefaultProvider();
        if (currentDefault) {
          await strapi.documents(UID).update({
            documentId: currentDefault.documentId,
            // @ts-expect-error Object literal may only specify known properties
            data: { isDefault: false },
          });
        }
      }

      return strapi.documents(UID).create({ data });
    },

    async update(id: string, data: ProviderUpdateData) {
      // Ensure only one provider is default
      if (data.isDefault) {
        const currentDefault = await this.getDefaultProvider();
        if (currentDefault && currentDefault.documentId !== id) {
          await strapi.documents(UID).update({
            documentId: currentDefault.documentId,
            // @ts-expect-error Object literal may only specify known properties
            data: { isDefault: false },
          });
        }
      }

      return strapi.documents(UID).update({
        documentId: id,
        // @ts-expect-error Type 'ProviderUpdateData' has no properties in common with type 'Partial<Input<"plugin::ai-auto-translate.provider-config">>
        data,
      });
    },
  };
};