const { OpenAI } = require("openai");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function isPostRelevantToUser(post, userProfile) {
  const {
    brandDescription,
    targetAudience,
    coreProblems,
    keySolutionProduct,
    notableResults
  } = userProfile;

  console.log("checking relevance for :" , brandDescription, targetAudience, coreProblems, keySolutionProduct, notableResults);

  const title = post.title || "";
  const body = post.body || "";

  const systemPrompt = `You are a smart Reddit marketing assistant. Your job is to determine whether a Reddit post is a good opportunity for the user to reply and subtly promote their brand.`;
  
  const userPrompt = `
Here is the Reddit post:
Title: "${title}"
Body: "${body.length > 800 ? body.slice(0, 800) + '...' : body}"

Here is the user's brand profile:
- Description: ${brandDescription}
- Audience: ${targetAudience}
- Problems Addressed: ${coreProblems}
- Solution: ${keySolutionProduct}
- Results: ${notableResults}

Question: Is this post a good opportunity for the user to reply in a non-promotional, helpful way while softly showcasing their brand. "Yes" only if it is clearly relevant, nothing vague? 
Answer "Yes" or "No" only(without any punctuation).
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 5
    });

    const answer = response.choices[0].message.content.trim().toLowerCase();
    console.log(`openAI validation for: ${title} is \n ${answer}`);
    return answer.startsWith("yes");
  } catch (error) {
    console.error("OpenAI relevance check failed:", error.message);
    return false; // fallback: skip post if uncertain
  }
}

module.exports = { isPostRelevantToUser };
