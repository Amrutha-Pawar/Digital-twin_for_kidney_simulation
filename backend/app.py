from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import numpy as np
import mysql.connector
from dotenv import load_dotenv
import os
from ai_engine.llm_engine import generate_kidney_analysis

# Load environment variables
load_dotenv()

# ✅ Create app FIRST
app = Flask(__name__)

# ✅ Then enable CORS
CORS(app)

# Load ML model
model = joblib.load('kidney_model.pkl')

# MySQL Connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Amruth@098",
    database="digital_twin"
)

@app.route('/register', methods=['POST'])
def register():
    
    try:
        data = request.json
        print("REGISTER DATA:", data)

        role = data.get('role')

        if role == "doctor":

            cursor.execute(
                "INSERT INTO doctors (name, email, password, license_id, status) VALUES (%s,%s,%s,%s,'pending')",
                (data.get('name'), data.get('email'), data.get('password'), data.get('license'))
            )

        elif role == "patient":

            cursor.execute(
                "INSERT INTO users (name, email, password, age) VALUES (%s,%s,%s,%s)",
                (data.get('name'), data.get('email'), data.get('password'), data.get('age'))
            )

        db.commit()
        
        return jsonify({"status": "success"})

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"status": "fail"})

@app.route('/login', methods=['POST'])
def login():

    data = request.json
    role = data.get('role')

    if role == "doctor":

        cursor.execute(
            "SELECT * FROM doctors WHERE email=%s AND password=%s",
            (data['email'], data['password'])
        )

        doctor = cursor.fetchone()

        if doctor:
            if doctor[5] == "approved":   # status column index
                return jsonify({"status": "success", "role": "doctor"})
            else:
                return jsonify({"status": "pending"})
        else:
            return jsonify({"status": "fail"})

    else:

        cursor.execute(
            "SELECT * FROM users WHERE email=%s AND password=%s",
            (data['email'], data['password'])
        )

        user = cursor.fetchone()

        if user:
            return jsonify({"status": "success", "role": "patient"})
        else:
            return jsonify({"status": "fail"})

cursor = db.cursor(buffered=True)

@app.route('/')
def home():
    return "Kidney Twin Backend Running ✅"


from flask import request

@app.route('/upload', methods=['POST'])
def upload():

    file = request.files['file']

    # TEMP: Dummy extraction (later OCR)
    return jsonify({
        "creatinine": 1.2,
        "glucose": 140,
        "bp": 130
    })

# ================== NEW: DIGITAL TWIN LOGIC ==================

def calculate_health_score(creatinine, glucose, bp):
    score = 100

    if creatinine > 1.2:
        score -= 20
    if glucose > 140:
        score -= 15
    if bp > 140:
        score -= 15

    return max(score, 0)


def get_ckd_stage(gfr):
    if gfr >= 90:
        return "Stage 1 (Normal)"
    elif gfr >= 60:
        return "Stage 2 (Mild)"
    elif gfr >= 30:
        return "Stage 3 (Moderate)"
    elif gfr >= 15:
        return "Stage 4 (Severe)"
    else:
        return "Stage 5 (Failure)"


def simulate_kidney(gfr, glucose, bp, scenario="normal"):

    future = []

    for day in range(30):

        if scenario == "improved":
            glucose -= 1
            bp -= 0.5

        elif scenario == "worse":
            glucose += 1
            bp += 0.5

        if glucose > 150:
            gfr -= 0.2
        if bp > 140:
            gfr -= 0.1

        future.append(round(gfr, 2))

    return future
# ============================================================

@app.route('/predict', methods=['POST'])
def predict():

    try:

        data = request.json

        print("DATA RECEIVED:", data)

        # ML Input Features
        import pandas as pd

        features = pd.DataFrame([{
            "age": float(data.get('age', 0)),
            "weight": float(data.get('weight', 0)),
            "bp": float(data.get('bp', 0)),
            "creatinine": float(data.get('creatinine', 0)),
            "glucose": float(data.get('glucose', 0))
        }])

        # Handle simple mode
        if 'diabetes' in data:

            creatinine = 1.0
            glucose = 100
            bp = 120

            if data.get('diabetes') == "Yes":
                glucose = 160

            if data.get('high_bp') == "Yes":
                bp = 150

            if data.get('swelling') == "Yes":
                creatinine = 1.5

            data['creatinine'] = creatinine
            data['glucose'] = glucose
            data['bp'] = bp
            data['age'] = 40
            data['weight'] = 60

        # ML Prediction
        risk_prediction = model.predict(features)[0]

        # LLM Explanation
        explanation = "Kidney condition analysis generated successfully."
        llm_response = generate_kidney_analysis(data)
        if llm_response:
            explanation = llm_response 
            

        values = (
            data.get('age', 0),
            data.get('weight', 0),
            data.get('bp', 0),
            data.get('creatinine', 0),
            data.get('glucose', 0),
            data.get('hydration', 'Normal'),
            risk_prediction,
            explanation,
            data.get('email')   # 🔥 NEW
        )

        query = """
            INSERT INTO patients 
            (age, weight, bp, creatinine, glucose, hydration, risk, explanation, email)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """
        
        # ================== NEW: DIGITAL TWIN CALCULATIONS ==================

        # Dummy GFR calculation
        gfr = 120 - float(data.get('creatinine', 1)) * 20

        health_score = calculate_health_score(
            float(data.get('creatinine', 0)),
            float(data.get('glucose', 0)),
            float(data.get('bp', 0))
        )

        ckd_stage = get_ckd_stage(gfr)

        simulation = simulate_kidney(
            gfr,
            float(data.get('glucose', 0)),
            float(data.get('bp', 0)),
            data.get('hydration', 'Normal')
        )
        # ====================================================================

        
        cursor.execute(query, values)
        db.commit()

        return jsonify({
            "risk": str(risk_prediction),
            "explanation": explanation,
            "health_score": health_score,
            "ckd_stage": ckd_stage,
            "simulation": simulation
        })
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)})

    
@app.route('/patients', methods=['GET'])
def get_patients():

    cursor.execute("SELECT * FROM patients ORDER BY id DESC")
    rows = cursor.fetchall()

    patients = []

    for row in rows:
        patients.append({
            "age": row[0],
            "weight": row[1],
            "bp": row[2],
            "creatinine": row[3],
            "glucose": row[4],
            "hydration": row[5],
            "risk": row[6],
            "explanation": row[7],
            "email": row[8]   # 🔥 ADD THIS
        })

    return {
    "age": row[0],
    "weight": row[1],
    "bp": row[2],
    "creatinine": row[3],
    "glucose": row[4],
    "hydration": row[5],
    "risk": row[6],
    "explanation": row[7],
    "email": row[8]
}



if __name__ == '__main__':
    app.run(debug=True)