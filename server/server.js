const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const redditRoutes = require("./routes/reddit");
const mongoose = require("mongoose");

dotenv.config();
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB connected"));
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",            // local dev
      "https://redditreplytool.netlify.app"  // replace with your actual Netlify URL
    ],
    credentials: true
  })
);

app.use(express.json());
app.use("/", redditRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));