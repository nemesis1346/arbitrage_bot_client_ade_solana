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
        "normalizedPrice": normalized_price,
        "feeRate": (poolData.feeRate/1_000_000) 
    };
}

async function checkArbitrageOpportunity(pool1Name, pool1Address,pool2Name, pool2Address) {
    const pool1Data = await getPoolData(pool1Name, pool1Address);
    console.log("Pool 1 Data : ", pool1Data);
    const pool2Data = await getPoolData(pool2Name, pool2Address);
    console.log("Pool 2 Data :", pool2Data);

    let amountIn = 100000; //SOL
    
    // Case 1: Trade Pool 1 → Pool 2
    let amountOutFromPool1 = amountIn * pool1Data.normalizedPrice;
    let amountOutFromPool2 = amountOutFromPool1 * (1 / pool2Data.normalizedPrice);
    
    let fees1 = pool1Data.feeRate* amountIn;
    let fees2 = pool2Data.feeRate * amountOutFromPool1;
    let totalFees1 = fees1 + fees2;
    console.log("Total Fees (Pool 1 → Pool 2):", totalFees1);
    
    let profit1 = Math.abs(amountOutFromPool2) - Math.abs(amountIn) - Math.abs(totalFees1);
    
    console.log("Profit (Pool 1 → Pool 2):", profit1);
    
    // Case 2: Trade Pool 2 → Pool 1
    let amountOutFromPool2Reverse = amountIn * pool2Data.normalizedPrice;
    let amountOutFromPool1Reverse = amountOutFromPool2Reverse * (1 / pool1Data.normalizedPrice);
    
    let fees1Reverse = pool1Data.feeRate* amountIn;
    let fees2Reverse = pool2Data.feeRate * amountOutFromPool2Reverse;
    let totalFees2 = fees1Reverse + fees2Reverse;
    console.log("Total Fees (Pool 2 → Pool 1):", totalFees2);

    let profit2 = Math.abs(amountOutFromPool1Reverse) - Math.abs(amountIn) - Math.abs(totalFees2);
    
    console.log("Profit (Pool 2 → Pool 1):", profit2);
    
    // Determine arbitrage direction
    if (profit1 > 0) {
        console.log("Arbitrage opportunity! Buy in Pool 1, sell in Pool 2. Profit:", profit1);
    } else if (profit2 > 0) {
        console.log("Arbitrage opportunity! Buy in Pool 2, sell in Pool 1. Profit:", profit2);
    } else {
        console.log("No profitable arbitrage opportunity in either direction.");
    }
}

async function executeSwap(poolFrom, poolTo, amountIn, slippage, wallet, orca) {
    const tokenIn = poolFrom.getTokenA(); // Token you're selling
    const tokenOut = poolFrom.getTokenB(); // Token you're buying
    
    console.log(`Swapping ${amountIn} ${tokenIn.mint} for ${tokenOut.mint}`);
    
    // Execute swap in the first pool
    const swap1 = await poolFrom.swap(wallet, tokenIn.mint, OrcaU64.fromNumber(amountIn), slippage);
    console.log("First swap transaction signature:", swap1.signature);
    
    // Fetch output amount after the first swap
    const amountOut = swap1.outputAmount.toNumber();
    
    // Execute swap in the second pool
    const swap2 = await poolTo.swap(wallet, poolTo.getTokenA().mint, OrcaU64.fromNumber(amountOut), slippage);
    console.log("Second swap transaction signature:", swap2.signature);
    
    console.log("Arbitrage executed successfully!");
}

async function monitorArbitrage() {
    const pool1Address = new PublicKey('C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz'); // JUP/SOL
    const pool2Address = new PublicKey('DkVN7RKTNjSSER5oyurf3vddQU2ZneSCYwXvpErvTCFA'); // JUP/SOL
    // const pool1Address = new PublicKey('6cBGJQohD7mUHe5VBEwysbPxNZewCATFhhnc5yMAyU7S'); // ELIZA/SOL
    // const pool2Address = new PublicKey('5XRwBfvsrmn1fy1hzrPrwFHr2rADJCeZDxPxVE1PNzhf'); // ELIZA/SOL
    
    setInterval(() => {
        checkArbitrageOpportunity("ELIZA/SOL_1",pool1Address, "ELIZA/SOL_2",pool2Address);
    }, 15000); // Check every 30 seconds
}

monitorArbitrage();