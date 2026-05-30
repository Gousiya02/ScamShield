import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  securityScore: {
    type: Number,
    default: 100 // Out of 100 cyber security hygiene score
  },
  completedQuizzes: [{
    quizId: String,
    score: Number,
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
