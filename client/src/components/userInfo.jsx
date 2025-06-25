import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function UserInfo() {
  const [form, setForm] = useState({
    name: "",
    brandname: "",
    brandDescription: "",
    targetAudience: "",
    coreProblems: "",
    keySolution: "",
    notableResults: "",
    industry: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    const redditUsername = localStorage.getItem("redditUsername");
    try {
      const response = await fetch("https://redditsearch-5irh.onrender.com/save-user-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, redditUsername }),
      });
      if (!response.ok) throw new Error("Failed to save user info");
      setSuccess("User info saved successfully!");
    } catch (err) {
      setError(err.message || "Failed to save user info");
    }
    setLoading(false);
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
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
      padding: 0,
      margin: 0,
    }}>
      {/* Tabs */}
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 32, marginBottom: 8 }}>
        <Link to="/dashboard" style={tabStyle(location.pathname === "/dashboard")}>Keyword Search</Link>
        <Link to="/info" style={tabStyle(location.pathname === "/info")}>User Info</Link>
      </div>
      <form onSubmit={handleSubmit} style={{
        background: "#fff",
        padding: 32,
        borderRadius: 12,
        boxShadow: "0 4px 24px #b6c6e0",
        minWidth: 320,
        maxWidth: 400,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: 'center',
        marginTop: 10
      }}>
        <h2 style={{ color: '#2d3a4b', marginBottom: 12, textAlign: 'center' }}>User Info</h2>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required style={inputStyle} />
        <input name="brandname" value={form.brandname} onChange={handleChange} placeholder="Brand Name" required style={inputStyle} />
        <input name="brandDescription" value={form.brandDescription} onChange={handleChange} placeholder="Brand Description" required style={inputStyle} />
        <input name="targetAudience" value={form.targetAudience} onChange={handleChange} placeholder="Target Audience" required style={inputStyle} />
        <input name="coreProblems" value={form.coreProblems} onChange={handleChange} placeholder="Core Problems Addresed" required style={inputStyle} />
        <input name="keySolution" value={form.keySolution} onChange={handleChange} placeholder="Key Solution/Product" required style={inputStyle} />
        <input name="notableResults" value={form.notableResults} onChange={handleChange} placeholder="Notable Results/Past Clients" required style={inputStyle} />
        <input name="industry" value={form.industry} onChange={handleChange} placeholder="Industry" required style={inputStyle} />
        <button type="submit" disabled={loading} style={{
          padding: '12px 0',
          fontSize: 16,
          borderRadius: 8,
          background: 'linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)',
          color: '#fff',
          border: 'none',
          fontWeight: 600,
          boxShadow: '0 2px 8px #b6c6e0',
          letterSpacing: 1,
          cursor: 'pointer',
          marginTop: 10
        }}>{loading ? 'Saving...' : 'Save Info'}</button>
        {success && <div style={{ color: '#27ae60', marginTop: 10 }}>{success}</div>}
        {error && <div style={{ color: '#e74c3c', marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  );
}

const inputStyle = {
  padding: '12px',
  fontSize: 15,
  borderRadius: 6,
  border: '1.5px solid #b6c6e0',
  background: '#f8fbff',
  outline: 'none',
  marginBottom: 0,
  width: '100%',
  maxWidth: 340,
  boxSizing: 'border-box',
};

export default UserInfo;
