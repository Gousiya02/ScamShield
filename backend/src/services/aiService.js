import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbService } from '../models/dbService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
  'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that',
  'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd',
  'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'wasnt', 'we', 'wed', 'well', 'were', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which',
  'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
  'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
  'dear', 'hello', 'hi', 'hey'
]);

// Simple word tokenization, normalization, and stop words removal matching train_model.py
const preprocess = (text) => {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return clean.split(/\s+/).filter(word => word.length > 0 && !STOP_WORDS.has(word));
};

// In-process JavaScript port of the Pure Python Naive Bayes Classifier
class JSPurePythonClassifier {
  constructor(state) {
    this.classes = ['safe', 'suspicious', 'high-risk'];
    this.classCounts = state.class_counts;
    this.vocab = new Set(state.vocab);
    this.wordCounts = state.word_counts;
    this.totalDocs = state.total_docs;
  }

  predict(text) {
    const words = preprocess(text);
    const scores = {};

    for (const label of this.classes) {
      const prior = this.totalDocs > 0 ? (this.classCounts[label] / this.totalDocs) : (1 / 3);
      let logProb = Math.log(prior);

      const wordCountsInClass = this.wordCounts[label] || {};

      // Sum the counts of all words in this class
      const totalWordsInClass = Object.values(wordCountsInClass).reduce((sum, val) => sum + val, 0);
      const vocabSize = this.vocab.size;

      for (const word of words) {
        if (this.vocab.has(word)) {
          const count = wordCountsInClass[word] || 0;
          const prob = (count + 1) / (totalWordsInClass + vocabSize);
          logProb += Math.log(prob);
        } else {
          const prob = 1 / (totalWordsInClass + vocabSize);
          logProb += Math.log(prob);
        }
      }

      scores[label] = logProb;
    }

    // Convert log probabilities back to soft probabilities using softmax
    const maxScore = Math.max(...Object.values(scores));
    const expScores = {};
    let sumExp = 0;
    for (const c of this.classes) {
      const e = Math.exp(scores[c] - maxScore);
      expScores[c] = e;
      sumExp += e;
    }

    const probabilities = {};
    for (const c of this.classes) {
      probabilities[c] = sumExp > 0 ? (expScores[c] / sumExp) : 0;
    }

    let predictedClass = this.classes[0];
    let maxProb = -1;
    for (const c of this.classes) {
      if (probabilities[c] > maxProb) {
        maxProb = probabilities[c];
        predictedClass = c;
      }
    }

    const confidence = probabilities[predictedClass];

    return {
      riskLevel: predictedClass,
      confidenceScore: confidence,
      probabilities,
      modelUsed: 'pure-js-bayes'
    };
  }
}

const modelPath = path.resolve(__dirname, '../../ai/models/pure_python_model.json');
let cachedClassifier = null;

const getJSClassifier = () => {
  if (cachedClassifier) return cachedClassifier;
  try {
    if (fs.existsSync(modelPath)) {
      const data = fs.readFileSync(modelPath, 'utf8');
      const state = JSON.parse(data);
      cachedClassifier = new JSPurePythonClassifier(state);
      console.log('[AI SERVICE] Successfully loaded in-process JS Naive Bayes classifier model.');
      return cachedClassifier;
    }
  } catch (err) {
    console.error('[AI SERVICE] Error loading pure_python_model.json:', err);
  }
  return null;
};

// Levenshtein distance algorithm for homoglyph / typosquatting domain detection
const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  let i, j, al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  for (i = 0; i <= al; i++) tmp[i] = [i];
  for (j = 0; j <= bl; j++) tmp[0][j] = j;
  for (i = 1; i <= al; i++) {
    for (j = 1; j <= bl; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[al][bl];
};

const POPULAR_BRANDS = [
  'paypal', 'amazon', 'netflix', 'google', 'microsoft',
  'apple', 'chase', 'chasebank', 'wellsfargo', 'facebook',
  'instagram', 'twitter', 'linkedin', 'dhl', 'fedex', 'ups'
];

export const aiService = {
  // Layer 1: Check domains for homoglyphs and unauthorized extensions
  detectBrandSpoofing(text) {
    // Matches http://, https://, www. or words containing dot + common TLDs / suspicious TLDs
    const urlRegex = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|\b[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|click|xyz|cc|top|biz|ru|info|loan|club|work)\b/gi;
    const matches = text.match(urlRegex) || [];
    const spoofAlerts = [];
    const detectedUrls = [];

    matches.forEach(url => {
      try {
        // Clean URL punctuation at the end (e.g. dots, commas, parentheses)
        const cleanUrl = url.replace(/[.,;!?()]$/, '');

        // Extract host/domain
        let host = '';
        if (cleanUrl.toLowerCase().startsWith('http://') || cleanUrl.toLowerCase().startsWith('https://')) {
          const domainMatch = cleanUrl.match(/^https?:\/\/([^/?#:]+)/i);
          if (domainMatch) {
            host = domainMatch[1].toLowerCase();
          }
        } else {
          // It's a raw domain name like 'paypal-verify.click/login' or 'www.paypal.com'
          const domainMatch = cleanUrl.match(/^([^/?#:]+)/i);
          if (domainMatch) {
            host = domainMatch[1].toLowerCase();
          }
        }

        // Remove 'www.' prefix if present
        if (host.startsWith('www.')) {
          host = host.substring(4);
        }

        if (!host) return;

        // Format for detected urls list to make it look clean
        const displayUrl = cleanUrl.toLowerCase().startsWith('http') ? cleanUrl : `http://${cleanUrl}`;
        if (!detectedUrls.includes(displayUrl)) {
          detectedUrls.push(displayUrl);
        }

        const parts = host.split('.');
        if (parts.length < 2) return;

        // Extract primary domain name (e.g., 'paypal' from 'security.paypal.com' or 'paypal-update')
        const domainName = parts[parts.length - 2];
        const tld = parts[parts.length - 1];

        // 1. Unofficial top-level domains that are high-risk
        const suspiciousTLDs = ['click', 'xyz', 'cc', 'top', 'biz', 'ru', 'info', 'loan', 'club', 'work'];
        const isSuspiciousTLD = suspiciousTLDs.includes(tld);

        // 2. Homoglyph checking (e.g., paypa1, amaz0n)
        POPULAR_BRANDS.forEach(brand => {
          // If domain name is exactly the brand but TLD is sketchy, or it contains the brand with hyphens
          if (domainName.includes(brand) && domainName !== brand) {
            spoofAlerts.push(`Potential phishing subdomain or domain spoofing impersonating ${brand.toUpperCase()} ('${domainName}.${tld}').`);
          } else if (domainName !== brand) {
            const distance = getLevenshteinDistance(domainName, brand);
            // If Levenshtein distance is tiny (1 or 2), it's a character replacement typosquatting scam!
            if (distance > 0 && distance <= 2) {
              spoofAlerts.push(`Homoglyph detection: The domain '${domainName}.${tld}' looks suspiciously similar to the official brand ${brand.toUpperCase()}.`);
            }
          }
        });

        if (isSuspiciousTLD && !spoofAlerts.some(alert => alert.includes(domainName))) {
          spoofAlerts.push(`The domain uses a high-risk suspicious top-level domain extension (.${tld}).`);
        }
      } catch (err) {
        // Ignore URL parsing errors
      }
    });

    return { spoofAlerts, detectedUrls };
  },

  // Google Safe Browsing API v4 Integration
  async checkSafeBrowsing(detectedUrls) {
    const apiKey = process.env.SAFE_BROWSING_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || detectedUrls.length === 0) {
      return [];
    }

    try {
      const url = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            clientId: "scamshield-ai",
            clientVersion: "1.0.0"
          },
          threatInfo: {
            threatTypes:      ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes:    ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: detectedUrls.map(u => ({ url: u }))
          }
        })
      });

      const data = await response.json();
      const threatAlerts = [];
      if (data.matches && data.matches.length > 0) {
        data.matches.forEach(match => {
          threatAlerts.push(`Google Safe Browsing: The URL '${match.threat.url}' is flagged as a high-risk ${match.threatType.replace(/_/g, ' ')} threat!`);
        });
      }
      return threatAlerts;
    } catch (err) {
      console.warn('[SAFE BROWSING API] Connection failed or key unauthorized, using local algorithm fallback.', err.message);
      return [];
    }
  },

  // Layer 2: Fast local heuristic keywords scan
  heuristicKeywordScan(text) {
    const textLower = text.toLowerCase();

    // Categorized indicators to prevent urgency words alone from escalating risk
    const urgencyIndicators = [
      'urgent', 'immediately', 'within 24 hours', 'action required', 'suspended',
      'locked', 'unauthorized transaction', 'blocked', 'expire', 'compromised',
      'tomorrow', 'deadline', 'submit', 'apply', 'closing soon', 'reminder', 'closing tomorrow'
    ];
    const financialIndicators = [
      'lottery', 'won $', 'cash prize', 'bitcoin deposit', 'double your money',
      'claim refund', 'irs refund', 'free gift card', 'investment scheme', 'matching bonus',
      'earn $', 'salary', 'onboarding fee', 'redelivery fee', 'transfer of $', 'payment method',
      'bank details', 'credit card details', 'payment request', 'transfer funds', 'upi account'
    ];
    const securityIndicators = [
      'otp', 'verification code', 'security code', 'verify your details',
      'login at', 'confirm your password', 'social security number', 'ssn', 'verify identity',
      'confirm identity', 'reset password', 'account security', 'security details'
    ];
    const trustIndicators = [
      'google', 'microsoft', 'apple', 'cloud', 'academy', 'developer program',
      'documentation', 'conference', 'event reminder', 'official', 'edition',
      'submission window', 'codelab', 'announcement', 'training', 'workshop', 'webinar', 'apac'
    ];

    const urgencyMatched = urgencyIndicators.filter(kw => textLower.includes(kw));
    const financialMatched = financialIndicators.filter(kw => textLower.includes(kw));
    const securityMatched = securityIndicators.filter(kw => textLower.includes(kw));
    const trustMatched = trustIndicators.filter(kw => textLower.includes(kw));

    return {
      urgencyMatched,
      financialMatched,
      securityMatched,
      trustMatched
    };
  },

  // High-performance in-process JS Naive Bayes classifier with Python spawn fallback
  async runClassifier(text) {
    const jsClassifier = getJSClassifier();
    if (jsClassifier) {
      try {
        const result = jsClassifier.predict(text);
        return {
          text,
          riskLevel: result.riskLevel,
          confidenceScore: result.confidenceScore,
          probabilities: result.probabilities,
          modelUsed: result.modelUsed
        };
      } catch (err) {
        console.error('[AI SERVICE] JS classifier failed, falling back to Python:', err);
      }
    }

    console.log('[AI SERVICE] JS classifier unavailable. Spawning Python child process...');
    return this.runPythonClassifier(text);
  },

  // Layer 3: Run Python ML NLP classifier script
  runPythonClassifier(text) {
    return new Promise((resolve) => {
      const classifierScript = path.resolve(__dirname, '../../ai/classifier.py');
      const pyProcess = spawn('python', [classifierScript, text]);

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script closed with error code ${code}. Stderr: ${stderrData}`);
          // Graceful fallback values
          resolve({
            riskLevel: 'suspicious',
            confidenceScore: 0.6,
            modelUsed: 'fallback-rules'
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (err) {
          console.error(`Failed to parse Python classifier output: ${stdoutData}`);
          resolve({
            riskLevel: 'suspicious',
            confidenceScore: 0.6,
            modelUsed: 'fallback-parser'
          });
        }
      });
    });
  },

  // Layer 4: Deep analysis orchestration
  async analyzeContent(text, username = 'Anonymous') {
    if (!text || text.trim() === '') {
      throw new Error('Input text cannot be empty.');
    }

    // 1. Run URL analysis (local typosquatting engine)
    const { spoofAlerts, detectedUrls } = this.detectBrandSpoofing(text);

    // 2. Query Google Safe Browsing API if URLs are detected and API key is present
    let safeBrowsingAlerts = [];
    if (detectedUrls.length > 0) {
      safeBrowsingAlerts = await this.checkSafeBrowsing(detectedUrls);
    }

    // Merge results: Use Safe Browsing alerts if matched; otherwise fall back to local spoofAlerts
    const finalSpoofAlerts = safeBrowsingAlerts.length > 0 ? safeBrowsingAlerts : spoofAlerts;

    // 3. Run Heuristic analysis
    const { urgencyMatched, financialMatched, securityMatched, trustMatched } = this.heuristicKeywordScan(text);

    // 4. Run high-performance NLP machine learning scan
    const pyResult = await this.runClassifier(text);

    // 5. Merge results to form the final score and risk assessment
    const hasSuspiciousUrl = finalSpoofAlerts.length > 0;
    const hasUrgency = urgencyMatched.length > 0;
    const hasFinancial = financialMatched.length > 0;
    const hasSecurity = securityMatched.length > 0;
    const hasTrust = trustMatched.length > 0;

    let finalRiskLevel = pyResult.riskLevel;
    let finalConfidence = pyResult.confidenceScore; // value between 0 and 1

    const textLower = text.toLowerCase();
    
    // Core Risk Criteria
    const hasMoney = hasFinancial || textLower.includes('money') || textLower.includes('cash') || textLower.includes('prize') || textLower.includes('$');
    const hasOTP = textLower.includes('otp') || securityMatched.some(s => s.includes('otp') || s.includes('code') || s.includes('pin') || s.includes('verification'));
    const hasBankDetails = textLower.includes('bank') || textLower.includes('account') || textLower.includes('card') || textLower.includes('credit') || textLower.includes('debit') || textLower.includes('routing') || financialMatched.some(f => f.includes('account') || f.includes('card'));
    const hasSuspiciousURL = hasSuspiciousUrl;

    // Combined Risk Calculation Rules: Urgency + (Money / OTP / Bank details / Suspicious URL)
    const isHighRiskScam = hasUrgency && (hasMoney || hasOTP || hasBankDetails || hasSuspiciousURL);
    const isSuspiciousScam = !isHighRiskScam && (hasSuspiciousURL || hasMoney);

    // Classification Decision Core
    if (isHighRiskScam) {
      finalRiskLevel = 'high-risk';
      finalConfidence = Math.max(finalConfidence, 0.95);
    } else if (isSuspiciousScam) {
      finalRiskLevel = 'suspicious';
      finalConfidence = Math.max(finalConfidence, 0.75);
    } else {
      // Defaults to safe if combinations are not met
      finalRiskLevel = 'safe';
      finalConfidence = Math.max(finalConfidence, 0.85); // 85% confidence for safe messages
    }

    // 6. Update result explanations (checklists)
    let explanations = [];
    if (finalRiskLevel === 'safe') {
      explanations = [
        `✓ ${hasSuspiciousUrl ? 'Potential phishing URL matched' : 'No suspicious URLs detected'}`,
        `✓ ${hasFinancial ? 'Financial indicators matched' : 'No payment requests detected'}`,
        `✓ ${securityMatched.some(s => s.includes('otp')) ? 'OTP requests detected' : 'No OTP requests detected'}`,
        `✓ ${hasSecurity ? 'Potential credential harvesting indicators' : 'No credential theft indicators detected'}`
      ];
    } else {
      explanations = [...finalSpoofAlerts];
      if (hasFinancial) {
        explanations.push('Mentions payment requests, financial rewards, or money schemes.');
      }
      if (hasSecurity) {
        explanations.push('Requests sensitive actions such as OTP codes, account credentials, or direct verification.');
      }
      if (hasUrgency) {
        explanations.push('Uses urgent language or close deadlines to pressure action.');
      }
      if (explanations.length === 0) {
        explanations.push('Vocabulary pattern matches profiles of previously reported scams.');
      }
    }

    // 6. Build Detected Signals Section
    const detectedSignals = [];

    // Add trust signals
    if (hasTrust) {
      if (trustMatched.some(t => ['academy', 'codelab', 'training', 'workshop', 'webinar', 'program'].includes(t))) {
        detectedSignals.push('✓ Educational announcement detected');
      }
      if (trustMatched.some(t => ['google', 'microsoft', 'apple', 'cloud', 'official'].includes(t))) {
        detectedSignals.push('✓ Official program reference detected');
      }
      if (trustMatched.some(t => ['conference', 'event', 'reminder'].includes(t))) {
        detectedSignals.push('✓ Event reminder detected');
      }
    }

    // Add threat signals
    if (!hasSuspiciousUrl) {
      detectedSignals.push('✓ No phishing indicators');
    } else {
      detectedSignals.push('⚠ Phishing indicator detected');
    }

    if (!hasFinancial) {
      detectedSignals.push('✓ No financial requests');
    } else {
      detectedSignals.push('⚠ Financial transaction reference detected');
    }

    if (!hasSecurity) {
      detectedSignals.push('✓ No verification requests');
    } else {
      detectedSignals.push('⚠ Account security/verification requested');
    }

    if (hasUrgency && !hasSuspiciousUrl && !hasSecurity && !hasFinancial) {
      detectedSignals.push('✓ Urgency word used in benign context');
    }

    const confidenceScorePercent = Math.round(finalConfidence * 100);

    const scanResult = {
      scannedText: text,
      detectedUrls,
      riskLevel: finalRiskLevel,
      confidenceScore: confidenceScorePercent,
      explanations,
      detectedSignals,
      analyzedBy: username,
      createdAt: new Date().toISOString()
    };

    // Save to scan history in database
    await dbService.createScanHistory(scanResult);

    return scanResult;
  }
};
