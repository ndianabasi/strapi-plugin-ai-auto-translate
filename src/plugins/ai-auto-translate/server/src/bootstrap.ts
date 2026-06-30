import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from './pluginId';
import type { AiProviderService, ProviderConfigService, SSEService } from './services';
import { Permissions } from './permissions';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Seed providers
  const providerConfigService = strapi
    .plugin('ai-auto-translate')
    .service('provider-config') as ProviderConfigService;
  await providerConfigService.ensureProviders();

  // Register permissions
  // The `uids` can only contain lowercase letters, dots and hyphens.
  await strapi.service('admin::permission').actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'List AI Providers',
      uid: Permissions['settings.ai-providers.list'],
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Edit AI Providers',
      uid: Permissions['settings.ai-providers.edit'],
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Execution AI Translations',
      uid: Permissions['translations.execute'],
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Fetch balance from AI Providers',
      uid: Permissions['translations.fetch-provider-balance'],
      pluginName: PLUGIN_ID,
    },
  ]);

  // Register lifecycles
  strapi.db.lifecycles.subscribe({
    models: [`plugin::${PLUGIN_ID}.provider-config`],

    // Encrypt before creating
    async beforeCreate(event) {
      encryptValues(event);
    },

    // Encrypt before saving
    async beforeUpdate(event) {
      encryptValues(event);
    },

    // Decrypt after reading a single document
    async afterFindOne(event) {
      const { result } = event;
      decryptValues(result, 'apiKey');
      decryptValues(result, 'mgmtApiKey');
    },

    // Decrypt after reading multiple documents
    async afterFindMany(event) {
      const { result } = event;
      if (Array.isArray(result)) {
        for (const item of result) {
          decryptValues(item, 'apiKey');
          decryptValues(item, 'mgmtApiKey');
        }
      }
    },
  });

  // Register queue and queue handlers
  const queueService = strapi.plugin('pgboss').service('queue');
  const sseService = strapi.plugin('ai-auto-translate').service('sse') as SSEService;

  await queueService.registerQueue(
    'execute-translation',
    {
      retryLimit: 2,
      retryBackoff: true,
    },
    async (strapi, jobs) => {
      const translationService = strapi
        .plugin('ai-auto-translate')
        .service('ai-provider') as AiProviderService;

      const data = jobs[0].data;

      try {
        await translationService.executeTranslation(data);

        sseService.broadcast({
          type: 'success',
          namespace: 'translation',
          data: {
            model: data.model,
            locale: data.targetLocale,
          },
        });
      } catch (error) {
        console.log(`[plugin::${PLUGIN_ID}] Translation error`, error);

        sseService.broadcast({
          type: 'failure',
          namespace: 'translation',
          data: {
            model: data.model,
            locale: data.targetLocale,
          },
        });
      }
    }
  );

  strapi.log.info(
    `[plugin::${PLUGIN_ID}]: Bootstrap complete – services, content-types, permissions, lifecycles are ready`
  );
};

function encryptValues(event) {
  const { data } = event.params;
  if (data.apiKey) {
    data.apiKey = strapi.service('admin::encryption').encrypt(data.apiKey);
  }
  if (data.mgmtApiKey) {
    data.mgmtApiKey = strapi.service('admin::encryption').encrypt(data.mgmtApiKey);
  }
}

function decryptValues(result: Record<string, any>, key: string) {
  /**
   * CAUTION: The decrypt() method returns null if:
   * - The encryptionKey is missing from config
   * - The value is corrupted or the key has changed since encryption
   */
  if (result?.[key]) {
    try {
      const decrypted = strapi.service('admin::encryption').decrypt(result[key]);

      if (!decrypted) {
        strapi.log.warn(
          `[plugin::${PLUGIN_ID}.provider-config]: Decryption for "${key}" key in record "${result.documentId || result.id}" returned null. Either the encryption key has changed or missing or encrypted value is corrupted.`
        );
      }

      result[key] = decrypted || result[key];
    } catch (error) {
      strapi.log.error(
        `[plugin::${PLUGIN_ID}.provider-config]: Error while decrypting "${key}" key in record "${result.documentId || result.id}". The encrypted value will be returned. Please attempt to re-create or save the config.`
      );
    }
  }
}
