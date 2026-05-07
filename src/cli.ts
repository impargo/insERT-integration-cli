#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import open from 'open';

const CONFIG = {
    authorizeUrl: 'https://kontoapi.insert.com.pl/connect/authorize',
    tokenUrl: 'https://kontoapi.insert.com.pl/connect/token',
    apiUrl: 'https://api.subiekt123.pl/1.0/documents?pageNumber=0&pageSize=5',
    callbackUrl: 'https://localhost:9876/callback',
    scope: 'openid profile email subiekt123 offline_access',
    tokenFile: '.insert-token.json',
    timeoutMs: 120000
};

const CLIENT_ID = process.env.CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? '';
const SUBSCRIPTION_KEY = process.env.SUBSCRIPTION_KEY ?? '';

main().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
});

async function main() {
    if (!CLIENT_ID || !SUBSCRIPTION_KEY) throw new Error('Set CLIENT_ID and SUBSCRIPTION_KEY first.');
    const callbackUrl = new URL(CONFIG.callbackUrl);
    const verifier = base64url(randomBytes(48));
    const state = base64url(randomBytes(24));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const authUrl = new URL(CONFIG.authorizeUrl);
    authUrl.search = new URLSearchParams({
        response_type: 'code', client_id: CLIENT_ID, redirect_uri: CONFIG.callbackUrl, scope: CONFIG.scope,
        state, code_challenge: challenge, code_challenge_method: 'S256'
    }).toString();

    const code = waitForCode(callbackUrl, state);
    console.log('Login URL:', authUrl.toString());
    await open(authUrl.toString()).catch(() => undefined);

    const token = await fetch(CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
            grant_type: 'authorization_code', client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
            code: await code, redirect_uri: CONFIG.callbackUrl, code_verifier: verifier
        })
    }).then((r) => r.json() as Promise<{ access_token: string }>);

    await writeFile(CONFIG.tokenFile, JSON.stringify(token, null, 2));

    const documents = await fetch(CONFIG.apiUrl, {
        headers: {
            Authorization: `Bearer ${token.access_token}`,
            'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
            'x-api-version': '1.0',
            Accept: 'application/json'
        }
    }).then((r) => r.json());

    console.log('Token saved to', CONFIG.tokenFile);
    console.log(JSON.stringify(documents, null, 2));
}

function waitForCode(callbackUrl: URL, state: string) {
    return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => { server.close(); reject(new Error('OAuth callback timed out.')); }, CONFIG.timeoutMs);
        const server = createServer((req, res) => {
            const url = new URL(req.url ?? '/', callbackUrl);
            if (url.pathname !== callbackUrl.pathname) return res.end('Wrong path');
            if (url.searchParams.get('state') !== state) return done(new Error('State mismatch.'));
            const code = url.searchParams.get('code');
            if (!code) return done(new Error('No code returned.'));
            res.end('Auth complete. Return to the terminal.');
            done(undefined, code);
        });
        const done = (error?: Error, code?: string) => {
            clearTimeout(timer);
            server.close();
            if (error) reject(error); else resolve(code!);
        };
        server.listen(Number(callbackUrl.port), callbackUrl.hostname);
    });
}

function base64url(value: Buffer) {
    return value.toString('base64url');
}
