import type { Core } from "@strapi/strapi";

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx: any) {
    const service = strapi.plugin('ai-auto-translate').service('translation-config');
    const configs = await service.getAll();
    ctx.body = configs;
  },

  async save(ctx: any) {
    const service = strapi.plugin('ai-auto-translate').service('translation-config');
    const saved = await service.createOrUpdate(ctx.request.body);
    ctx.body = saved;
  },
});

export default controller;