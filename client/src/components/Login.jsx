import React from "react";

function Login() {
  const handleLogin = () => {
    window.location.href = "http://localhost:3001/login";
  };

  // After Reddit OAuth, backend should redirect to a page that can extract the username and save it to localStorage.
  // You may want to handle this in a callback page, but for now, this is a simple login button.

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
      padding: 0,
      margin: 0,
    }}>
      <div style={{
        background: "#fff",
        padding: 40,
        borderRadius: 12,
        boxShadow: "0 4px 24px #b6c6e0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 320,
        maxWidth: 400,
      }}>
        <h2 style={{ color: '#2d3a4b', marginBottom: 24, textAlign: 'center' }}>Sign in with Reddit</h2>
        <button
          onClick={handleLogin}
          style={{
            padding: '14px 32px',
            fontSize: 18,
            borderRadius: 8,
            background: 'linear-gradient(90deg, #6dd5ed 0%, #2193b0 100%)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 8px #b6c6e0',
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          Login with Reddit
        </button>
      </div>
    </div>
  );
}

export default Login; 