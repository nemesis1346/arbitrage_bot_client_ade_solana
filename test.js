const { 
    WhirlpoolContext,
    ORCA_WHIRLPOOLS_CONFIG,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    WhirlpoolAccountFetcher,
    PriceMath,
    increaseLiquidityQuoteByInputToken,
    TickUtil,
    buildWhirlpoolClient,
    PDAUtil
} = require('@orca-so/whirlpools-sdk');
const {
    Connection, 
    Keypair,
    clusterApiUrl, 
    LAMPORTS_PER_SOL,
    PublicKey,
    address,  
} = require('@solana/web3.js');
const fs = require('fs');
const Decimal = require('decimal.js');

// let connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

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

async function get_pool_by_pool_address(tokenA_public_key, tokenB_public_key){
      return PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        ORCA_WHIRLPOOLS_CONFIG,
        tokenA_public_key,
        tokenB_public_key,
        64
    )
}

async function get_pool_by_client(client, pool_address){
    console.log('Param: Pool Address:', typeof(pool_address), pool_address);
    return await client.getPool(pool_address);
}

async function get_pool_information(pool){
    const poolData = pool.getData();
    // console.log('Pool Data:', poolData);
    const poolTokenAInfo = pool.getTokenAInfo();
    // console.log('Pool Token A Info:', poolTokenAInfo);
    const poolTokenBInfo = pool.getTokenBInfo();
    // console.log('Pool Token B Info:', poolTokenBInfo);
    // Derive the tick-indices based on a human-readable price
    const tokenADecimal = poolTokenAInfo.decimals;
    console.log('Token A Decimal:', tokenADecimal);
    const tokenBDecimal = poolTokenBInfo.decimals;
    console.log('Token B Decimal:', tokenBDecimal);
    
    const tickLower = TickUtil.getInitializableTickIndex(
        PriceMath.priceToTickIndex(new Decimal(98), tokenADecimal, tokenBDecimal),
        poolData.tickSpacing
    );
    console.log('Tick Lower:', tickLower);
    const tickUpper = TickUtil.getInitializableTickIndex(
        PriceMath.priceToTickIndex(new Decimal(150), tokenADecimal, tokenBDecimal),
        poolData.tickSpacing
    );
    console.log('Tick Upper:', tickUpper);

    return {
        "poolTokenAInfo": poolTokenAInfo,
        "tickLower": tickLower,
        "tickUpper": tickUpper,
    }
}

async function calculate_arbitrage(poolTokenAInfo, tickLower, tickUpper, whirlpool){
    const fraction = new Decimal(1).div(100);
    
    // Get a quote on the estimated liquidity and tokenIn (50 tokenA)
    const quote = increaseLiquidityQuoteByInputToken(
        poolTokenAInfo.mint,
        new Decimal(50),
        tickLower,
        tickUpper,
        fraction.mul(100),
        whirlpool
    );
    console.log('Quote:', quote);
}

async function initiate_arbitrage(){
    let pool_by_client
    const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
    // console.log('Context created:', ctx);
    const fetcher = new WhirlpoolAccountFetcher(ctx.provider.connection);
    // console.log('Fetcher created:', fetcher);
    const client = buildWhirlpoolClient(ctx, fetcher)
    // console.log('Client created:', client);
    
    const SOL_USDC_64_pool_address = new PublicKey("Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE");
    pool_by_client = await get_pool_by_client(client, SOL_USDC_64_pool_address)
    console.log('Pool by Client:', pool_by_client.address); 
    pool_information = await get_pool_information(pool_by_client);
    console.log('Pool Information:', pool_information);
    
    //TODO: this maybe is not working because it needs to exists in the blockchain, maybe doesnt exists yet
    // const SOL_MINT_pool_address = new PublicKey('So11111111111111111111111111111111111111112');
    // const USDC_MINT_pool_address = new PublicKey('Es9vMFrzaCERz1k1b7z7Z1u1Z1u1Z1u1Z1u1Z1u1Z1u1');
    // const pool_by_pool_address = await get_pool_by_pool_address(SOL_MINT_pool_address, USDC_MINT_pool_address);
    // console.log('Pool by Pool Address address:', pool_by_pool_address.publicKey);
    // pool_by_client = await get_pool_by_client(client, pool_by_pool_address.publicKey)
    // console.log('Pool by Client:', pool.address); 
    // await get_pool_information(pool_by_pool_address);

    await calculate_arbitrage(
        pool_information["poolTokenAInfo"], 
        pool_information["tickLower"], 
        pool_information["tickUpper"], 
        pool_by_client);
    
}


async function main(){
    
    // Not yet working
    // await requestAirdrop(wallet);
    
    // check the balance of my wallet
    const balance =await connection.getBalance(wallet.publicKey);
    console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    
    await initiate_arbitrage();
}

main().catch((error) => {
    console.error('Unexpected Error:', error);
});