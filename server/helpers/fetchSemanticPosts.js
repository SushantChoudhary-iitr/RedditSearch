const axios = require('axios');
const {OpenAI} = require('openai') ;
const users = require("../models/user");
const {getNewAccessToken} = require("./redditOauth");
const {isPostRelevantToUser} = require("./isPostRelevantToUser");
require("dotenv").config();


async function fetchSemanticPosts(keywords, savedAccessToken, savedRefreshToken) {
    let headers = {
      Authorization: `Bearer ${savedAccessToken}`,
      "User-Agent": process.env.USER_AGENT
    };

    const user = await users.findOne({refreshToken: savedRefreshToken});
    //const { brandDescription, coreProblems, notableResults, targetAudience } = user;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


  
    //const subredditQuery = relevantSubreddits.join("+");
    let allKeywordsResults = [];
    let allSubredditsResults = [];
  
    //Search By Keywords
    for (const keyword of keywords) {
      try {
        const response = await axios.get(`https://oauth.reddit.com/search`, {
          headers,
          params: {
            q: keyword,
            sort: "top",
            t: "month",
            limit: 10,
            restrict_sr: false
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

        // Wait for all relevance checks
        const filterResults = await Promise.all(
        posts.map(post => isPostRelevantToUser(post, user))
        );

       // Filter using the results
       const relevantPosts = posts.filter((_, idx) => filterResults[idx]);

        //.filter(post => post.confidence > 0)
  
        allKeywordsResults.push(...relevantPosts);
  
      } catch (err) {
        if (err.response && err.response.status === 401) {
          console.log(`Access token expired. using ${savedRefreshToken} Refreshing...`);
          savedAccessToken = await getNewAccessToken(savedRefreshToken);
  
          headers.Authorization = `Bearer ${savedAccessToken}`;
  
          const retryResp = await axios.get(`https://oauth.reddit.com/search`, {
            headers,
            params: {
              q: keyword,
              sort: "top",
              t: "month",
              limit: 10,
              restrict_sr: false
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
          
          // Wait for all relevance checks
        const filterResults = await Promise.all(
          retryPosts.map(post => isPostRelevantToUser(post, user))
          );
  
         // Filter using the results
         const relevantPosts = retryPosts.filter((_, idx) => filterResults[idx]);
  
  
          allKeywordsResults.push(...relevantPosts);
        } else {
          console.error(`Failed for keyword ${keyword}:`, err.message);
        }
      }
    }

    //search based on Subreddits
    for (const keyword of keywords) {

        const systemPrompt = "You have to get me Relevant and existing, actual subreddits where people are likely to be discussing related pain points, challenges, or decisions. Avoid niche meme subs or NSFW communities";
        const userPrompt = `here is the keyword ${keywords}. return an ARRAY OF STRINGS ONLY and dont include "r/" eg: ["saas", "marketing",....]`;

        const openai_subreddits = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // or "gpt-3.5-turbo"
            messages: [
              { role: "system", content: systemPrompt},
              { role: "user", content: userPrompt }
            ],
            max_tokens: 60,
            temperature: 0.7
          });

          
          const final_subreddits_raw = openai_subreddits.choices[0].message.content.trim();
          console.log(`openai subreddits ${final_subreddits_raw}`);
          let final_subreddits;

          try {
            final_subreddits = JSON.parse(final_subreddits_raw); // now an array
          } catch (err) {
            console.error("Failed to parse OpenAI response as JSON array:", final_subreddits_raw);
            return; // or handle gracefully
          }

          if (!Array.isArray(final_subreddits) || final_subreddits.length === 0) {
            console.error("OpenAI returned invalid subreddit list.");
            return;
          }

          const subredditQuery = final_subreddits.join("+");


      try {
        const response = await axios.get(`https://oauth.reddit.com/r/${subredditQuery}/search`, {
          headers,
          params: {
            q: keyword,
            sort: "top",
            t: "month",
            limit: 10,
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

        // Wait for all relevance checks
        const filterResults = await Promise.all(
          posts.map(post => isPostRelevantToUser(post, user))
          );
  
         // Filter using the results
         const relevantPosts = posts.filter((_, idx) => filterResults[idx]);
  
        //.filter(post => post.confidence > 0)
  
        allSubredditsResults.push(...relevantPosts);
  
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
              limit: 10,
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

          // Wait for all relevance checks
        const filterResults = await Promise.all(
          retryPosts.map(post => isPostRelevantToUser(post, user))
          );
  
         // Filter using the results
         const relevantPosts = retryPosts.filter((_, idx) => filterResults[idx]);
  
          //.filter(post => post.confidence > 0)
  
  
          allSubredditsResults.push(...relevantPosts);
        } else {
          console.error(`Failed for keyword ${keyword}:`, err.message);
        }
      }
    }
  
    //Sort based on "score" upvotes
    allKeywordsResults.sort((a, b) => b.score - a.score);
    allSubredditsResults.sort((a,b) => b.score - a.score);

    const allResults = [...allSubredditsResults, ...allKeywordsResults];
  
    console.log("allResults sorted");
  
    return allResults;
  }

  module.exports = { fetchSemanticPosts };