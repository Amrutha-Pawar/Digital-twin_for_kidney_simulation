import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

np.random.seed(42)

data_size = 500

data = pd.DataFrame({
    'age': np.random.randint(18, 80, data_size),
    'weight': np.random.randint(45, 100, data_size),
    'bp': np.random.randint(90, 180, data_size),
    'creatinine': np.round(np.random.uniform(0.5, 2.5, data_size), 2),
    'glucose': np.random.randint(70, 200, data_size)
})

# ✅ Better & safer labeling logic
risk = []

for c in data['creatinine']:
    if c <= 1.2:
        risk.append("Low Risk")
    elif c <= 1.8:
        risk.append("Moderate Risk")
    else:
        risk.append("High Risk")

data['risk'] = risk

X = data[['age', 'weight', 'bp', 'creatinine', 'glucose']]
y = data['risk']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = RandomForestClassifier()
model.fit(X_train, y_train)

joblib.dump(model, 'kidney_model.pkl')

print("Model Trained Successfully ✅")