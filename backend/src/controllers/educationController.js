import { dbService } from '../models/dbService.js';

// Predefined security modules and interactive quizzes
const QUIZZES = [
  {
    id: 'phishing-spoofing',
    title: 'Phishing & Email Spoofing Awareness',
    description: 'Learn to recognize deceptive emails, domain spoofs, and phishing tricks that hackers use to steal passwords.',
    difficulty: 'Beginner',
    rewardScore: 15,
    tips: [
      'Always inspect the sender\'s email address closely (e.g. check for support@paypa1.com vs support@paypal.com).',
      'Look out for urgent language demanding immediate login to avoid account suspension.',
      'Hover over links before clicking to verify where they actually lead.',
      'Real brands will never ask you to click a link to input passwords or credit cards in an email body.'
    ],
    questions: [
      {
        question: 'You receive an email from "Security Team <security@amzn-alert-verify.com>" claiming your account is locked. What is the first thing you should check?',
        options: [
          'Verify the sender domain: official Amazon communications do not come from "amzn-alert-verify.com".',
          'Click the link immediately to prevent lock-out.',
          'Ignore it completely and assume everything is fine.',
          'Reply to the email asking if it is authentic.'
        ],
        correctIndex: 0,
        explanation: 'Phishers use brand-resembling domain names (like amzn-alert-verify.com) to deceive you. Always check the primary domain name behind the "@" symbol.'
      },
      {
        question: 'Which of the following top-level domain extensions (TLDs) is considered high-risk for new phishing activities?',
        options: [
          '.gov',
          '.org',
          '.xyz or .click',
          '.edu'
        ],
        correctIndex: 2,
        explanation: '.xyz, .click, .ru, and .cc are low-cost TLDs frequently registered in massive numbers for short-lived phishing campaigns.'
      },
      {
        question: 'A secure website URL should always start with:',
        options: [
          'http://',
          'https://',
          'www.',
          'ftp://'
        ],
        correctIndex: 1,
        explanation: 'HTTPS encrypts data transferred between your browser and the server. However, remember that phishers can also use HTTPS, so domain spelling still must be verified.'
      }
    ]
  },
  {
    id: 'fake-jobs',
    title: 'Fake Job & Income Scams',
    description: 'Protect yourself from fake work-from-home offers, invoice processing schemes, and recruiters requesting advance fees.',
    difficulty: 'Intermediate',
    rewardScore: 20,
    tips: [
      'Genuine employers do not ask you to pay onboarding, registration, or equipment fees up front.',
      'Be wary of job offers that claim extremely high pay (e.g. $500/hr) for low-skill tasks.',
      'Always interview in person or via official video channels, not strictly over anonymous text apps like Telegram.',
      'Verify the company on official professional portals like LinkedIn or corporate directories.'
    ],
    questions: [
      {
        question: 'A company contacts you offering a "Data Entry Assistant" job paying $4,000/week, but requires you to pay a $50 "licensing fee" first. What should you do?',
        options: [
          'Pay it immediately; the salary makes it worth it.',
          'Ask if they can deduct the $50 from your first paycheck.',
          'Decline: genuine employers will never request cash payments from candidates.',
          'Send them your bank details so they can waive the fee.'
        ],
        correctIndex: 2,
        explanation: 'Any request for up-front payments for "training", "laptops", or "onboarding processing" is a red flag for employment fraud.'
      },
      {
        question: 'Why do fake job recruiters request your SSN, banking info, or passport photos during the initial chat?',
        options: [
          'To run standard corporate credit reviews.',
          'To perform identity theft or draft unauthorized bank transfers.',
          'To expedite tax forms.',
          'To set up corporate access badges.'
        ],
        correctIndex: 1,
        explanation: 'Providing banking credentials or identification documents early in recruitment puts you at massive risk of identity theft and bank fraud.'
      }
    ]
  },
  {
    id: 'otp-bank-fraud',
    title: 'OTP & Bank Support Fraud',
    description: 'Master bank security rules to avoid automated OTP triggers, wire transfer traps, and phone support impersonations.',
    difficulty: 'Advanced',
    rewardScore: 25,
    tips: [
      'Never, under any circumstances, share a bank OTP code with anyone—even someone claiming to be a bank agent.',
      'Banks will never call you out of the blue to ask for your security password or PIN.',
      'If you receive an unsolicited SMS OTP, it means someone is attempting to log into your account. Do not type or click anything.',
      'When in doubt, hang up and call the number printed directly on the back of your official credit card.'
    ],
    questions: [
      {
        question: 'A "bank representative" calls to cancel a fraudulent charge on your card and asks you to read back the security code sent to your phone. What do you do?',
        options: [
          'Read the code to them so they can stop the hacker.',
          'Hang up immediately and call your bank using their official verified customer support number.',
          'Give them a fake number to see what happens.',
          'Ask them to email you instead.'
        ],
        correctIndex: 1,
        explanation: 'The code sent to your phone is a One-Time Password (OTP) generated to approve a transaction or password reset. Real bank employees do not need or ask for OTPs.'
      },
      {
        question: 'What does a sudden, unsolicited SMS verification code suggest?',
        options: [
          'Your bank account was randomly audited.',
          'Someone has input your username and is attempting to complete a login or financial transfer.',
          'Your phone needs a security patch.',
          'Your monthly bank statement has arrived.'
        ],
        correctIndex: 1,
        explanation: 'Unsolicited OTP codes mean an unauthorized login or charge attempt is underway. Ignore the message, do not share it, and check your bank statements directly.'
      }
    ]
  },
  {
    id: 'fake-payment-links',
    title: 'Fake Payment & Logistics Portals',
    description: 'Spot look-alike payment pages, fake delivery redelivery fees, and fake escrow/deposit links.',
    difficulty: 'Intermediate',
    rewardScore: 20,
    tips: [
      'Logistics services (DHL, FedEx, UPS) will not lock your packages demanding immediate online payment of $1-$3 redelivery fees.',
      'Always type the official URL directly in your browser rather than clicking email/SMS redirect links.',
      'Verify shopping cart URLs are hosted on correct domains (e.g. check for sandbox/malicious subdomains).'
    ],
    questions: [
      {
        question: 'You receive an SMS from "DHL Delivery" stating that your parcel is held at the depot due to an incorrect zip code and asks for $1.50 redelivery fee. What is the risk?',
        options: [
          'It is a genuine shipping fee error.',
          'Phishing: it is a credential-harvesting trap designed to capture your credit card details.',
          'It is an automated customs check.',
          'It is a standard post-office alert.'
        ],
        correctIndex: 1,
        explanation: 'Logistics phishing campaigns ask for small fees ($1 to $2) so you let your guard down. Once you enter your credit card details, they steal them to make thousands in unauthorized charges.'
      }
    ]
  }
];

export const getQuizzesList = async (req, res) => {
  try {
    // Send quizzes structure
    return res.json({
      success: true,
      data: QUIZZES
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve educational modules.' });
  }
};

export const submitQuizScore = async (req, res) => {
  const { quizId, score, currentSecurityScore, completedQuizzes = [] } = req.body;

  if (!quizId || score === undefined) {
    return res.status(400).json({ success: false, message: 'Missing quiz ID or score.' });
  }

  try {
    const quiz = QUIZZES.find(q => q.id === quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz module not found.' });
    }

    // Check if quiz already completed to prevent farming security scores
    const alreadyCompleted = req.user 
      ? req.user.completedQuizzes?.some(q => q.quizId === quizId)
      : completedQuizzes.some(q => q.quizId === quizId);
    
    let addedPoints = 0;
    // Award safety points if score is perfect (100% or close to passing)
    if (score >= 80 && !alreadyCompleted) {
      addedPoints = quiz.rewardScore;
    }

    const currentScore = req.user 
      ? (req.user.securityScore || 100) 
      : (currentSecurityScore !== undefined ? currentSecurityScore : 50);
      
    // Calculate new secure score (limit within 0 - 100)
    const newScore = Math.min(100, currentScore + addedPoints);

    const completedQuizObj = {
      quizId,
      score,
      completedAt: new Date().toISOString()
    };

    if (req.user) {
      const userId = req.user._id || req.user.id;
      await dbService.updateUserScore(userId, addedPoints, completedQuizObj);
    }

    return res.json({
      success: true,
      message: addedPoints > 0 ? `Congratulations! You earned +${addedPoints} Security Hygiene Points!` : 'Quiz completed successfully!',
      data: {
        securityScore: newScore,
        pointsAwarded: addedPoints,
        quizCompleted: completedQuizObj
      }
    });
  } catch (error) {
    console.error('Submit quiz score error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save quiz results.' });
  }
};
