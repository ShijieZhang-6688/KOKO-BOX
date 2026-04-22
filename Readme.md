# Koko Box UI Prototype

This workspace contains a uni-app Vue prototype that is now standardized for WeChat Mini Program development only.

## Run locally

1. Install dependencies: `npm install`
2. Start the WeChat Mini Program dev build: `npm run dev`
3. Create a production build for the WeChat Mini Program: `npm run build`

## WeChat cloud login

The first real backend feature uses WeChat CloudBase for automatic mini-program login and user-owned database records.

### 1. Create the cloud environment

1. Open this project in WeChat DevTools.
2. Open Cloud Development.
3. Create an environment such as `koko-dev`.
4. Copy the real environment ID from the Cloud Development console.
5. Paste it into `src/config/cloud.ts`:

```ts
export const WECHAT_CLOUD_ENV_ID = 'your-real-env-id'
```

If the environment ID is empty, the app intentionally falls back to a mock session so local Mini Program debugging can continue.

### 2. Create database collections

Create these CloudBase database collections:

- `users`
- `pets`
- `user_settings`

Recommended permission for the first version: users can only read and write their own records. Keep identity-sensitive creation and updates in cloud functions so `_openid` cannot be forged by the client.

### 3. Deploy the login cloud function

1. In WeChat DevTools, find `cloudfunctions/login`.
2. Install dependencies for the cloud function.
3. Upload and deploy the cloud function.
4. Open the mini program profile tab and click `微信自动登录`, or simply enter the page after the cloud env is configured.

The `login` cloud function uses `cloud.getWXContext()` to get `OPENID`, creates the user/pet/settings records on first login, and updates `lastLoginAt` on later logins.

## WeChat DevTools

1. Open the project root in WeChat DevTools.
2. Ensure `app.json`, `pages.json`, and `manifest.json` are present in the root.
3. The Mini Program output directory is fixed at `unpackage/dist/mp-weixin/`.
4. If the output directory does not exist yet, run `npm run dev` once before opening the project in WeChat DevTools.

## Current scope

- WeChat cloud login scaffold
- Cloud database collections for users, pets, and settings
- Mock cross-device status sync
- Pet attribute dashboard
- Growth and care overview
- Gentle reminder cards
- Hardware display preview
- Lightweight AI chat placeholder

## Notes

- Most feature pages are still static UI while login is being connected.
- `unpackage/` is a local build artifact directory and should not be committed.
- CloudBase free quota and billing can change, so confirm the current rules in the WeChat Cloud Development console before release.
