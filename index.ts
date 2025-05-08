import { generateMnemonic } from 'bip39';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import {
  decodeSuiPrivateKey,
  encodeSuiPrivateKey,
} from '@mysten/sui/cryptography';
import { toHEX } from '@mysten/sui/utils';

// New imports for transaction signing
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const mnemonic = generateMnemonic();
console.log("Generated Mnemonic:", mnemonic);
const walletCreationKeypair = Secp256k1Keypair.deriveKeypair(mnemonic);
console.log("Wallet Creation Keypair:", walletCreationKeypair);

const bech32EncodedPrivateKey = walletCreationKeypair.getSecretKey();
console.log("Bech32 Encoded Private Key:", bech32EncodedPrivateKey);

const decodedPrivateKey = decodeSuiPrivateKey(bech32EncodedPrivateKey);
console.log("Decoded Private Key:", decodedPrivateKey);

const reEncodedBech32 = encodeSuiPrivateKey(
  decodedPrivateKey.secretKey,
  'Secp256k1'
);
console.log("Re-encoded Bech32:", reEncodedBech32);

const address = walletCreationKeypair.getPublicKey().toSuiAddress();
console.log("Sui Address:", address);

// --- Function to handle Sign & Send Transaction --- 
async function handleSignAndSendTransaction() {
  const txnMnemonicInput = document.getElementById('txnMnemonic') as HTMLTextAreaElement;
  const networkSelect = document.getElementById('network') as HTMLSelectElement;
  const recipientAddressInput = document.getElementById('recipientAddress') as HTMLInputElement;
  const amountSUIInput = document.getElementById('amountSUI') as HTMLInputElement;
  const txnResultEl = document.getElementById('txnResult');

  if (!txnMnemonicInput || !networkSelect || !recipientAddressInput || !amountSUIInput || !txnResultEl) {
    console.error('One or more transaction UI elements are missing');
    if(txnResultEl) txnResultEl.textContent = 'Error: UI elements missing.';
    return;
  }

  const inputMnemonic = txnMnemonicInput.value.trim();
  const selectedNetwork = networkSelect.value as 'testnet' | 'mainnet' | 'devnet';
  const recipientAddress = recipientAddressInput.value.trim();
  const amountSUI = parseFloat(amountSUIInput.value);

  if (!inputMnemonic) {
    txnResultEl.textContent = 'Please enter a mnemonic.';
    return;
  }
  if (!recipientAddress) {
    txnResultEl.textContent = 'Please enter a recipient address.';
    return;
  }
  if (isNaN(amountSUI) || amountSUI <= 0) {
    txnResultEl.textContent = 'Please enter a valid positive amount.';
    return;
  }

  txnResultEl.textContent = 'Processing transaction...';

  try {
    // 1. Initialize SuiClient
    const suiClient = new SuiClient({ url: getFullnodeUrl(selectedNetwork) });

    // 2. Re-derive the keypair (Signer) using Secp256k1Keypair for consistency with wallet creation
    const keypair = Secp256k1Keypair.deriveKeypair(inputMnemonic);
    const senderAddress = keypair.getPublicKey().toSuiAddress();
    console.log("Transaction Sender Address (derived via Secp256k1 default path):", senderAddress);

    // Fetch sender's SUI coins to use for gas
    const gasCoins = await suiClient.getCoins({ owner: senderAddress, coinType: '0x2::sui::SUI' });
    if (!gasCoins.data || gasCoins.data.length === 0) {
      txnResultEl.textContent = `Error: No SUI gas coins found for this address on ${selectedNetwork}.`;
      return;
    }
    const selectedGasCoin = gasCoins.data[0];
    const gasCoinObjectRef = {
      objectId: selectedGasCoin.coinObjectId,
      version: selectedGasCoin.version,
      digest: selectedGasCoin.digest,
    };
    console.log("Using gas coin:", selectedGasCoin);

    // 3. Construct a Transaction
    const txb = new Transaction();
    txb.setGasPayment([gasCoinObjectRef]);

    const amountInMist = Math.round(amountSUI * 1_000_000_000);
    
    const [coinToTransfer] = txb.splitCoins(txb.gas, [txb.pure.u64(amountInMist)]);
    txb.transferObjects([coinToTransfer], txb.pure.address(recipientAddress));
    txb.setSender(senderAddress);

    // 4. Sign and Execute the Transaction
    const result = await suiClient.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
      },
    });
    console.log('Transaction successful! Digest:', result.digest);
    console.log('Effects:', result.effects);
    txnResultEl.textContent = `Transaction Succeeded!\nDigest: ${result.digest}\nStatus: ${result.effects?.status.status}\nGas Used: ${result.effects?.gasUsed?.computationCost || 'N/A'}`;

  } catch (error: any) {
    console.error('Transaction failed:', error);
    txnResultEl.textContent = `Transaction Failed:\n${error.message ? error.message : error.toString()}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Wallet Creation Part
  const mnemonicEl = document.getElementById('mnemonic');
  const reEncodedBech32El = document.getElementById('reEncodedBech32');
  const addressEl = document.getElementById('address');

  if (mnemonicEl) mnemonicEl.textContent = mnemonic;
  else console.error("Element with ID 'mnemonic' not found.");

  if (reEncodedBech32El) reEncodedBech32El.textContent = reEncodedBech32;
  else console.error("Element with ID 'reEncodedBech32' not found.");

  if (addressEl) addressEl.textContent = address;
  else console.error("Element with ID 'address' not found.");

  // Transaction Signing Part
  const sendTxnButton = document.getElementById('sendTxnButton');
  if (sendTxnButton) {
    sendTxnButton.addEventListener('click', handleSignAndSendTransaction);
  } else {
    console.error("Element with ID 'sendTxnButton' not found.");
  }
});