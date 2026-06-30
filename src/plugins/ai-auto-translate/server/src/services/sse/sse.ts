import type { Core } from '@strapi/strapi';
import type { SSEService } from '..';
import type { Channel } from 'better-sse';
import { translationChannel } from './channels/translate';
import { PLUGIN_ID } from '../../pluginId';

export default ({ strapi }: { strapi: Core.Strapi }): SSEService => {
  return {
    async broadcast(payload: {
      type: 'success' | 'failure';
      namespace: 'translation';
      data: Record<string, any>;
    }) {
      const eventName = `${payload.namespace}:${payload.type}`;
      let channel: Channel;

      switch (payload.namespace) {
        case 'translation':
          channel = translationChannel;
          break;

        default:
          throw new Error('Unrecognised SSE channel');
      }

      channel.broadcast(payload.data, eventName);
      strapi.log.info(
        `[plugin::${PLUGIN_ID}] Event broadcasted: ${JSON.stringify({ eventName, data: payload.data })}`
      );
    },
  };
};
