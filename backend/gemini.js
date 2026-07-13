require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Try these in order if one is overloaded
const MODEL_FALLBACKS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askGemini(prompt) {
  let lastError;

  for (const modelName of MODEL_FALLBACKS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastError = err;
        const is503 = err.message && err.message.includes('503');
        if (is503) {
          console.log(`${modelName} overloaded, attempt ${attempt}...`);
          await sleep(2000); // wait 2 seconds before retry
        } else {
          break; // non-503 error, don't retry this model, try next one
        }
      }
    }
  }

  throw lastError;
}

module.exports = { askGemini };