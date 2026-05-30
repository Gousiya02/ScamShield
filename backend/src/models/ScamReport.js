import mongoose from 'mongoose';

const scamReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  scamType: {
    type: String,
    required: true,
    enum: ['phishing', 'fake-job', 'otp-bank-fraud', 'fake-payment', 'social-media', 'crypto-investment', 'other']
  },
  evidence: {
    type: String, // Suspicious text content or URL
    required: true
  },
  reportedBy: {
    type: String, // store username or userId (string or ObjectId)
    default: 'Anonymous'
  },
  votes: {
    type: Number,
    default: 0
  },
  upvotedUsers: [{
    type: String // List of user IDs or usernames who upvoted to prevent double voting
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ScamReport = mongoose.models.ScamReport || mongoose.model('ScamReport', scamReportSchema);
export default ScamReport;
