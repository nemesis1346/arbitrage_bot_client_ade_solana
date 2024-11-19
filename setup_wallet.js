const { 
    WhirlpoolContext,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    WhirlpoolAccountFetcher,
    buildWhirlpoolClient,
} = require('@orca-so/whirlpools-sdk');
const { 
    Connection, 
    Keypair, 
    clusterApiUrl 
} = require('@solana/web3.js');
const fs = require('fs');

// TODO: check how to make this function work:
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
function getContext(){
    const connection = createConnection()
    const wallet = loadWallet()
    const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
    // console.log('Context created:', ctx);
    const fetcher = new WhirlpoolAccountFetcher(ctx.provider.connection);
    // console.log('Fetcher created:', fetcher);
    const client = buildWhirlpoolClient(ctx, fetcher)
    // console.log('Client created:', client);
    return {
        "context" :ctx,
        "client": client,
        "connection": connection,
        "wallet":wallet
    }
}

function createConnection() {
    // Change the network here if needed
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    console.log('Connection established');
    return connection;
}

function loadWallet() {
    // Load the wallet data from the JSON file
    const walletData = JSON.parse(fs.readFileSync('solana_wallet.json'));
    
    // Recreate the Keypair object from the stored private key
    const privateKey = new Uint8Array(walletData.privateKey);
    const wallet = Keypair.fromSecretKey(privateKey);
    
    console.log("Public Key:", wallet.publicKey.toBase58());
    console.log("Wallet loaded successfully");
    return wallet;
}

module.exports = { getContext };