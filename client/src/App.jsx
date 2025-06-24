import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GetPosts from './components/getPosts';
import Login from './components/Login';
import UserInfo from './components/userInfo';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<GetPosts />} />
        <Route path="/info" element={<UserInfo />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
