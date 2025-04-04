export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const shortenAddress = (address, start = 6, end = 4) => {
  if (!address) return '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};


