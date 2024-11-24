const { getContext } = require('./setup_wallet');
const {
  getPoolDataFromRaydium,
  getPoolDataFromOrca,
  getPoolDataFromMeteora,
} = require('./pool_information');
const { PublicKey } = require('@solana/web3.js');

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
    tokenB: tokenB,
  });

  // Create and send the transaction
  const tx = new Transaction().add(swapInstruction);
  await connection.sendTransaction(tx, [wallet], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log('Trade executed');
}

async function checkArbitrageOpportunity(pool1Address, pool2Address) {
  const pool1Data = await getPoolDataFromRaydium(context, pool1Address);
  console.log('Pool 1 Data : ', pool1Data);
  const pool2Data = await getPoolDataFromMeteora(context, pool2Address);
  console.log('Pool 2 Data :', pool2Data);

  let amountIn = 10000; //SOL

  // Case 1: Trade Pool 1 → Pool 2
  let amountOutFromPool1 = amountIn * pool1Data.normalizedPrice;
  let amountOutFromPool2 = amountOutFromPool1 * (1 / pool2Data.normalizedPrice);

  let fees1 = pool1Data.feeRate * amountIn;
  let fees2 = pool2Data.feeRate * amountIn; //TODO: these fees are not accurate because are made with Token B
  //   let fees2 = pool2Data.feeRate * amountOutFromPool1; //TODO: these fees are not accurate because are made with Token B
  let totalFees1 = fees1 + fees2;
  console.log('Total Fees (Pool 1 → Pool 2):', totalFees1);
  console.log('AmmountOut from Pool 2: ', amountOutFromPool2);

  let profit1 =
    Math.abs(amountOutFromPool2) - Math.abs(amountIn) - Math.abs(totalFees1);

  console.log('Profit (Pool 1 → Pool 2):', profit1);

  // Case 2: Trade Pool 2 → Pool 1
  let amountOutFromPool2Reverse = amountIn * pool2Data.normalizedPrice;
  let amountOutFromPool1Reverse =
    amountOutFromPool2Reverse * (1 / pool1Data.normalizedPrice);

  let fees1Reverse = pool1Data.feeRate * amountIn;
  let fees2Reverse = pool2Data.feeRate * amountIn;
  let totalFees2 = fees1Reverse + fees2Reverse;
  console.log('Total Fees (Pool 2 → Pool 1):', totalFees2);
  console.log('AmmountOut from Pool 2: ', amountOutFromPool1Reverse);

  let profit2 =
    Math.abs(amountIn) -
    Math.abs(amountOutFromPool1Reverse) -
    Math.abs(totalFees2);
  console.log('Profit (Pool 2 → Pool 1):', profit2);

  // Determine arbitrage direction
  if (profit1 > 0) {
    console.log(
      'Arbitrage opportunity! Buy in Pool 1, sell in Pool 2. Profit:',
      profit1 + '\n'
    );
  } else if (profit2 > 0) {
    console.log(
      'Arbitrage opportunity! Buy in Pool 2, sell in Pool 1. Profit:',
      profit2 + '\n'
    );
  } else {
    console.log('No profitable arbitrage opportunity in either direction.\n');
  }
}

async function executeSwap(poolFrom, poolTo, amountIn, slippage, wallet, orca) {
  const tokenIn = poolFrom.getTokenA(); // Token you're selling
  const tokenOut = poolFrom.getTokenB(); // Token you're buying

  console.log(`Swapping ${amountIn} ${tokenIn.mint} for ${tokenOut.mint}`);

  // Execute swap in the first pool
  const swap1 = await poolFrom.swap(
    wallet,
    tokenIn.mint,
    OrcaU64.fromNumber(amountIn),
    slippage
  );
  console.log('First swap transaction signature:', swap1.signature);

  // Fetch output amount after the first swap
  const amountOut = swap1.outputAmount.toNumber();

  // Execute swap in the second pool
  const swap2 = await poolTo.swap(
    wallet,
    poolTo.getTokenA().mint,
    OrcaU64.fromNumber(amountOut),
    slippage
  );
  console.log('Second swap transaction signature:', swap2.signature);

  console.log('Arbitrage executed successfully!');
}

async function monitorArbitrage() {
  // with radium
  const pool1Address = new PublicKey(
    'EZVkeboWeXygtq8LMyENHyXdF5wpYrtExRNH9UwB1qYw'
  ); // JUP/SOL
  // const pool2Address = new PublicKey(
  //   '7WMCUyZXrDxNjAWjuh2r7g8CdT2guqvrmdUPAnGdLsfG'
  // ); // JUP/SOL

  // with orca
  //   const pool1Address = new PublicKey(
  //     'C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz'
  //   ); // JUP/SOL
  //   const pool2Address = new PublicKey(
  //     'DkVN7RKTNjSSER5oyurf3vddQU2ZneSCYwXvpErvTCFA'
  //   ); // JUP/SOL

  // const pool1Address = new PublicKey('6cBGJQohD7mUHe5VBEwysbPxNZewCATFhhnc5yMAyU7S'); // ELIZA/SOL
  // const pool2Address = new PublicKey('5XRwBfvsrmn1fy1hzrPrwFHr2rADJCeZDxPxVE1PNzhf'); // ELIZA/SOL

  //with meteora
  // const pool1Address = new PublicKey(
  //   'hPkPt9Mvu3f6Bpky38ekfqRb37DSFnHtdjnFpfF86wY'
  // ); // JUP/SOL
  const pool2Address = new PublicKey(
    '2bgMd1TDJRvn9rw1fFsMHoERnmHemwfEA1FCikTpuWaJ'
  ); // JUP/SOL

  setInterval(async () => {
    checkArbitrageOpportunity(pool1Address, pool2Address);
    // let raydium_pool =await getPoolDataFromRaydium("EZVkeboWeXygtq8LMyENHyXdF5wpYrtExRNH9UwB1qYw");
    // console.log('Raydium Pool:', raydium_pool);
  }, 15000); // Check every 30 seconds
}

monitorArbitrage();
