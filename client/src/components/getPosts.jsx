import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

function GetPosts() {
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replyLoading, setReplyLoading] = useState({});
  const [replies, setReplies] = useState({});
  const [redditUsername, setRedditUsername] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for ?user=... in the URL
    const params = new URLSearchParams(location.search);
    const userFromQuery = params.get("user");
    if (userFromQuery) {
      localStorage.setItem("redditUsername", userFromQuery);
      setRedditUsername(userFromQuery);
      // Remove the query param from the URL for cleanliness
      navigate("/dashboard", { replace: true });
      return;
    }
    // Fallback to localStorage
    const username = localStorage.getItem("redditUsername");
    if (!username) {
      window.location.href = "/login";
    } else {
      setRedditUsername(username);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    const keywordArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    try {
      const response = await fetch(`http://localhost:3001/keyword-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keywordArray, redditUsername }),
      });
      if (!response.ok) throw new Error("Failed to fetch results");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const handleGenerateReply = async (title, body, idx) => {
    setReplyLoading((prev) => ({ ...prev, [idx]: true }));
    setReplies((prev) => ({ ...prev, [idx]: undefined }));
    try {
      const response = await fetch("http://localhost:3001/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, redditUsername }),
      });
      if (!response.ok) throw new Error("Failed to generate reply");
      const data = await response.json();
      setReplies((prev) => ({ ...prev, [idx]: data.reply || "No reply generated." }));
    } catch (err) {
      setReplies((prev) => ({ ...prev, [idx]: err.message || "Failed to generate reply" }));
    }
    setReplyLoading((prev) => ({ ...prev, [idx]: false }));
  };

  // Tab styles
  const tabStyle = (active) => ({
    padding: '14px 32px',
    fontSize: 17,
    border: 'none',
    borderBottom: active ? '3px solid #2193b0' : '3px solid transparent',
    background: 'none',
    color: active ? '#2193b0' : '#2d3a4b',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    outline: 'none',
    transition: 'border 0.2s, color 0.2s',
    marginRight: 8,
    marginLeft: 8,
    letterSpacing: 1,
    backgroundColor: 'transparent',
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
        padding: 0,
        margin: 0,
      }}
    >
      {/* Tabs */}
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 32, marginBottom: 8 }}>
        <Link to="/dashboard" style={tabStyle(location.pathname === "/dashboard")}>Keyword Search</Link>
        <Link to="/info" style={tabStyle(location.pathname === "/info")}>User Info</Link>
      </div>
      <div style={{ width: "100%", maxWidth: 700, marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ marginBottom: 18, color: '#2d3a4b', letterSpacing: 1, fontWeight: 700, fontSize: 32, textShadow: '0 2px 8px #e0eafc' }}>
          Reddit Keyword Search
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: 32,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Enter keywords, separated by commas"
            required
            style={{
              padding: 14,
              width: "60%",
              fontSize: 17,
              borderRadius: 8,
              border: '1.5px solid #b6c6e0',
              textAlign: 'center',
              boxShadow: '0 2px 8px #e0eafc',
              background: '#f8fbff',
              outline: 'none',
              transition: 'border 0.2s',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '14px 28px',
              fontSize: 17,
              borderRadius: 8,
              cursor: 'pointer',
              background: 'linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 2px 8px #b6c6e0',
              letterSpacing: 1,
              transition: 'background 0.2s',
            }}
          >
            Search
          </button>
        </form>
        {loading && <p style={{ color: '#2193b0', fontWeight: 500 }}>Loading...</p>}
        {error && <p style={{ color: "#e74c3c", fontWeight: 500 }}>{error}</p>}
        {!loading && results.length === 0 && !error && (
          <p style={{ color: "#888", fontWeight: 500 }}>No posts found. Try different keywords.</p>
        )}
        <ul style={{ listStyle: "none", padding: 0, width: "100%", marginTop: 10 }}>
          {results.map((post, idx) => (
            <li
              key={idx}
              style={{
                margin: "2.5rem 0",
                borderRadius: 16,
                boxShadow: "0 4px 24px #b6c6e0",
                background: "linear-gradient(120deg, #f8fbff 0%, #e0eafc 100%)",
                padding: 28,
                textAlign: "center",
                border: '1.5px solid #cfdef3',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#2d3a4b' }}>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0079d3', textDecoration: 'none', wordBreak: 'break-word' }}
                >
                  {post.title}
                </a>
              </div>
              <div style={{ fontSize: 16, color: '#555', margin: '4px 0' }}>
                <b>Subreddit:</b> {post.subreddit} | <b>Score:</b> {post.score}
              </div>
              <div style={{ fontSize: 16, color: '#555', margin: '4px 0' }}>
                <b>Created:</b> {post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'N/A'}
              </div>
              <div style={{ fontSize: 16, color: '#555', margin: '4px 0' }}>
                <b>Confidence:</b> {typeof post.confidence === 'number' ? post.confidence : 'N/A'}
              </div>
              {post.body && (
                <div
                  style={{
                    fontSize: 17,
                    color: '#222',
                    margin: '16px 0',
                    whiteSpace: 'pre-line',
                    background: '#f0f4fa',
                    borderRadius: 8,
                    padding: 14,
                    boxShadow: '0 1px 4px #e0eafc',
                  }}
                >
                  {post.body}
                </div>
              )}
              <button
                style={{
                  padding: '10px 22px',
                  fontSize: 16,
                  borderRadius: 8,
                  marginTop: 10,
                  cursor: 'pointer',
                  background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px #b6c6e0',
                  letterSpacing: 1,
                  transition: 'background 0.2s',
                }}
                onClick={() => handleGenerateReply(post.title, post.body, idx)}
                disabled={replyLoading[idx]}
              >
                {replyLoading[idx] ? 'Generating...' : 'Generate Reply'}
              </button>
              {replies[idx] && (
                <div
                  style={{
                    marginTop: 16,
                    background: 'linear-gradient(120deg, #e0eafc 0%, #f8fbff 100%)',
                    padding: 16,
                    borderRadius: 8,
                    color: '#333',
                    fontSize: 16,
                    boxShadow: '0 1px 4px #e0eafc',
                  }}
                >
                  <b>Reply:</b> {replies[idx]}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default GetPosts;
