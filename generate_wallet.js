const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

// Display a message to the user
console.log("WARNING: This script will generate a new Solana wallet and save the private key in a JSON file.");
console.log("Make sure to store the private key securely and do not share it with anyone. If you lose the private key, you lose access to your funds.");
console.log("Press Enter to proceed, or Ctrl+C to cancel...");

// Wait for user input before proceeding
process.stdin.once('data', () => {
  // Generate a new wallet
  const wallet = Keypair.generate();
  const privateKey = wallet.secretKey;
  const publicKey = wallet.publicKey.toBase58();

  // Create a file with wallet information
  const walletData = {
    privateKey: Array.from(privateKey),  // Convert Uint8Array to plain array for JSON storage
    publicKey: publicKey
  };

  // Save the wallet data to a JSON file
  fs.writeFileSync('solana_wallet.json', JSON.stringify(walletData));

  console.log('Wallet saved:', publicKey);
});
