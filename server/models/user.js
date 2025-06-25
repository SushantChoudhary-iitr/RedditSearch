const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  redditUsername: {type: String, required: true, unique: true},
  redditId: { type: String },
  accessToken: String,
  refreshToken: String,  
  name: String,
  brandname: String,
  brandDescription: String,
  tone: String,
  targetAudience: String,
  ketSolutionProduct: String,
  notableResults: String,
  industry: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
