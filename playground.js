//This script was just initial playgrounds with the sdk,
const {
    getContext
} = require('./setup_wallet');
const { 
    ORCA_WHIRLPOOLS_CONFIG,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    PriceMath,
    increaseLiquidityQuoteByInputToken,
    TickUtil,
    PDAUtil
} = require('@orca-so/whirlpools-sdk');
const {
    LAMPORTS_PER_SOL,
    PublicKey,
} = require('@solana/web3.js');
const Decimal = require('decimal.js');

// Use the setup module
const context = getContext()

async function get_pool_by_pool_pair(tokenA_public_key, tokenB_public_key){
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
    const tokenBDecimal = poolTokenBInfo.decimals;
    
    const tickLower = TickUtil.getInitializableTickIndex(
        PriceMath.priceToTickIndex(new Decimal(98), tokenADecimal, tokenBDecimal),
        poolData.tickSpacing
    );
    const tickUpper = TickUtil.getInitializableTickIndex(
        PriceMath.priceToTickIndex(new Decimal(150), tokenADecimal, tokenBDecimal),
        poolData.tickSpacing
    );

    return {
        "poolTokenAInfo": poolTokenAInfo,
        "poolTokenBInfo": poolTokenBInfo,
        "tokenADecimal": tokenADecimal,
        "tokenBDecimal": tokenBDecimal,
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
    const client = context.client
    
    const SOL_USDC_64_pool_address = new PublicKey("Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE");
    pool_by_client = await get_pool_by_client(client, SOL_USDC_64_pool_address)
    console.log('Pool by Client:', pool_by_client.address); 
    pool_information = await get_pool_information(pool_by_client);
    console.log('Pool Information:', pool_information);
    
    //TODO: this maybe is not working because it needs to exists in the blockchain, maybe doesnt exists yet
    // const SOL_MINT_pool_address = new PublicKey('So11111111111111111111111111111111111111112');
    // const USDC_MINT_pool_address = new PublicKey('Es9vMFrzaCERz1k1b7z7Z1u1Z1u1Z1u1Z1u1Z1u1Z1u1');
    // const pool_by_pool_pair = await get_pool_by_pool_pair(SOL_MINT_pool_address, USDC_MINT_pool_address);
    // console.log('Pool by token pair:', pool_by_pool_pair);
    // pool_by_client = await get_pool_by_client(client, pool_by_pool_pair.publicKey)
    // console.log('Pool by Client:', pool_by_client); 
    // await get_pool_information(pool_by_pool_pair);

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
    const balance =await context.connection.getBalance(context.wallet.publicKey);
    console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    
    await initiate_arbitrage();
}

main().catch((error) => {
    console.error('Unexpected Error:', error);
});