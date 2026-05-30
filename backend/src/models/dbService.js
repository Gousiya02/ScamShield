import { collections, isLocalDb } from '../config/db.js';
import User from './User.js';
import ScamReport from './ScamReport.js';
import ScanHistory from './ScanHistory.js';

export const dbService = {
  // === USER OPERATIONS ===
  async findUserByUsername(username) {
    if (isLocalDb()) {
      return await collections.users.findOne({ username });
    }
    return await User.findOne({ username });
  },

  async findUserByEmail(email) {
    if (isLocalDb()) {
      return await collections.users.findOne({ email });
    }
    return await User.findOne({ email: email.toLowerCase() });
  },

  async findUserById(id) {
    if (isLocalDb()) {
      return await collections.users.findOne({ id });
    }
    return await User.findById(id);
  },

  async createUser(userData) {
    if (isLocalDb()) {
      return await collections.users.create(userData);
    }
    const user = new User(userData);
    return await user.save();
  },

  async updateUser(userId, updateData) {
    if (isLocalDb()) {
      return await collections.users.updateOne({ id: userId }, updateData);
    }
    return await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
  },

  async updateUserScore(userId, scoreIncrement, completedQuiz) {
    if (isLocalDb()) {
      const user = await collections.users.findOne({ id: userId });
      if (!user) return null;
      const completedQuizzes = user.completedQuizzes || [];
      completedQuizzes.push(completedQuiz);
      
      const newScore = Math.min(100, Math.max(0, (user.securityScore || 100) + scoreIncrement));
      return await collections.users.updateOne(
        { id: userId }, 
        { completedQuizzes, securityScore: newScore }
      );
    }

    return await User.findByIdAndUpdate(
      userId,
      {
        $push: { completedQuizzes: completedQuiz },
        $set: { securityScore: scoreIncrement } // scoreIncrement will be calculated in controller
      },
      { new: true }
    );
  },

  // === SCAM REPORT OPERATIONS ===
  async createScamReport(reportData) {
    if (isLocalDb()) {
      return await collections.scamReports.create({
        ...reportData,
        votes: 0,
        upvotedUsers: []
      });
    }
    const report = new ScamReport(reportData);
    return await report.save();
  },

  async getScamReports(filter = {}) {
    if (isLocalDb()) {
      // Find all
      let reports = await collections.scamReports.find();
      if (filter.scamType) {
        reports = reports.filter(r => r.scamType === filter.scamType);
      }
      // Sort by newest
      return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return await ScamReport.find(filter).sort({ createdAt: -1 });
  },

  async upvoteScamReport(reportId, username) {
    if (isLocalDb()) {
      const report = await collections.scamReports.findOne({ id: reportId }) || await collections.scamReports.findOne({ _id: reportId });
      if (!report) return null;
      
      const upvotedUsers = report.upvotedUsers || [];
      if (upvotedUsers.includes(username)) {
        // remove upvote
        const newUpvoted = upvotedUsers.filter(u => u !== username);
        const newVotes = Math.max(0, (report.votes || 0) - 1);
        return await collections.scamReports.updateOne(
          { id: report.id },
          { votes: newVotes, upvotedUsers: newUpvoted }
        );
      } else {
        // add upvote
        upvotedUsers.push(username);
        const newVotes = (report.votes || 0) + 1;
        return await collections.scamReports.updateOne(
          { id: report.id },
          { votes: newVotes, upvotedUsers }
        );
      }
    }

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
    if (isLocalDb()) {
      return await collections.scanHistory.create(historyData);
    }
    const history = new ScanHistory(historyData);
    return await history.save();
  },

  async getScanHistory(analyzedBy) {
    if (isLocalDb()) {
      const history = await collections.scanHistory.find({ analyzedBy });
      return history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return await ScanHistory.find({ analyzedBy }).sort({ createdAt: -1 });
  }
};
