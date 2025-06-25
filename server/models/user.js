const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  redditUsername: {type: String, required: true, unique: true},
  redditId: { type: String },
  accessToken: String,
  refreshToken: String,  
  name: String,
  brandname: String,
  brandDescription: String,
  targetAudience: String,
  ketSolutionProduct: String,
  coreProblems: String,
  notableResults: String,
  additionalPrompt: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
