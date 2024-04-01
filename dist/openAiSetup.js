import OpenAI from "openai";
const openai = new OpenAI({
    organization: process.env.OPENAI_ORGANISATION,
    apiKey: process.env.OPENAI_API_KEY,
});
export default openai;
