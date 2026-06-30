'use strict';

module.exports = {
  async up(knex) {
    const tableName = 'ai_auto_translate_caches';

    // Check if table exists first
    const tableExists = await knex.schema.hasTable(tableName);
    if (!tableExists) {
      console.log(`Table ${tableName} does not exist yet. Skipping index creation.`);
      return;
    }

    // Check if index already exists
    const indexExists = await knex.schema.hasIndex(tableName, 'ai_auto_translate_cache_unique_key');
    if (indexExists) {
      console.log('Index already exists. Skipping.');
      return;
    }

    await knex.schema.table(tableName, (table) => {
      table.index(
        ['strapiDocumentId', 'contentType', 'fieldPath', 'targetLocale'],
        'ai_auto_translate_cache_unique_key'
      );
    });

    console.log(`[plugin::ai-auto-translate] Added index on ai_auto_translate_caches`);
  },

  async down(knex) {
    const tableName = 'ai_auto_translate_caches';
    await knex.schema.table(tableName, (table) => {
      table.dropIndex(['strapiDocumentId', 'contentType', 'fieldPath', 'targetLocale']);
    });
  },
};