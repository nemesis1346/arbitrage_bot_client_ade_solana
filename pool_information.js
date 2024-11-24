const Decimal = require('decimal.js');
const axios = require('axios');
const {
  getTokenMetadata,
  getMint,
  TOKEN_2022_PROGRAM_ID,
} = require('@solana/spl-token');
const { PublicKey, Connection, clusterApiUrl } = require('@solana/web3.js');

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
        "accept": 'application/json',
      },
      params: params
    });
    const meteora_pool = response.data[0];
    // console.log('response meteora pool data:', meteora_pool);

    const pairRatio  = meteora_pool.pool_token_amounts[0]/meteora_pool.pool_token_amounts[1]

    return {
        normalizedPrice: pairRatio,
        feeRate: meteora_pool.total_fee_pct/100,
      };
  } catch (error) {
    console.error('Error fetching Meteora Pool Info:', error.message);
  }
}

async function getPoolDataFromOrca(context, poolAddress) {
  const pool = await context.client.getPool(poolAddress);
  const poolData = pool.getData();
  //   console.log('Pool Data:', poolData);
  // console.log('Pool Token A Info:', pool.getTokenAInfo());
  // console.log('Pool Token B Info:', pool.getTokenBInfo());
  Decimal.set({ precision: 100 });
  const linear_price = new Decimal(poolData.sqrtPrice.toString()).pow(2);
  // console.log(poolName+ ' Linear Price:',linear_price.toFixed());
  const normalized_price = linear_price.div(new Decimal(2).pow(128));
  console.log('Normalized Price:', normalized_price.toFixed(6));

  //TODO: get the name of the token
  // Fetch token mint information
  //   console.log(
  //     'Token A Mint is PublicKey:',
  //     pool.getTokenAInfo().mint instanceof PublicKey
  //   );
  //   console.log(
  //     'Connection is connection:',
  //     context.connection instanceof Connection
  //   );

  //   const mintDetails = await getMint(
  //     new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'),
  //     new PublicKey('HVJuVW2dRbZ2fynWEY2JK6Ak2YTfVpji73sHZMCqiXSb'),
  //     undefined,
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   console.log('Mint Details:', mintDetails);

  //   const mintInfo = await getTokenMetadata(
  //     //   context.connection,
  //     new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'),
  //     // pool.getTokenAInfo().mint.PublicKey,
  //     new PublicKey('HVJuVW2dRbZ2fynWEY2JK6Ak2YTfVpji73sHZMCqiXSb'),
  //     'confirmed',
  //     TOKEN_2022_PROGRAM_ID
  //   );
  //   // Token metadata
  //   console.log('MintInfo:', mintInfo);

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
