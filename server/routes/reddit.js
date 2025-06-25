// routes/reddit.js
const fs = require('fs');
const express = require("express");
const router = express.Router();
const { getAuthUrl, getAccessToken, getNewAccessToken, getRedditUserInfo } = require("../helpers/redditOauth");
const axios = require("axios");
const {OpenAI} = require("openai");
require("dotenv").config();
const User = require('../models/user');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let savedAccessToken = null;
let savedRefreshToken = null;    // Store in memory for now

try {
    const tokens = JSON.parse(fs.readFileSync("tokens.json", "utf8"));
    savedAccessToken = tokens.accessToken;
    savedRefreshToken = tokens.refreshToken;
    console.log("Loaded tokens from file");
  } catch {
    console.log("No saved tokens found.");
  }

// Redirect user to Reddit auth
router.get("/login", (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// Handle Reddit callback
/*router.get("/callback", async (req, res) => {
  const { code } = req.query;
  console.log(`code : ${code}`);
  try {
    const { accessToken, refreshToken } = await getAccessToken(code);

    savedAccessToken = accessToken;
    savedRefreshToken = refreshToken;

    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);

    fs.writeFileSync("tokens.json", JSON.stringify({ accessToken, refreshToken }));

    res.send(`
      <h3>Reddit Auth Successful 🎉</h3>
      <p>You can now fetch Reddit posts.</p>
      <p><strong>Access Token:</strong> ${accessToken}</p>
      <p><strong>Refresh Token:</strong> ${refreshToken}</p>
    `);
  } catch (err) {
    console.error("Token exchange failed:", err);
    res.status(500).send("Reddit Auth Failed");
  }
});
*/

router.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { accessToken, refreshToken } = await getAccessToken(code);
    console.log(`tokens: ${accessToken}, and ${refreshToken}`);
    const userInfo = await getRedditUserInfo(accessToken);

    const { name: redditUsername, id: redditId } = userInfo;

    savedAccessToken = accessToken;
    savedRefreshToken = refreshToken;

    // Persist in DB
    await User.findOneAndUpdate(
      { redditUsername },
      { redditId, accessToken, refreshToken },
      { upsert: true, new: true }
    );

    // Optional: save locally (dev only)
    fs.writeFileSync("tokens.json", JSON.stringify({ accessToken, refreshToken }));

    // Redirect to frontend
    res.redirect(`https://redditreplytool.netlify.app/dashboard?user=${redditUsername}`);
  } catch (err) {
    console.error("OAuth callback error:", err.response?.data || err.message);
    res.status(500).send("Reddit Auth Failed");
  }
});




const keywords = ["AI", "SaaS", "startup"];
const relevantSubreddits = ["ArtificialInteligence", "Startup", "Marketing"]

async function fetchPostsWithAuth(keywords, relevantSubreddits) {
  let headers = {
    Authorization: `Bearer ${savedAccessToken}`,
    "User-Agent": process.env.USER_AGENT
  };

  const subredditQuery = relevantSubreddits.join("+");
  let allResults = [];

  for (const keyword of keywords) {
    try {
      const response = await axios.get(`https://oauth.reddit.com/r/${subredditQuery}/search`, {
        headers,
        params: {
          q: keyword,
          sort: "top",
          t: "month",
          limit: 5,
          restrict_sr: true
        }
      });

      const posts = response.data.data.children.map(p => {
        const title = p.data.title || "";
        const body = p.data.selftext || "";
        const allText = `${title} ${body}`.toLowerCase();

        let hitCount = 0;
        for (const kw of keywords) {
          const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, "g");
          hitCount += (allText.match(regex) || []).length;
        }

        const totalWords = allText.split(/\s+/).length || 1; // avoid division by 0
        const confidence = +(hitCount / totalWords).toFixed(3);

        console.log(`subreddit: ${p.data.subreddit}`);
          return {
            title,
            url: `https://reddit.com${p.data.permalink}`,
            score: p.data.score,
            subreddit: p.data.subreddit,
            body,
            created_utc: p.data.created_utc,
            num_comments: p.data.num_comments,
            confidence
          };
      }).filter(post => post.confidence > 0);

      allResults.push(...posts);

    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log(`Access token expired. using ${savedRefreshToken} Refreshing...`);
        savedAccessToken = await getNewAccessToken(savedRefreshToken);

        headers.Authorization = `Bearer ${savedAccessToken}`;

        const retryResp = await axios.get(`https://oauth.reddit.com/r/${subredditQuery}/search`, {
          headers,
          params: {
            q: keyword,
            sort: "top",
            t: "month",
            limit: 5,
            restrict_sr: true
          }
        });

        const retryPosts = retryResp.data.data.children.map(p => {
          const title = p.data.title || "";
          const body = p.data.selftext || "";
          const allText = `${title} ${body}`.toLowerCase();

          let hitCount = 0;
          for (const kw of keywords) {
            const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, "g");
            hitCount += (allText.match(regex) || []).length;
          }

          const totalWords = allText.split(/\s+/).length || 1;
          const confidence = +(hitCount / totalWords).toFixed(3);

            return {
              title,
              url: `https://reddit.com${p.data.permalink}`,
              score: p.data.score,
              subreddit: p.data.subreddit,
              body,
              created_utc: p.data.created_utc,
              num_comments: p.data.num_comments,
              confidence
            };
        }).filter(post => post.confidence > 0);


        allResults.push(...retryPosts);
      } else {
        console.error(`Failed for keyword ${keyword}:`, err.message);
      }
    }
  }

  //Sort based on "score" upvotes
  allResults.sort((a, b) => b.score - a.score);

  console.log("allResults sorted");

  return allResults;
}



// Search Reddit posts (hardcoded keywords)
router.get("/posts", async (req, res) => {
    if (!savedAccessToken || !savedRefreshToken) {
      return res.status(401).send("Reddit not authenticated yet.");
    }
  
    try {
      const posts = await fetchPostsWithAuth(keywords, relevantSubreddits);  // 🔥 call the helper function
      res.json(posts);
    } catch (err) {
      console.error("Failed to fetch Reddit posts:", err);
      res.status(500).send("Something went wrong while fetching posts.");
    }
  });


  router.post("/keyword-search", async (req, res) => {
    const { keywords } = req.body;
    const relevantSubreddits = keywords;
  
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: "Keywords array is required" });
    }
  
    if (!savedAccessToken || !savedRefreshToken) {
      return res.status(401).json({ error: "Reddit not authenticated" });
    }
  
    try {
      // Use the helper function to fetch posts for all keywords
      const posts = await fetchPostsWithAuth(keywords, relevantSubreddits);
      res.json(posts);
    } catch (err) {
      console.error("Reddit API error:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to fetch Reddit posts" });
    }
  });
  

  router.post("/generate-reply", async (req, res) => {
    const { title, body, redditUsername } = req.body;
  
    if (!title && !body && !redditUsername) {
      return res.status(400).json({ error: "Post content is missing." });
    }

    const currentUser = await User.findOne({redditUsername : redditUsername});
    const{brandname, brandDescription, industry, keySolution, targetAudience, coreProblems, notableResults, additionalPrompt} = currentUser;

    console.log(`brandname: ${brandname}, brandDesription ${brandDescription}, industry: ${industry}`);

    const systemPrompt = `You are acting as the marketing lead of ${brandname}, a ${brandDescription}.

You help your target audience (${targetAudience}) solve ${coreProblems} using ${keySolution}. You've worked with ${notableResults}, so you know what actually works in the real world.

You're replying to Reddit threads with the goal of being genuinely helpful and insightful. Your secondary goal is to subtly showcase your experience and brand without being promotional.

Tone: Friendly, sharp, conversational—like an experienced founder or growth marketer sharing real advice. No fluff, no jargon, no hard selling, no unnecessary links.

Additional Prompt: ${additionalPrompt}.

Avoid: Marketing buzzwords, overexplaining, clichés, or sounding like you're pitching something. Reddit users value authenticity.`;
  
    const userPrompt = `
  Write a thoughtful Reddit comment replying to the following thread:

Title: ${title}
Body: ${body || "(no body text)"}

Structure:
- Start by validating or empathizing with the OP's challenge
- Share 1-2 practical, non-obvious insights or tactics
- Casually reference your brand or experience (only if relevant)
- End helpfully: e.g., “happy to expand if helpful” or “can share more on this if you're curious".

Stay natural. Avoid sounding like a pitch.

  Your reply:
  `;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // or "gpt-3.5-turbo"
        messages: [
          { role: "system", content: systemPrompt},
          { role: "user", content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      });
  
      const reply = response.choices[0].message.content.trim();
      res.json({ reply });
    } catch (err) {
      console.error("OpenAI error:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to generate reply." });
    }
  });


  router.post("/save-user-info", async (req, res) => {
    const { name, brandname, brandDescription, redditUsername, targetAudience, keySolution, notableResults, coreProblems, additionalPrompt  } = req.body;
    console.log(`brandname ${brandname}`);
  
    try {
    
      if (!redditUsername) {
        return res.status(400).json({ error: "redditUsername is required" });
      }
    
      const updatedUser = await User.findOneAndUpdate(
        { redditUsername }, // Find by redditUsername
        { name, brandname, brandDescription, targetAudience, keySolution, notableResults, coreProblems, additionalPrompt }, // Fields to update
        { new: true, upsert: true } // Return updated doc, create if not exists
      );
    
      res.json({ message: "User info saved", user: updatedUser });
    } catch (err) {
      console.error("DB save error:", err);
      res.status(500).json({ error: "Could not save user info" });
    }
    
  });


/*
router.get("/posts", async (req, res) => {
  if (!savedToken) return res.status(401).send("Not Authenticated");

  const keywords = ["AI", "SaaS", "startup"];
  const headers = {
    Authorization: `Bearer ${savedAccessToken}`,
    "User-Agent": process.env.USER_AGENT
  };

  let results = [];

  for (const keyword of keywords) {
    const resp = await axios.get("https://oauth.reddit.com/search", {
      headers,
      params: {
        q: keyword,
        sort: "new",
        limit: 3
      }
    });

    const posts = resp.data.data.children.map(p => ({
      title: p.data.title,
      url: `https://reddit.com${p.data.permalink}`,
      score: p.data.score,
      subreddit: p.data.subreddit,
      body: p.data.selftext
    }));

    results.push(...posts);
  }

  res.json(results);
});
*/

module.exports = router;
