import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FaArrowUp, FaRegComment, FaChartLine, FaRegCopy } from "react-icons/fa";

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
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});

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
      const response = await fetch(`https://redditsearch-5irh.onrender.com/keyword-search`, {
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
      const response = await fetch("https://redditsearch-5irh.onrender.com/generate-reply", {
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

  // Make replies editable by the user
  const handleReplyChange = (idx, value) => {
    setReplies(prev => ({ ...prev, [idx]: value }));
  };

  // Copy reply to clipboard
  const handleCopy = (idx) => {
    if (replies[idx]) {
      navigator.clipboard.writeText(replies[idx]);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    }
  };

  // Helper to truncate body
  const getTruncatedBody = (body, idx) => {
    if (!body) return '';
    const words = body.split(/\s+/);
    if (words.length <= 200 || expandedPosts[idx]) return body;
    return words.slice(0, 200).join(' ') + '...';
  };

  const handleToggleExpand = (idx) => {
    setExpandedPosts(prev => ({ ...prev, [idx]: !prev[idx] }));
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
      <div style={{ width: "100%", maxWidth: '100%', marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", marginLeft: "auto", marginRight: "auto", paddingLeft: 32, paddingRight: 32, boxSizing: 'border-box' }}>
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
        <ul style={{ listStyle: "none", padding: 0, width: "100%", marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {results.map((post, idx) => (
            <li
              key={idx}
              style={{
                margin: "2.5rem 0",
                borderRadius: 16,
                boxShadow: "0 4px 24px #b6c6e0",
                background: "linear-gradient(120deg, #f8fbff 0%, #e0eafc 100%)",
                padding: 0,
                textAlign: "center",
                border: '1.5px solid #cfdef3',
                transition: 'box-shadow 0.2s',
                width: '100%',
                maxWidth: 1300,
                minWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                marginLeft: 'auto',
                marginRight: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {/* Section 1: Top bar with subreddit, title, created, confidence */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                width: '100%',
                padding: '24px 28px 0 28px',
                boxSizing: 'border-box',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  background: '#ffe5b4',
                  color: '#b85c00',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 15,
                  marginRight: 24,
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 4px #f8d9b6',
                  minWidth: 90,
                  maxWidth: 170,
                }}>
                  {`r/${post.subreddit}`}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3a4b', textAlign: 'left' }}>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0079d3', textDecoration: 'none', wordBreak: 'break-word', textAlign: 'left' }}
                    >
                      {post.title}
                    </a>
                  </div>
                  <div style={{ fontSize: 16, color: '#555', margin: '2px 0', textAlign: 'left' }}>
                    <b>Created:</b> {post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#555', margin: '2px 0', textAlign: 'left' }}>
                    <b>Confidence:</b> {typeof post.confidence === 'number' ? post.confidence : 'N/A'}
                  </div>
                </div>
              </div>
              {/* Section 2: Body, full width */}
              {post.body && (
                <div
                  style={{
                    fontSize: 17,
                    color: '#222',
                    margin: '18px 0 0 0',
                    whiteSpace: 'pre-line',
                    background: '#f0f4fa',
                    borderRadius: 8,
                    padding: '18px 32px',
                    boxShadow: '0 1px 4px #e0eafc',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box',
                    position: 'relative',
                  }}
                >
                  {getTruncatedBody(post.body, idx)}
                  {post.body.split(/\s+/).length > 200 && (
                    <span
                      onClick={() => handleToggleExpand(idx)}
                      style={{
                        color: '#2193b0',
                        cursor: 'pointer',
                        fontWeight: 600,
                        marginLeft: 8,
                        userSelect: 'none',
                      }}
                    >
                      {expandedPosts[idx] ? ' show less' : ' read more'}
                    </span>
                  )}
                </div>
              )}
              {/* Section 3: Comments, Upvotes, Trending row */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 32,
                width: '100%',
                margin: '18px 0 0 0',
                fontSize: 16,
                color: '#888',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaRegComment style={{ fontSize: 17, marginRight: 4 }} />
                  {post.num_comments ?? 'N/A'} <span style={{marginLeft: 4}}>Comments</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaArrowUp style={{ color: '#6cbe6c', fontSize: 17, marginRight: 4 }} />
                  {post.score} <span style={{marginLeft: 4}}>Upvotes</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaChartLine style={{ color: '#b85c00', fontSize: 17, marginRight: 4 }} /> Trending
                </span>
              </div>
              {/* Section 4: Generate Reply button */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '18px 0 0 0' }}>
                <button
                  style={{
                    padding: '10px 22px',
                    fontSize: 16,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px #b6c6e0',
                    letterSpacing: 1,
                    transition: 'background 0.2s',
                    minWidth: 180,
                    position: 'relative',
                  }}
                  onClick={() => handleGenerateReply(post.title, post.body, idx)}
                  disabled={replyLoading[idx]}
                >
                  {replyLoading[idx] ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span className="loader" style={{ width: 18, height: 18, border: '3px solid #fff', borderTop: '3px solid #2193b0', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </span>
                  ) : 'Generate Reply'}
                </button>
              </div>
              {/* Section 5: AI reply text box, full width, editable, with copy icon */}
              <div style={{
                width: '100%',
                margin: '18px 0 0 0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}>
                {/* Copy icon */}
                <FaRegCopy
                  onClick={() => handleCopy(idx)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 18,
                    fontSize: 20,
                    color: copiedIdx === idx ? '#2193b0' : '#888',
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'color 0.2s',
                  }}
                  title={copiedIdx === idx ? 'Copied!' : 'Copy to clipboard'}
                />
                <textarea
                  value={replies[idx] || ''}
                  placeholder="click Generate Reply for AI response"
                  onChange={e => handleReplyChange(idx, e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 90,
                    height: replies[idx] && replies[idx].length > 200 ? 'auto' : 90,
                    maxHeight: 350,
                    overflowY: 'auto',
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1.5px solid #b6c6e0',
                    background: '#f8fbff',
                    padding: 14,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    color: '#333',
                  }}
                />
                {copiedIdx === idx && (
                  <span style={{
                    position: 'absolute',
                    top: 10,
                    right: 48,
                    background: '#e0eafc',
                    color: '#2193b0',
                    borderRadius: 6,
                    padding: '2px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    zIndex: 3,
                    boxShadow: '0 1px 4px #b6c6e0',
                  }}>
                    Copied!
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default GetPosts;

/* Add this to your CSS or in a <style> tag for the spinner:
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/
