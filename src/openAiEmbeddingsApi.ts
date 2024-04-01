import openai from "./openAiSetup";

export const openAiEmbeddings = async (text: string) => {
  return await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
};
