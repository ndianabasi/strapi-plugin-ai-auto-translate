# AI Auto-Translate Plugin for Strapi

AI-powered automatic translation for Strapi v5 content using modern AI providers.

> **Note**: This plugin is **not yet published** on the Strapi Marketplace. Install it manually for now.

## Features

- Automatic translation of content types and components.
- Multiple AI provider support (xAI, OpenAI, etc.). Current support for xAI only.
- Admin UI for managing providers and translation settings.
- Translation caching for performance (not in use yet)
- Background translation and notification via PgBoss and SSE.

## Installation

Since the plugin is not on the Marketplace yet, use one of the following methods:

### Method 1: Local path (quickest)

```bash
# 1. Clone the plugin next to your Strapi project
cd ..
git clone https://github.com/ndianabasi/strapi-plugin-ai-auto-translate.git

# 2. Install it in your Strapi project
cd your-strapi-project
yarn add file:../strapi-plugin-ai-auto-translate

# 3. Rebuild admin panel
yarn build

# 4. Start Strapi
yarn develop
```

### Method 2: Using Plugin SDK + yalc (recommended for testing)

```bash
# In your Strapi project
yarn dlx yalc add --link ai-auto-translate && yarn install
```

Then run `yarn develop`.

## Configuration

Create or update `config/plugins.ts`:

```ts
export default () => ({
  'ai-auto-translate': {
    enabled: true,
    config: {},
  },
});
```

## Usage

1. After starting Strapi, go to **`Settings` -> `AI AUTO TRANSLATION PLUGIN` -> `AI Providers`** to configure available AI providers and API keys.
2. Then go to `Content Manager` and open the `Edit` view of any collection type or single type. Ensure the content type supports localisation.
3. Check the top-right corner of the `Edit` page. You will see a `Translate with AI` button which is injected by the plugin after the `Locale` dropdown button.
4. Switch to a non-English locale via the `Locale` dropdown button to enable the `Translate with AI` button. Note that English is currently hard-coded as the source locale for translation.
5. Click on the `Translate with AI` to translate all the fields and components within the content type from English to the currently-viewed locale.

## Requirements

- Strapi ≥ 5.0.0
- Node.js ≥ 18

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to develop and contribute.

## License

MIT © Ndianabasi Udonkang
