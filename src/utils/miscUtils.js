import { customAlphabet } from "nanoid";

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const alphanumericNanoid = customAlphabet(alphabet, 16);

// custom alphabet, alphanumeric
export const getAlphanumericId = (length = 16) => {
  return alphanumericNanoid(length);
}

export const shortenAddress = (address, startLength = 6, endLength = 4) => {
  return address.slice(0, startLength) + "..." + address.slice(-endLength);
}
