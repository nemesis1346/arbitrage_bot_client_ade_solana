### versions
node 18

### installation
```
nvm use 18 # (install nvm if not available)
npm install
```

### Testing
node ./check_arbitrage_opportunity.js

### Usage

1. Comment or uncomment the DEX choice in check_arbitrage_opportunity.js line 132, there will pool address 1 and 2.


Optional: You can change the pool addresses by going to the DEX official pages and copy and paste the address in the Public keys in those same lines.  

2. Change the method name in check_arbitrage_opportunity.js line 42 with the correspondent method of the DEX. 
For instance:

```
getPoolDataFromRaydium,
getPoolDataFromOrca,
getPoolDataFromMeteora,
```