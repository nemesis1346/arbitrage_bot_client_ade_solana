const { WhirlpoolClient, WhirlpoolContext } = require('@orca-so/whirlpools-sdk');
const { Connection, Keypair,clusterApiUrl, LAMPORTS_PER_SOL, address } = require('@solana/web3.js');
const { ORCA_WHIRLPOOL_PROGRAM_ID } = require('@orca-so/whirlpools-sdk');
const fs = require('fs');

let connection = new Connection(clusterApiUrl("devnet"), "confirmed");
console.log('Connection established');

// Load the wallet data from the JSON file
const walletData = JSON.parse(fs.readFileSync('solana_wallet.json'));

// Recreate the Keypair object from the stored private key
const privateKey = new Uint8Array(walletData.privateKey); // Convert back to Uint8Array
const wallet = Keypair.fromSecretKey(privateKey);// Access the public and private keys
console.log("Public Key:", wallet.publicKey.toBase58()); // Public address
console.log("Private Key:", wallet.secretKey); // Secret key (private key)


async function requestAirdrop(wallet) {
    let attempts = 0;
    const maxAttempts = 5;
    const delayIncrement = 1000; // Delay starting from 1 second

    while (attempts < maxAttempts) {
        try {
            // Request airdrop
            // testing purposes , maybe use the faucet to fund https://faucet.solana.com/

            const airdropSignature = await connection.requestAirdrop(
                wallet.publicKey,
                2 * LAMPORTS_PER_SOL // Airdrop 2 SOL
            );

            await connection.confirmTransaction(airdropSignature);
            console.log('Airdrop successful!');
            break;
        } catch (error) {
            console.log(`Attempt ${attempts + 1} failed, retrying...`);
            console.error(error.message);
            attempts++;
            if (attempts < maxAttempts) {
                const delay = delayIncrement * Math.pow(2, attempts); // Exponential backoff
                console.log(`Retrying after ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.log('Maximum retry attempts reached.');
                break;
            }
        }
    }
}


async function main(){
   
    // Not yet working
    // await requestAirdrop(wallet);

    // check the balance of my wallet
    const balance =await connection.getBalance(wallet.publicKey);
    console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    const ctx = WhirlpoolContext.from(connection, wallet,ORCA_WHIRLPOOL_PROGRAM_ID);
    // console.log('Context created:', ctx);
    const client = new WhirlpoolClient(ctx);
    console.log('Client created:', client);
    const whirlpools = await client.getPools(ORCA_WHIRLPOOL_PROGRAM_ID);
    console.log('Available pools:', whirlpools);

    const poolPublicKey = '<POOL_PUBLIC_KEY>'; // Replace with your pool address
    const pool = await client.getPool(poolPublicKey);
    console.log('Pool Info:', pool);



    const accounts = await fetchAllWhirlpoolWithFilter(rpc, filter);
    console.log(accounts);
    
    
  
}

main().catch((error) => {
    console.error('Unexpected Error:', error);
});