export const sortArrayByDefaultArray = (arrayToSort, defaultArray) => {
  // Create a set for faster lookup
  const defaultSet = new Set(defaultArray);

  // Split the arrayToSort into two parts
  const inDefault = arrayToSort.filter(section => defaultSet.has(section));
  const notInDefault = arrayToSort.filter(
    section => !defaultSet.has(section),
  );

  // Sort the 'inDefault' array according to the order in 'defaultArray'
  inDefault.sort(
    (a, b) => defaultArray.indexOf(a) - defaultArray.indexOf(b),
  );

  // Combine the arrays, placing the 'inDefault' items first
  return inDefault.concat(notInDefault);
};
