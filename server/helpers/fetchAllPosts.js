const axios = require('axios');


async function fetchAllPosts(keywords, savedAccessToken, savedRefreshToken) {
    let headers = {
      Authorization: `Bearer ${savedAccessToken}`,
      "User-Agent": process.env.USER_AGENT
    };
  
    //const subredditQuery = relevantSubreddits.join("+");
    let allResults = [];
  
    for (const keyword of keywords) {
      try {
        const response = await axios.get(`https://oauth.reddit.com/search`, {
          headers,
          params: {
            q: keyword,
            sort: "top",
            t: "month",
            limit: 20,
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
        }).filter(post => post.confidence > 0);
  
        allResults.push(...posts);
  
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
              limit: 20,
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

  module.exports = { fetchAllPosts };