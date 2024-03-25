export const PROMPT = `
Analyzing image data to identify subjects, themes, contexts, and description (complete inDetail description of the message) of the message categorizing them accordingly and give it to me in a stringified object so that i can easily parse the output.
For Example: this format just returns an object without any text
{
  "subjects": ["dog"],
  "attributes": ["black", "running"],
  "themes": ["adventure"],
  "contexts": ["outdoors", "park"],
  "description" :"In detail description of the message"
}
`;

export const PORT = process.env.PORT || 2000;
