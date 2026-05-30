import sys
import os
import json
import pickle
import math
import re

# Curated training data representing phishing, fake job offers, banking fraud, and standard safe messages.
TRAINING_DATA = [
    # --- SCAMS (phishing, otp, fake jobs, etc.) ---
    {"text": "URGENT: Your bank account has been suspended due to suspicious activity. Login at http://secure-bank-login-verify.net immediately to reactivate your access.", "label": "high-risk"},
    {"text": "Dear customer, we detected an unauthorized transaction of $500.00. If this was not you, please verify your details at http://security-update-paypal-verify.click.", "label": "high-risk"},
    {"text": "Congratulations! You have won $1,000,000 in our international lottery. To claim your cash prize, email your banking credentials and OTP code to admin@lottery-winner.ru.", "label": "high-risk"},
    {"text": "Netflix billing update: Your subscription could not be renewed. Please update your payment method at http://netflix-billing-renew.xyz within 24 hours.", "label": "high-risk"},
    {"text": "A temporary PIN (OTP) 849204 has been generated for a bank transfer of $2,500. If you did not request this, call our support line or click http://chase-security-otp.cc.", "label": "high-risk"},
    {"text": "Your Amazon account has been locked. Click here to confirm your identity and unlock your purchases: http://amazon-id-verify-alert.com.", "label": "high-risk"},
    {"text": "WORK FROM HOME! Earn $500 per hour processing invoices. No experience required. Send $50 for onboarding fee to get started. Click http://easy-money-work.net.", "label": "suspicious"},
    {"text": "Job Offer: We are looking for virtual assistants. Salary is $3,000 per week. You must provide your bank details, credit card, and SSN to start working immediately. Contact hr@job-offers-verify.com.", "label": "suspicious"},
    {"text": "Hi, your DHL package delivery failed because of incorrect address details. Please update your address and pay a small redelivery fee of $1.50 at http://dhl-package-redeliver.top.", "label": "high-risk"},
    {"text": "Your Google verification code is 492058. Do not share this code with anyone. An agent will call you to confirm your identity. Provide them this security code.", "label": "high-risk"},
    {"text": "Receive 100% matching bonus on your first Bitcoin deposit! Increase your savings instantly by 10x. Join our risk-free investment scheme today at http://crypto-double-earnings.biz.", "label": "suspicious"},
    {"text": "URGENT: IRS Tax Refund Alert. You have an outstanding refund of $1,200. Click here to file your direct deposit information: http://irs-tax-refund-gov-portal.com.", "label": "high-risk"},
    {"text": "Hey mom, my phone is broken, I am texting you from a friend's phone. I urgently need $800 to buy a new one or pay rent. Please send money to this UPI / Bank account now.", "label": "high-risk"},
    {"text": "Exclusive offer! Buy rayban sunglasses with 90% discount. Limited stocks available. Order right now: http://rayban-discount-outlet.ru.", "label": "suspicious"},
    {"text": "Account update: Your Microsoft password will expire in 2 hours. Keep your current password by verifying here: http://microsoft-account-secure.net.", "label": "high-risk"},

    # --- SAFE / HAM MESSAGES ---
    {"text": "Hey, are we still meeting for lunch today at 1:00 PM? Let me know if you want to try that new Italian place down the street.", "label": "safe"},
    {"text": "Your verification code is 849204. It will expire in 10 minutes. If you did not request this, please ignore this message.", "label": "safe"},
    {"text": "Hey, I sent you the project report. Please review the slides and let me know if there are any changes needed before our client presentation.", "label": "safe"},
    {"text": "Thanks for ordering from Pizza Hut! Your delivery driver is on their way and should arrive in approximately 15 minutes.", "label": "safe"},
    {"text": "Your monthly bank statement for account ending in 4920 is now available online. Log in to your secure portal to view the details.", "label": "safe"},
    {"text": "Hi, just wanted to check if you got home safely last night. It was great catching up with you!", "label": "safe"},
    {"text": "Hi team, the weekly standup meeting has been rescheduled to tomorrow morning at 10:00 AM due to a scheduling conflict. Thanks!", "label": "safe"},
    {"text": "Your prescription is ready for pickup at CVS Pharmacy. Please bring your insurance card and photo ID. Thank you.", "label": "safe"},
    {"text": "Hey, can you send me the link to that website we were discussing yesterday? I forgot to bookmark it.", "label": "safe"},
    {"text": "Confirming your dentist appointment scheduled for Monday, June 1st at 3:30 PM. Reply 1 to confirm, 2 to reschedule.", "label": "safe"},
    {"text": "Hi there, your package from Amazon has been delivered to your front door. Have a wonderful day!", "label": "safe"},
    {"text": "Your flight UA384 to San Francisco is on time. Gate 4B is now boarding. Please proceed to the gate.", "label": "safe"}
]

STOP_WORDS = {
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
}

def preprocess(text):
    # Simple word tokenization, normalization, and stop words removal
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return [w for w in text.split() if w not in STOP_WORDS]

# Fallback Pure Python TF-IDF + Naive Bayes Classifier Implementation
class PurePythonClassifier:
    def __init__(self):
        self.classes = ['safe', 'suspicious', 'high-risk']
        self.class_counts = {c: 0 for c in self.classes}
        self.vocab = set()
        self.word_counts = {c: {} for c in self.classes}
        self.total_docs = 0

    def fit(self, data):
        self.total_docs = len(data)
        for item in data:
            label = item['label']
            self.class_counts[label] += 1
            words = preprocess(item['text'])
            for word in words:
                self.vocab.add(word)
                self.word_counts[label][word] = self.word_counts[label].get(word, 0) + 1

    def predict(self, text):
        words = preprocess(text)
        scores = {}
        
        # Calculate probabilities with Laplace smoothing
        for label in self.classes:
            # Prior probability log(P(C))
            prior = self.class_counts[label] / self.total_docs if self.total_docs > 0 else 1/3
            log_prob = math.log(prior)
            
            total_words_in_class = sum(self.word_counts[label].values())
            vocab_size = len(self.vocab)
            
            for word in words:
                if word in self.vocab:
                    # Likelihood P(W|C) with smoothing
                    count = self.word_counts[label].get(word, 0)
                    prob = (count + 1) / (total_words_in_class + vocab_size)
                    log_prob += math.log(prob)
                else:
                    # Ignore unknown words or give minor penalty
                    prob = 1 / (total_words_in_class + vocab_size)
                    log_prob += math.log(prob)
            
            scores[label] = log_prob
        
        # Convert log probabilities back to soft probability/confidence scores
        # Softmax of log-probabilities
        max_score = max(scores.values())
        exp_scores = {c: math.exp(s - max_score) for c, s in scores.items()}
        sum_exp = sum(exp_scores.values())
        probabilities = {c: (e / sum_exp) for c, e in exp_scores.items()}
        
        predicted_class = max(probabilities, key=probabilities.get)
        confidence = probabilities[predicted_class]
        
        return predicted_class, confidence, probabilities

def train():
    print("[AI SYSTEM] AI Scam Detector Model Training initiated...")
    
    # Path settings - Script-relative absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(script_dir, 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    # Try importing scikit-learn
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        
        print("[AI SYSTEM] scikit-learn found! Training advanced TF-IDF Naive Bayes model...")
        
        texts = [item['text'] for item in TRAINING_DATA]
        labels = [item['label'] for item in TRAINING_DATA]
        
        vectorizer = TfidfVectorizer(stop_words='english', lowercase=True)
        X = vectorizer.fit_transform(texts)
        
        model = MultinomialNB(alpha=0.1)
        model.fit(X, labels)
        
        # Save model and vectorizer
        with open(os.path.join(model_dir, 'vectorizer.pkl'), 'wb') as f:
            pickle.dump(vectorizer, f)
        with open(os.path.join(model_dir, 'model.pkl'), 'wb') as f:
            pickle.dump(model, f)
            
        print("[AI SYSTEM] Advanced ML model successfully trained and serialized.")
        
    except ImportError:
        print("[AI SYSTEM] Warning: scikit-learn is not installed in the current environment.")
        print("[AI SYSTEM] Skipping advanced ML model training.")
        
    # ALWAYS train and save the Pure Python Heuristic/Bayesian Classifier setup
    print("[AI SYSTEM] Executing Native Pure Python Heuristic/Bayesian Classifier setup...")
    
    classifier = PurePythonClassifier()
    classifier.fit(TRAINING_DATA)
    
    # Save the pure python classifier states
    model_state = {
        'class_counts': classifier.class_counts,
        'vocab': list(classifier.vocab),
        'word_counts': classifier.word_counts,
        'total_docs': classifier.total_docs
    }
    
    json_path = os.path.join(model_dir, 'pure_python_model.json')
    with open(json_path, 'w') as f:
        json.dump(model_state, f, indent=2)
        
    print(f"[AI SYSTEM] Pure Python NLP model successfully compiled and cached at {json_path}.")

if __name__ == "__main__":
    train()
