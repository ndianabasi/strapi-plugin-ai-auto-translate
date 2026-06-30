import type { Core } from '@strapi/strapi';
import vine from '@vinejs/vine'
import type { AiProviderService, ProviderConfigService, ProviderUpdateData } from "../services"
import supportedProviders from "../supportProviders"
import type { Context } from 'koa';

const updateSchema = vine.object({
    provider: vine.enum(supportedProviders),
    enabled: vine.boolean()
      .optional(),
    apiKey: vine.string().trim()
    .optional().nullable(),    
    mgmtApiKey: vine.string().trim()
      .optional().nullable(),
    teamId: vine.string().trim()
      .optional()
      .nullable(),
    isDefault: vine.boolean()
      .optional()
  })

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const service = strapi.plugin('ai-auto-translate').service('provider-config') as ProviderConfigService;
    ctx.body = await service.findAll();
  },

  async findOne(ctx: Context) {
    const params = await vine.validate({
      schema: vine.object({
        id: vine.string()
      }),
      // @ts-expect-error
      data: ctx.request.params
    })
    const service = strapi.plugin('ai-auto-translate').service('provider-config') as ProviderConfigService;
    ctx.body = await service.findOne(params.id);
  },

  async update(ctx: Context) {
    const providerConfigService = strapi
      .plugin('ai-auto-translate')
      .service('ai-provider') as AiProviderService
    
    let payload: ProviderUpdateData
    try {
      payload = await vine.validate({ schema: updateSchema, data: ctx.request.body })      
    } catch (error) {
      ctx.status = 422
      ctx.body = error
      return
    }

    const providerValidationResult = await providerConfigService.resolveProviderClass(payload.provider).validateUpdatePayload(payload)

    if (typeof providerValidationResult === 'object') {
      ctx.body = providerValidationResult
      ctx.status = 400
      return
    }
    
    const service = strapi.plugin('ai-auto-translate').service('provider-config') as ProviderConfigService;
    ctx.body = await service.update(ctx.params.id, payload);
  },
});