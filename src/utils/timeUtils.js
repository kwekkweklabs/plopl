
export const getCurrentTime = () => {
  return new Date().toISOString();
}

export const getCurrentTimeUnix = () => {
  return Math.floor(Date.now() / 1000);
}

export const convertDateToUnix = (date) => {
  return Math.floor(date.getTime() / 1000);
}

export const manyMinutesAgoUnix = (minutes) => {
  return getCurrentTimeUnix() - (minutes * 60);
}