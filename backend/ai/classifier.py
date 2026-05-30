import sys
import os
import json
import pickle
import math
import re

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

# Same preprocessing as train_model.py
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return [w for w in text.split() if w not in STOP_WORDS]

class LoadedPurePythonClassifier:
    def __init__(self, state):
        self.classes = ['safe', 'suspicious', 'high-risk']
        self.class_counts = state['class_counts']
        self.vocab = set(state['vocab'])
        self.word_counts = state['word_counts']
        self.total_docs = state['total_docs']

    def predict(self, text):
        words = preprocess(text)
        scores = {}
        
        for label in self.classes:
            prior = self.class_counts[label] / self.total_docs if self.total_docs > 0 else 1/3
            log_prob = math.log(prior)
            
            total_words_in_class = sum(self.word_counts[label].values())
            vocab_size = len(self.vocab)
            
            for word in words:
                if word in self.vocab:
                    count = self.word_counts[label].get(word, 0)
                    prob = (count + 1) / (total_words_in_class + vocab_size)
                    log_prob += math.log(prob)
                else:
                    prob = 1 / (total_words_in_class + vocab_size)
                    log_prob += math.log(prob)
            
            scores[label] = log_prob
        
        max_score = max(scores.values())
        exp_scores = {c: math.exp(s - max_score) for c, s in scores.items()}
        sum_exp = sum(exp_scores.values())
        probabilities = {c: (e / sum_exp) for c, e in exp_scores.items()}
        
        predicted_class = max(probabilities, key=probabilities.get)
        confidence = probabilities[predicted_class]
        
        return predicted_class, confidence, probabilities

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input text provided."}))
        sys.exit(1)
        
    text_to_scan = sys.argv[1]
    
    # Path settings - Script-relative absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    vectorizer_path = os.path.join(script_dir, 'models', 'vectorizer.pkl')
    model_path = os.path.join(script_dir, 'models', 'model.pkl')
    pure_python_path = os.path.join(script_dir, 'models', 'pure_python_model.json')
    
    risk_level = "safe"
    confidence = 1.0
    probabilities = {"safe": 1.0, "suspicious": 0.0, "high-risk": 0.0}
    model_type = "heuristic"
    
    # Try using scikit-learn model first
    if os.path.exists(vectorizer_path) and os.path.exists(model_path):
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.naive_bayes import MultinomialNB
            
            with open(vectorizer_path, 'rb') as f:
                vectorizer = pickle.load(f)
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
                
            X_text = vectorizer.transform([text_to_scan])
            prediction = model.predict(X_text)[0]
            probs = model.predict_proba(X_text)[0]
            
            risk_level = prediction
            confidence = float(max(probs))
            
            class_labels = model.classes_
            probabilities = {class_labels[i]: float(probs[i]) for i in range(len(class_labels))}
            model_type = "scikit-learn"
            
        except Exception as e:
            # Fall back if pickle fails
            pass
            
    # Try using Pure Python classification state next
    if model_type == "heuristic" and os.path.exists(pure_python_path):
        try:
            with open(pure_python_path, 'r') as f:
                state = json.load(f)
            
            classifier = LoadedPurePythonClassifier(state)
            pred_class, conf, probs = classifier.predict(text_to_scan)
            
            risk_level = pred_class
            confidence = conf
            probabilities = probs
            model_type = "pure-python-bayes"
        except Exception as e:
            pass
            
    # Standard rule-based fallback if everything else failed
    if model_type == "heuristic":
        text_lower = text_to_scan.lower()
        high_risk_keywords = ["otp", "bank account", "suspended", "unauthorized transaction", "click here to login", "cash prize", "million", "lottery winner", "verification code", "amazon id verify"]
        suspicious_keywords = ["work from home", "make money fast", "bitcoin deposit", "discount outlet", "virtual assistant", "deposit now"]
        
        high_count = sum(1 for kw in high_risk_keywords if kw in text_lower)
        susp_count = sum(1 for kw in suspicious_keywords if kw in text_lower)
        
        if high_count > 0:
            risk_level = "high-risk"
            confidence = min(0.95, 0.70 + 0.1 * high_count)
            probabilities = {"safe": 0.05, "suspicious": 0.15, "high-risk": 0.80}
        elif susp_count > 0:
            risk_level = "suspicious"
            confidence = min(0.85, 0.60 + 0.1 * susp_count)
            probabilities = {"safe": 0.15, "suspicious": 0.70, "high-risk": 0.15}
        else:
            risk_level = "safe"
            confidence = 0.90
            probabilities = {"safe": 0.90, "suspicious": 0.08, "high-risk": 0.02}
            
    output = {
        "text": text_to_scan,
        "riskLevel": risk_level,
        "confidenceScore": round(confidence, 3),
        "probabilities": {k: round(v, 3) for k, v in probabilities.items()},
        "modelUsed": model_type
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
