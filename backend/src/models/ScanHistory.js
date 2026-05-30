import mongoose from 'mongoose';

const scanHistorySchema = new mongoose.Schema({
  scannedText: {
    type: String,
    required: true
  },
  detectedUrls: [{
    type: String
  }],
  riskLevel: {
    type: String,
    enum: ['safe', 'suspicious', 'high-risk'],
    required: true
  },
  confidenceScore: {
    type: Number,
    required: true
  },
  explanations: [{
    type: String
  }],
  analyzedBy: {
    type: String, // 'Anonymous' or userId
    default: 'Anonymous'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ScanHistory = mongoose.models.ScanHistory || mongoose.model('ScanHistory', scanHistorySchema);
export default ScanHistory;
