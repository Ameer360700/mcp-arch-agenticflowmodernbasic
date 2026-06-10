export const addNumbersTool = {
  profile: {
    name: "add_numbers",
    description: "Adds two numbers together. Use this tool sequentially to handle multiple addition steps.",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "The first number" },
        b: { type: "number", description: "The second number" }
      },
      required: ["a", "b"]
    }
  },
  // The actual execution logic (The Muscle)
  execute: async (args) => {
    const { a, b } = args;
    console.log(`Tool executed with a=${a} and b=${b}`);
    return { result: a + b };
  }
};