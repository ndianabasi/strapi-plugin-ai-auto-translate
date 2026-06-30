import { PLUGIN_ID } from "./pluginId"

// The uids can only contain lowercase letters, dots and hyphens.
const pluginPermissions = {
  listAiProviders:   [{ action: `plugin::${PLUGIN_ID}.settings.ai-providers.list`,   subject: null }],
  editAiProvider:   [{ action: `plugin::${PLUGIN_ID}.settings.ai-providers.edit`,   subject: null }],
};

export const pluginPermissionsArray = [
  ...pluginPermissions.listAiProviders,
  ...pluginPermissions.editAiProvider,
];

export default pluginPermissions;