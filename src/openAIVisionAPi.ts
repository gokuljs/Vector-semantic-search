import openai from "./openAiSetup";

export const openAiVisionApi = async (url: string, prompt: string) => {
  return await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "the system only speaks in JSON. Do not generate output that isn’t in properly formatted JSON.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: url,
            },
          },
        ],
      },
    ],
  });
};
