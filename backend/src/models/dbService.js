import User from './User.js';
import ScamReport from './ScamReport.js';
import ScanHistory from './ScanHistory.js';

export const dbService = {
  // === USER OPERATIONS ===
  async findUserByUsername(username) {
    return await User.findOne({ username });
  },

  async findUserByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  },

  async findUserById(id) {
    return await User.findById(id);
  },

  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  },

  async updateUser(userId, updateData) {
    return await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
  },

  async updateUserScore(userId, scoreIncrement, completedQuiz) {
    const user = await User.findById(userId);
    if (!user) return null;
    
    // Capping safety points between 0 and 100 hygiene score
    const newScore = Math.min(100, Math.max(0, (user.securityScore || 100) + scoreIncrement));
    user.securityScore = newScore;
    user.completedQuizzes.push(completedQuiz);
    return await user.save();
  },

  // === SCAM REPORT OPERATIONS ===
  async createScamReport(reportData) {
    const report = new ScamReport(reportData);
    return await report.save();
  },

  async getScamReports(filter = {}) {
    return await ScamReport.find(filter).sort({ createdAt: -1 });
  },

  async upvoteScamReport(reportId, username) {
    const report = await ScamReport.findById(reportId);
    if (!report) return null;

    const hasUpvoted = report.upvotedUsers.includes(username);
    if (hasUpvoted) {
      report.votes = Math.max(0, report.votes - 1);
      report.upvotedUsers = report.upvotedUsers.filter(u => u !== username);
    } else {
      report.votes += 1;
      report.upvotedUsers.push(username);
    }
    return await report.save();
  },

  // === SCAN HISTORY OPERATIONS ===
  async createScanHistory(historyData) {
    const history = new ScanHistory(historyData);
    return await history.save();
  },

  async getScanHistory(analyzedBy) {
    return await ScanHistory.find({ analyzedBy }).sort({ createdAt: -1 });
  }
};
