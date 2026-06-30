import type { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "./pluginId"

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase
  strapi.log.info(`plugin::${PLUGIN_ID}: Plugin registered`);
};

export default register;