import { PLUGIN_ID } from './pluginId';

export const Permissions = {
  'settings.ai-providers.list': 'settings.ai-providers.list',
  'settings.ai-providers.edit': 'settings.ai-providers.edit',
  'translations.execute': 'translations.execute',
  'translations.fetch-provider-balance': 'translations.fetch-provider-balance',
};

export const getPluginPermission = (type: keyof typeof Permissions) => {
  return `plugin::${PLUGIN_ID}.${Permissions[type]}` as const;
};
