import { getTranslation } from "./utils/getTranslation";
import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { prefixPluginTranslations } from "./utils/prefixPluginTranslations"
import type { StrapiApp } from "@strapi/admin/strapi-admin"
import TranslateButton from "./components/TranslateButton"
import type { ContentManagerPlugin } from '@strapi/content-manager/strapi-admin';
import { Server } from "@strapi/icons"
import pluginPermissions from "./permissions"

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'AI Auto Translate',
      },
      Component: () => import("./pages/App"),
      permissions: []
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: 'AI Auto Translate',
    });

    // Dashboard widgets
    app.widgets.register({
      icon: Server,
      title: {
        id: getTranslation('widget.title.grok'),
        defaultMessage: 'Grok AI Balance Widget'
      },
      component: async () => {
        const component = await import('./components/GrokBalanceWidget');
        return component.default;
      },
      id: `${PLUGIN_ID}-grok-balance-widget`,
      pluginId: PLUGIN_ID,
    });
  },

  bootstrap(app: StrapiApp) {
    const apis = app.getPlugin('content-manager').apis as ContentManagerPlugin['config']['apis'];
    // Inject "Translate with AI" button beside Globe in Edit View
    apis.addDocumentHeaderAction([TranslateButton]);

    // AI providers tab in Settings
    app.addSettingsLink(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTranslation('settings.sectionLabel'),
          defaultMessage: 'AI Auto Translate Plugin',
        },
      },
      {
        intlLabel: {
          id: getTranslation('settings.aiProviders'),
          defaultMessage: 'AI Providers',
        },
        id: `${PLUGIN_ID}.settings.providers`,
        to: `${PLUGIN_ID}/providers`,
        Component: () => import('./pages/Providers'),
        permissions: pluginPermissions.listAiProviders
      },
    );
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );

          return { data: prefixPluginTranslations(data, PLUGIN_ID), locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};