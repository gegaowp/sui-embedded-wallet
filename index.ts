import { generateMnemonic } from 'bip39';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import {
  decodeSuiPrivateKey,
  encodeSuiPrivateKey,
} from '@mysten/sui/cryptography';
import { toHex } from '@mysten/sui/utils';

const mnemonic = generateMnemonic();
console.log("Generated Mnemonic:", mnemonic);
const keypair = Secp256k1Keypair.deriveKeypair(mnemonic);
console.log("Keypair:", keypair);

const bech32EncodedPrivateKey = keypair.getSecretKey();
console.log("Bech32 Encoded Private Key:", bech32EncodedPrivateKey);

const decodedPrivateKey = decodeSuiPrivateKey(bech32EncodedPrivateKey);
console.log("Decoded Private Key:", decodedPrivateKey);

const reEncodedBech32 = encodeSuiPrivateKey(
  decodedPrivateKey.secretKey,
  'Secp256k1'
);
console.log("Re-encoded Bech32:", reEncodedBech32);

const address = keypair.getPublicKey().toSuiAddress();
console.log("Sui Address:", address);

// Directly update the HTML elements
// Ensure the script runs after the DOM is loaded, or elements might not be found.
// A simple way is to wrap it in DOMContentLoaded, or ensure this script is at the end of <body>

document.addEventListener('DOMContentLoaded', () => {
  const mnemonicEl = document.getElementById('mnemonic');
  const reEncodedBech32El = document.getElementById('reEncodedBech32');
  const addressEl = document.getElementById('address');

  if (mnemonicEl) mnemonicEl.textContent = mnemonic;
  else console.error("Element with ID 'mnemonic' not found.");

  if (reEncodedBech32El) reEncodedBech32El.textContent = reEncodedBech32;
  else console.error("Element with ID 'reEncodedBech32' not found.");

  if (addressEl) addressEl.textContent = address;
  else console.error("Element with ID 'address' not found.");
});