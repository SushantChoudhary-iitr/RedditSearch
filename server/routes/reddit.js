// routes/reddit.js
const fs = require('fs');
const express = require("express");
const router = express.Router();
const { getAuthUrl, getAccessToken, getNewAccessToken, getRedditUserInfo } = require("../helpers/redditOauth");
const { fetchAllPosts } = require("../helpers/fetchAllPosts");
const {fetchSemanticPosts} = require ("../helpers/fetchSemanticPosts");
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
          sort: "hot",
          t: "month",
          limit: 20,
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
      });

      //.filter(post => post.confidence > 0)

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
            sort: "hot",
            t: "month",
            limit: 20,
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
        });

        //.filter(post => post.confidence > 0)


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

      //const posts = await fetchPostsWithAuth(keywords, relevantSubreddits);
      //const posts = await fetchAllPosts(keywords, relevantSubreddits, savedAccessToken, savedRefreshToken);
      const posts = await fetchSemanticPosts(keywords, savedAccessToken, savedRefreshToken);
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
    const{brandname, brandDescription, industry, keySolutionProduct, targetAudience, coreProblems, notableResults, additionalPrompt} = currentUser;

    console.log(`brandname: ${brandname}, brandDesription ${brandDescription}, industry: ${industry}`);

    const systemPrompt = `You're a Reddit-savvy founder of ${brandname}, a ${brandDescription}, helping users solve ${coreProblems} using ${keySolutionProduct}.

You're replying to Reddit posts not to promote, but to share real, useful insights drawn from your experience. Mention your brand only if it fits naturally.

Brand Context:
- Target Audience: ${targetAudience}
- Key Wins: ${notableResults}
- Extra Guidance: ${additionalPrompt}

Tone: Human, helpful, sharp. Avoid clichés, overexplaining, and marketing speak.`;
  
    const userPrompt = `
  Write a thoughtful Reddit comment replying to the following thread:

Title: ${title}
Body: ${body || "(no body text)"}

- Start by validating or empathizing with the OP's challenge. Use conversational style: "I've found that...", "In my experience...", "What's worked for me...".
Include mild imperfections: occasional typos, contractions, casual grammar.
Strategic Brand Mention Patterns(USE any one of the following BEst suited to the OP's post):
1. Tool Suggestion: Casually list tools, mention your brand if relevant. end with but [other tool] might work better if [different scenario].
2. Personal Story: Share a challenge, how your brand helped. end with That said, [honest caveat or balanced view]
3. Expert Insight: Offer advice tied to your brand's core value, no mention.
4. Comparison: Discuss multiple approaches, highlight your brand's approach naturally.

Stay natural. Avoid sounding like a pitch.

  Your reply:
  `;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // or "gpt-3.5-turbo"
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
    const { name, brandname, brandDescription, redditUsername, targetAudience, keySolutionProduct, notableResults, coreProblems, additionalPrompt  } = req.body;
    console.log(`brandname ${brandname}`);
  
    try {
    
      if (!redditUsername) {
        return res.status(400).json({ error: "redditUsername is required" });
      }
    
      const updatedUser = await User.findOneAndUpdate(
        { redditUsername }, // Find by redditUsername
        { name, brandname, brandDescription, targetAudience, keySolutionProduct, notableResults, coreProblems, additionalPrompt }, // Fields to update
        { new: true, upsert: true } // Return updated doc, create if not exists
      );
    
      res.json({ message: "User info saved", user: updatedUser });
    } catch (err) {
      console.error("DB save error:", err);
      res.status(500).json({ error: "Could not save user info" });
    }
    
  });


  router.post("/get-user-info", async (req, res) => {
    const { redditUsername } = req.body;
  
    if (!redditUsername) {
      return res.status(400).json({ error: "redditUsername is required" });
    }
  
    try {
      const user = await User.findOne({ redditUsername });
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Send only selected fields
      const {
        name,
        brandname,
        brandDescription,
        targetAudience,
        keySolutionProduct,
        coreProblems,
        notableResults,
        additionalPrompt
      } = user;
  
      res.json({
        name,
        brandname,
        brandDescription,
        targetAudience,
        keySolutionProduct,
        coreProblems,
        notableResults,
        additionalPrompt
      });
  
    } catch (err) {
      console.error("Error fetching user info:", err);
      res.status(500).json({ error: "Internal server error" });
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
