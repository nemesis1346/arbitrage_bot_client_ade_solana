const {getContext} = require('./setup_wallet');
const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { WhirlpoolContext, WhirlpoolClient, WhirlpoolData } = require('@orca-so/whirlpools-sdk');
const { PublicKey } = require('@solana/web3.js');
const { LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Decimal = require('decimal.js');

// Use the setup module
const context = getContext();


async function executeTrade(poolAddress, amountIn, amountOutMin) {
    const client = new WhirlpoolClient(ctx);
    const pool = await context.client.getPool(poolAddress);
    const tokenA = pool.tokenA; // Adjust as per actual token names
    const tokenB = pool.tokenB; 
    
    // Define your swap parameters
    const swapInstruction = await client.swap({
        amountIn: amountIn,
        amountOutMin: amountOutMin,
        tokenA: tokenA,
        tokenB: tokenB
    });
    
    // Create and send the transaction
    const tx = new Transaction().add(swapInstruction);
    await connection.sendTransaction(tx, [wallet], { skipPreflight: false, preflightCommitment: 'confirmed' });
    
    console.log('Trade executed');
}

async function getPoolData(poolName, poolAddress) {
    const pool = await context.client.getPool(poolAddress);
    const poolData = pool.getData();
    // console.log("Pool Data:", poolData);
    // console.log('Pool Token A Info:', pool.getTokenAInfo());
    // console.log('Pool Token B Info:', pool.getTokenBInfo());  
    Decimal.set({ precision: 100 });
    const linear_price =  new Decimal(poolData.sqrtPrice.toString()).pow(2);
    // console.log(poolName+ ' Linear Price:',linear_price.toFixed());
    const normalized_price = linear_price.div(new Decimal(2).pow(128));
    console.log(poolName+ ' Normalized Price:',normalized_price.toFixed(6));

    return {
        "pool":pool,
        "tokenAInfo": pool.getTokenAInfo(),
        "tokenBInfo": pool.getTokenBInfo(),
        "normalizedPrice": normalized_price,
    };
  }

async function checkArbitrageOpportunity(pool1Name, pool1Address,pool2Name, pool2Address) {
    const pool1Data = await getPoolData(pool1Name, pool1Address);
    const pool2Data = await getPoolData(pool2Name, pool2Address);
  
    // Calculate the potential profit
    let potentialProfit = 0;
    
    // Assuming we trade 1000 USDC
    let amountIn = 1000; //adjust accordingly
    
    // Trade in Pool 1: USDC -> SOL
    let amountOutFromPool1 = amountIn * (1/pool1Data.normalizedPrice);
    
    // Trade in Pool 2: SOL -> USDC
    let amountOutFromPool2 = amountOutFromPool1 * (1/pool2Data.normalizedPrice);
    
    // Deduct fees
    let fee1 = 0.003 * amountIn;
    let fee2 = 0.003 * amountOutFromPool1;
    
    let totalFees = fee1 + fee2;
    console.log('Total Fees: ', totalFees);
    
    // Final profit after fees
    let finalProfit = amountOutFromPool2 - amountIn - totalFees;
    
    if (finalProfit > 0) {
        console.log("Arbitrage opportunity found! Profit:", finalProfit);
    } else {
        const loses = finalProfit;
        console.log("No profitable arbitrage opportunity, you lose: ", loses);
    }
  }

async function monitorArbitrage() {
    const pool1Address = new PublicKey('C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz'); // JUP/SOL
    const pool2Address = new PublicKey('DkVN7RKTNjSSER5oyurf3vddQU2ZneSCYwXvpErvTCFA'); // JUP/SOL
    
    setInterval(() => {
        checkArbitrageOpportunity("JUP/SOL_1",pool1Address, "BONK/SOL_2",pool2Address);
    }, 15000); // Check every 30 seconds
}

monitorArbitrage();