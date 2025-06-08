function createUniqueTriggerWord(modelName: string) {
  // 1. Sanitize the name: convert to lowercase and remove spaces/special characters.
  // This creates a clean, single-word base.
  const cleanedName = modelName.toLowerCase().replace(/[^a-z0-9]/g, ""); // Removes anything that is not a letter or number

  // 2. Generate a short, random alphanumeric string for uniqueness.
  // Math.random().toString(36) creates a string like "0.1f8t3e..."
  // .substring(2, 8) takes a 6-character slice like "1f8t3e"
  const randomPart = Math.random().toString(36).substring(2, 8);

  // 3. Combine the parts and add the conventional "_lora" suffix.
  const triggerWord = `${cleanedName}_${randomPart}_lora`;

  return triggerWord;
}

export default createUniqueTriggerWord;
