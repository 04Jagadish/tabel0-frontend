# Tabelo frontend

## Private Cloudflare deployment

1. In Google Cloud, create a **Web application** OAuth client. Set its authorized JavaScript origin to `https://<team-name>.cloudflareaccess.com` and its authorized redirect URI to `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`. Use the **External** audience for personal Gmail accounts.
2. In Cloudflare Zero Trust, open **Integrations → Identity providers**, add **Google**, and enter the Google client ID and secret there. Run **Test** next to the provider.
3. Create a self-hosted Access application for the entire production hostname. Enable Google as a login method and create an Allow policy scoped to approved users or groups. Configure independent MFA for the application or Allow policy. Select **Authenticator application** to require TOTP, and have users enroll through the Cloudflare Access App Launcher.
4. In `wrangler.toml`, uncomment the custom-domain route and replace `app.example.com` with the Access application's hostname. In the Worker's **Settings → Variables and Secrets**, add `ACCESS_TEAM_DOMAIN` as `https://<team-name>.cloudflareaccess.com` (without a trailing slash) and `ACCESS_AUDIENCE` as the Access application's **Application Audience (AUD) Tag**. Wrangler preserves these dashboard variables on deploy.
5. Run `npm ci`, `npm run build`, and `wrangler deploy`. Open the production URL in a private browser window and verify that Access requires Google sign-in and TOTP before serving the app.

If Google reports `redirect_uri_mismatch`, compare its authorized redirect URI with the callback in step 1. If Cloudflare Access denies the signed-in account, check the application's Allow policy. If the app itself returns `Access configuration is unavailable.`, check both Worker variables. If the app itself returns `Access denied.` after sign-in, check that the hostname is covered by Access and that the team domain and AUD tag match that Access application.

The Worker verifies the Access token before serving any asset. Cloudflare Access manages TOTP enrollment, verification, and sessions. Keep TOTP seeds, recovery codes, and Cloudflare credentials out of the repository.

[Google sign-in setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/) · [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [Independent MFA setup](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/)

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
