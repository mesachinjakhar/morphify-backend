function selectRandomPrompt(array: {}[]) {
  // If the array is empty, return null.
  if (!array || array.length === 0) {
    return null;
  }

  // Select a random index and return the item at that index.
  const randomIndex = Math.floor(Math.random() * array.length);
  let prompt = array[randomIndex];
  return prompt;
}

export default selectRandomPrompt;
