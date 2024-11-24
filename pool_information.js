const axios = require('axios');
const { PriceMath } = require('@orca-so/whirlpools-sdk');

async function getPoolDataFromRaydium(context, poolAddress) {
  try {
    const url = `https://api-v3.raydium.io/pools/info/ids?ids=${poolAddress}`;
    
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
      },
    });
    const raydium_pool = response.data;
    const metadata_raydium_pool = raydium_pool.data[0];
    // console.log('Raydium Pool Info:', raydium_pool);
    
    return {
      normalizedPrice: 1 / metadata_raydium_pool.price,
      feeRate: metadata_raydium_pool.feeRate,
    };
  } catch (error) {
    console.error('Error fetching Meteora Pool Info:', error.message);
  }
}

async function getPoolDataFromMeteora(context, poolAddress) {
  try {
    const url = 'https://amm-v2.meteora.ag/pools';
    
    const params = {
      address: poolAddress.toString(),
    };
    
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
      },
      params: params,
    });
    const meteora_pool = response.data[0];
    // console.log('response meteora pool data:', meteora_pool);
    
    const pairRatio =
    meteora_pool.pool_token_amounts[0] / meteora_pool.pool_token_amounts[1];
    
    return {
      normalizedPrice: pairRatio,
      feeRate: meteora_pool.total_fee_pct / 100,
    };
  } catch (error) {
    console.error('Error fetching Meteora Pool Info:', error.message);
  }
}

async function getPoolDataFromOrca(context, poolAddress) {
  const pool = await context.client.getPool(poolAddress);
  const poolData = pool.getData();
  console.log('Pool Data:', poolData);
  // console.log('Pool Token A Info:', pool.getTokenAInfo());
  // console.log('Pool Token B Info:', pool.getTokenBInfo());
  const normalized_price = PriceMath.sqrtPriceX64ToPrice(
    poolData.sqrtPrice, 
    pool.getTokenAInfo().decimals,
    pool.getTokenBInfo().decimals
  );
  console.log('Normalized Price:', normalized_price);
  
  return {
    normalizedPrice: normalized_price,
    feeRate: poolData.feeRate / 1_000_000,
  };
}
module.exports = {
  getPoolDataFromRaydium,
  getPoolDataFromOrca,
  getPoolDataFromMeteora,
};
