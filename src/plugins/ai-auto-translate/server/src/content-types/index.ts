import translationConfig from './translation-config/schema.json';
import translationCache from './translation-cache/schema.json';
import providerConfig from './provider-config/schema.json';

export default {
  // Key === singularName (Strapi best practice)
  'translation-config': { schema: translationConfig },
  'translation-cache': { schema: translationCache },
  'provider-config': { schema: providerConfig },
};