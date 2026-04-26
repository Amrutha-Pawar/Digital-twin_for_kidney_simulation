import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def generate_kidney_analysis(data):

    try:

        prompt = f"""
        You are an expert nephrologist (kidney specialist).

        Analyze the patient data and generate a structured medical report.

        Patient Details:
        - Age: {data.get('age')}
        - Blood Pressure: {data.get('bp')}
        - Creatinine: {data.get('creatinine')}
        - Glucose: {data.get('glucose')}
        - Hydration: {data.get('hydration')}

        Generate output in STRICT format:

        1. Condition:
        (Normal / Mild Risk / Moderate Risk / Severe Risk)

        2. CKD Stage:
        (Stage 1 to Stage 5 if applicable)

        3. Key Problems:
        - List main issues

        4. Explanation:
        - Explain in simple words

        5. Precautions:
        - Give safety steps

        6. Recommended Diet:
        - Foods patient should eat

        7. Foods to Avoid:
        - Foods patient must avoid

        IMPORTANT:
        - Keep language simple
        - No medical jargon
        - Be clear and structured
        - STRICTLY follow format
        """

        response = requests.post(OLLAMA_URL, json={
            "model": "llama3",   # ✅ FIXED
            "prompt": prompt,
            "stream": False
        })

        result = response.json()

        return result.get("response", "AI analysis not available")

    except Exception as e:
        print("LLM ERROR:", e)
        return "AI analysis temporarily unavailable"