import type { Core } from '@strapi/strapi';
import vine from '@vinejs/vine';
import type { AiProviderService } from '../services';
import supportedProviders from '../supportProviders';
import { createSession } from 'better-sse';
import { translationChannel } from '../services/sse/channels/translate';

const translateSchema = vine.object({
  documentId: vine.string(),
  model: vine.string(),
  collectionType: vine.enum(['collection-types', 'single-types']),
  targetLocale: vine.string().minLength(2).notIn(['en']),
});

const balanceSchema = vine.object({
  provider: vine.enum(supportedProviders),
});

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(ctx: any) {
    const payload = await vine.validate({ schema: translateSchema, data: ctx.request.body });
    const service = strapi.plugin('ai-auto-translate').service('ai-provider') as AiProviderService;
    ctx.body = await service.previewTranslation(payload as Required<typeof payload>);
  },

  async execute(ctx: any) {
    const payload = await vine.validate({ schema: translateSchema, data: ctx.request.body });
    const pgBoss = strapi.plugin('pgboss').service('queue').getInstance();
    await pgBoss.send('execute-translation', payload);
    ctx.status = 202;
    ctx.body = { message: 'Accepted' };
  },

  async getBalance(ctx: any) {
    const payload = await vine.validate({ schema: balanceSchema, data: ctx.request.params });
    const service = strapi.plugin('ai-auto-translate').service('ai-provider') as AiProviderService;
    const provider = await service.getProviderInstance(payload);
    ctx.body = await provider.getLiveBalance();
  },

  async sse(ctx: any) {
    // Prevent Koa sending a response and closing the connection
    ctx.respond = false;

    // Koa defaults to 404 if you do not set the response body
    ctx.status = 200;

    const session = await createSession(ctx.req, ctx.res);

    translationChannel.register(session);
  },
});
