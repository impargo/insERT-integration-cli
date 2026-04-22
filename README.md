# insERT / Subiekt123 CLI

Simple TypeScript example for the full insERT OAuth flow and a first Subiekt123 API smoke test.

## Prerequisites

- Node.js 18+
- yarn

## Install

```bash
yarn install
```

## Quick start

Set environment variables:

```bash
export CLIENT_ID="your-client-id"
export CLIENT_SECRET="your-client-secret"
export SUBSCRIPTION_KEY="your-subscription-key"
```

The non-secret defaults are hard-coded at the top of [src/cli.ts](src/cli.ts).

Run the full flow:

```bash
yarn dev
```

## What it does

- Generates PKCE
- Opens the login page
- Waits for the local callback
- Exchanges the code for a token
- Saves the token to `.insert-token.json`
- Calls the documents endpoint and prints the JSON

## Troubleshooting

### `invalid_grant`

Usually means the code expired, was reused, or the redirect URI does not exactly match the app configuration. Restart the flow and finish login quickly.

### `invalid_client`

Usually means the client ID or client secret is wrong, or the OAuth app is misconfigured.

### API `401`

The access token is missing, invalid, or expired. Re-run the full flow to get a fresh token.

### API `403`

Usually points to a bad, missing, or inactive subscription key.

## Security notes

- `.env` and `.insert-token.json` are ignored by git
- secrets should stay in environment variables
