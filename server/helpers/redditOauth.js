
const axios = require("axios");
require("dotenv").config();

function getAuthUrl(state = "xyz123") {
  const base = "https://www.reddit.com/api/v1/authorize";
  const params = new URLSearchParams({
    client_id: process.env.REDDIT_CLIENT_ID,
    response_type: "code",
    state,
    redirect_uri: process.env.REDIRECT_URI,
    duration: "permanent",
    scope: "read identity"
  });

  return `${base}?${params.toString()}`;
}

async function getAccessToken(code) {
  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await axios.post(
    "https://www.reddit.com/api/v1/access_token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDIRECT_URI
    }),
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": process.env.USER_AGENT
      }
    }
  );

  const {access_token, refresh_token} = res.data;

  return {
    accessToken : access_token,
    refreshToken : refresh_token
  };
}

async function getNewAccessToken(refreshToken) {
    const auth = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString("base64");
  
    const res = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": process.env.USER_AGENT
        }
      }
    );
  
    return res.data.access_token;
  }

  async function getRedditUserInfo(accessToken) {
    const res = await axios.get("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": process.env.USER_AGENT
      }
    });
    return res.data; // has 'name' and 'id'
  }
  

module.exports = { getAuthUrl, getAccessToken, getNewAccessToken, getRedditUserInfo };
