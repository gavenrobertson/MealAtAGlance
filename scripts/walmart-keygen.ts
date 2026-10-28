import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

// Generates the RSA key pair Walmart's Affiliate API needs.
// Upload keys/walmart_public_key.pem at walmart.io; keep the private key on the server only.
const dir = 'keys';
const privPath = `${dir}/walmart_private_key.pem`;
const pubPath = `${dir}/walmart_public_key.pem`;

if (existsSync(privPath)) {
  console.error(`${privPath} already exists. Delete it first if you really want a new key (you'd need to re-upload the public key).`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
writeFileSync(privPath, privateKey, { mode: 0o600 });
writeFileSync(pubPath, publicKey);

console.log(`✔ Wrote ${privPath} (secret) and ${pubPath}

Next:
  1. Upload the contents of ${pubPath} in your walmart.io application ("Upload public key").
  2. Copy the Consumer ID and key version it shows you.
  3. In .env set:
       WALMART_CONSUMER_ID=<consumer id>
       WALMART_KEY_VERSION=<key version, usually 1>
       WALMART_PRIVATE_KEY_PATH=${privPath}
`);
