# Contributing to strapi-plugin-ai-auto-translate

Thanks for your interest in contributing!

## Development Setup (Recommended)

### 1. Clone the plugin

```bash
git clone https://github.com/ndianabasi/strapi-plugin-ai-auto-translate.git
cd strapi-plugin-ai-auto-translate
yarn install
```

### 2. Link it to a Strapi v5 project for live development

#### Recommended: Using `watch:link` + yalc

From the **plugin folder**:

```bash
yarn watch:link
```

In a **separate terminal**, from your **Strapi project**:

```bash
yarn dlx yalc add --link ai-auto-translate && yarn install
yarn develop
```

Changes in the plugin will automatically rebuild and reflect in your Strapi instance.

#### Alternative: Using `git subtree` (embed inside your project)

```bash
# Add as subtree
git subtree add --prefix=src/plugins/ai-auto-translate \
  https://github.com/ndianabasi/strapi-plugin-ai-auto-translate.git main --squash

# Later updates
git subtree pull --prefix=src/plugins/ai-auto-translate \
  https://github.com/ndianabasi/strapi-plugin-ai-auto-translate.git main --squash
```

### 3. Useful Commands

| Command           | Purpose                                 |
| ----------------- | --------------------------------------- |
| `yarn watch:link` | Watch + auto-push to yalc (recommended) |
| `yarn watch`      | Watch mode only                         |
| `yarn build`      | Build for production                    |
| `yarn verify`     | Validate build before publishing        |

### 4. Plugin Architecture (from actual code)

- **Plugin ID**: `ai-auto-translate`
- **Content Types**:
  - `plugin::ai-auto-translate.provider-config`
  - `plugin::ai-auto-translate.translation-cache`
- **Main Services**:
  - `provider-config`
  - `translation-config`
  - `ai-provider`
  - `cache`
  - `sse`

All internal references use `strapi.plugin('ai-auto-translate')`.

### 5. Making Changes

1. Work in `admin/src/` or `server/src/`.
2. Use `yarn watch:link` for instant feedback.
3. Run `yarn verify` before submitting a PR.
4. Follow the existing code style and TypeScript conventions.

### 6. Submitting a Pull Request

1. Fork the repo
2. Create a feature branch
3. Commit with clear messages
4. Open a Pull Request

We welcome improvements to translation logic, new AI providers, UI enhancements, and documentation.
