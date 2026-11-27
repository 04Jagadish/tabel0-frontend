# Tabelo frontend

## Supabase Google sign-in

1. In [Google Auth Platform](https://console.cloud.google.com/auth/clients), create a **Web application** client. Add `http://localhost:5173` and `https://tabelo.in` under **Authorized JavaScript origins**. Add `https://dbucyfqexxurcmijeaqe.supabase.co/auth/v1/callback` under **Authorized redirect URIs**. For personal Google accounts use an **External** audience. If Google shows a test-user list for the app, add your test account there.
2. In the [Supabase project](https://supabase.com/dashboard/project/dbucyfqexxurcmijeaqe), open **Authentication → Sign In / Providers → Google**. Enable Google and save the client ID and secret from step 1 in the dashboard.
3. Under **Authentication → URL Configuration**, set **Site URL** to `https://tabelo.in`. Add `http://localhost:5173/auth/callback` and `https://tabelo.in/auth/callback` under **Redirect URLs**.
4. Copy the project's **publishable** key from its **API Keys** settings. Put it in the ignored `.env.local` file at the repository root:

   ```dotenv
   VITE_SUPABASE_URL=https://dbucyfqexxurcmijeaqe.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
   ```

   Vite includes both values in the browser bundle. Keep the Google client secret and Supabase secret or service-role keys out of Vite configuration.
5. Run `npm ci` and `npm run dev -- --strictPort`. Open `http://localhost:5173/login` and select **Continue with Google**. The app exchanges the callback code for a session and opens `/dashboard`. Check **Authentication → Users** in Supabase for the test account. To test the route guard, sign out and open `/dashboard` directly.

For production, supply both Vite variables at build time. Cloudflare Access still controls entry to the production hostname and runs before the React app. Verify the new flow locally before changing production Access settings. The account route verifies the signed-in user through Supabase Auth. Enforce customer, restaurant-owner, and admin permissions in the backend and with Supabase Row Level Security before exposing protected data.

[Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)

## Private Cloudflare deployment

1. In Google Cloud, create a **Web application** OAuth client. Set its authorized JavaScript origin to `https://<team-name>.cloudflareaccess.com` and its authorized redirect URI to `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`. Use the **External** audience for personal Gmail accounts.
2. In Cloudflare Zero Trust, open **Integrations → Identity providers**, add **Google**, and enter the Google client ID and secret there. Run **Test** next to the provider.
3. Create a self-hosted Access application for the entire production hostname. Enable Google as a login method and create an Allow policy scoped to approved users or groups. Configure independent MFA for the application or Allow policy. Select **Authenticator application** to require TOTP, and have users enroll through the Cloudflare Access App Launcher.
4. In `wrangler.toml`, uncomment the custom-domain route and replace `app.example.com` with the Access application's hostname. In the Worker's **Settings → Variables and Secrets**, add `ACCESS_TEAM_DOMAIN` as `https://<team-name>.cloudflareaccess.com` (without a trailing slash) and `ACCESS_AUDIENCE` as the Access application's **Application Audience (AUD) Tag**. Wrangler preserves these dashboard variables on deploy.
5. Run `npm ci`, `npm run build`, and `wrangler deploy`. Open the production URL in a private browser window and verify that Access requires Google sign-in and TOTP before serving the app.

If Google reports `redirect_uri_mismatch`, compare its authorized redirect URI with the callback in step 1. If Cloudflare Access denies the signed-in account, check the application's Allow policy. If the app itself returns `Access configuration is unavailable.`, check both Worker variables. If the app itself returns `Access denied.` after sign-in, check that the hostname is covered by Access and that the team domain and AUD tag match that Access application.

The Worker verifies the Access token before serving any asset. Cloudflare Access manages TOTP enrollment, verification, and sessions. Keep TOTP seeds, recovery codes, and Cloudflare credentials out of the repository.

[Google sign-in setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/) · [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [Independent MFA setup](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/)

## Cloudflare Access remediation agent

Run this command from an operator workstation or restricted CI job. Supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` through the operator environment. Use an account-scoped token with Access application and policy read permission for planning. Switch to an authorized token with application policy write permission for applying. Obtain the Access application ID and an application-specific Allow policy ID from Cloudflare Zero Trust.

```powershell
npm.cmd run access:agent -- plan tabelo.in approved@example.com APP_UUID POLICY_UUID
npm.cmd run access:agent -- apply tabelo.in approved@example.com APP_UUID POLICY_UUID APPROVAL_HASH
```

Review the proposed hostname, policy, and exact email with the access owner before passing the printed hash to `apply`. The agent checks the live configuration again before writing and reads the policy back afterward. Run policy changes one at a time because the API update replaces the policy configuration. The CLI emits JSON events for the operator or CI logs. Restrict access to these logs because they contain email addresses.

This runbook extends an existing app-specific Allow policy with individual email Include rules. It preserves Require, Exclude, and MFA settings. If the address is already included, inspect policy order, the selected Google account, and the policy's other conditions in Zero Trust. After a verified policy update, retry sign-in in a private browser window to verify access with the intended Google account.

[Cloudflare application policy API](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/subresources/policies/methods/update/)

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
