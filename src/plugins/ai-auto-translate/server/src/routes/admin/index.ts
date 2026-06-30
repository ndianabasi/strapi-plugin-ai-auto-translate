import { getPluginPermission } from '../../permissions';

export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/config',
      handler: 'config.findAll',
    },
    {
      method: 'POST',
      path: '/config',
      handler: 'config.save',
    },
    {
      method: 'GET',
      path: '/sse',
      handler: 'translate.sse',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('translations.execute')],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/translate/preview',
      handler: 'translate.preview',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('translations.execute')],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/translate',
      handler: 'translate.execute',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('translations.execute')],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/balance/:provider',
      handler: 'translate.getBalance',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('translations.fetch-provider-balance')],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/providers',
      handler: 'provider.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('settings.ai-providers.list')],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/providers/:id',
      handler: 'provider.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('settings.ai-providers.list')],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/providers/:id',
      handler: 'provider.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [getPluginPermission('settings.ai-providers.edit')],
            },
          },
        ],
      },
    },
  ],
});
