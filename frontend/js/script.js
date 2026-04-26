async function login(){

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const role = document.getElementById("role").value

    localStorage.setItem("user_email", email)

    const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, role})
    })

    const data = await res.json()

    if(data.role === "doctor"){
        window.location.href = "doctor.html"
    }
    else if(data.role === "patient"){
        window.location.href = "input.html"
    }
    else{
        alert("Login failed or not approved")
    }
}

const roleElement = document.getElementById("role")

if(roleElement){
    roleElement.onchange = function(){
        if(this.value === "doctor"){
            const doctorFields = document.getElementById("doctorFields")
            if(doctorFields){
                doctorFields.style.display = "block"
            }
        }
    }
}

async function register(){

    const name = document.getElementById("name").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const age = document.getElementById("age").value
    const role = document.getElementById("role").value
    const license = document.getElementById("license")?.value

    console.log("Sending:", {name, email, password, age, role, license}) // 🔥 DEBUG

    const res = await fetch("http://127.0.0.1:5000/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            password,
            age,
            role,
            license
        })
    })

    const data = await res.json()
    console.log("Response:", data)

    if(data.status === "success"){
        alert("Registered Successfully ✅")
    }else{
        alert("Registration Failed ❌")
    }

}

function toggleSidebar(){
    const sidebar = document.getElementById("sidebar")

    if(sidebar.style.left === "0px"){
        sidebar.style.left = "-250px"
    }else{
        sidebar.style.left = "0px"
    }
}

function startSimulation(){
    window.location.href = "input.html"
}

function toggleMode(){
    const mode = document.getElementById("mode").value
    const simple = document.getElementById("simpleMode")
    const formGrid = document.querySelector(".form-grid")

    if(mode === "simple"){
        simple.style.display = "block"
        formGrid.style.display = "none"
    }else{
        simple.style.display = "none"
        formGrid.style.display = "grid"
    }
}


async function uploadReport(){

    const file = document.getElementById("reportUpload").files[0]

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData
    })

    const data = await res.json()

    // AUTO FILL
    document.getElementById("creatinine").value = data.creatinine
    document.getElementById("glucose").value = data.glucose
    document.getElementById("bp").value = data.bp
}


function startVoice(){

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    recognition.lang = "en-US"
    recognition.interimResults = false

    recognition.onstart = function(){
        console.log("Mic started 🎤")
    }

    recognition.onerror = function(e){
        console.error("Voice error:", e)
        alert("Mic not working. Allow microphone permission.")
    }

    recognition.onresult = function(event){

        const text = event.results[0][0].transcript.toLowerCase()

        console.log("Voice:", text)

        // ✅ DISPLAY TEXT
        const voiceBox = document.getElementById("voiceOutput")

        if(voiceBox){
            voiceBox.innerText = "You said: " + text
        }

        // ✅ SWITCH TO SIMPLE MODE
        document.getElementById("mode").value = "simple"
        toggleMode()

        // ✅ AUTO FILL QUESTIONS
        if(text.includes("diabetes")){
            document.getElementById("s_diabetes").value = "Yes"
        }

        if(text.includes("pressure") || text.includes("bp")){
            document.getElementById("s_bp").value = "Yes"
        }

        if(text.includes("swelling")){
            document.getElementById("s_swelling").value = "Yes"
        }

        if(text.includes("tired") || text.includes("fatigue")){
            document.getElementById("s_fatigue").value = "Yes"
        }

        // 👉 OPTIONAL: send full speech to backend
        localStorage.setItem("voice_text", text)
    }

    recognition.start()
}


/* FORM SUBMIT */

const form = document.getElementById("patientForm")

if(form){

form.addEventListener("submit", async function(e){

e.preventDefault()

alert("Submitting form...")  // 🔥 DEBUG (you must see this)

const mode = document.getElementById("mode").value

let data = {}

if(mode === "simple"){

    let diabetes = document.getElementById("s_diabetes").value
    let bp = document.getElementById("s_bp").value
    let swelling = document.getElementById("s_swelling").value
    let fatigue = document.getElementById("s_fatigue").value

    let creatinine = 1.0
    let glucose = 100
    let bloodPressure = 120

    if(diabetes === "Yes"){
        glucose = 160
    }

    if(bp === "Yes"){
        bloodPressure = 150
    }

    if(swelling === "Yes"){
        creatinine = 1.5
    }

    data = {
        name: document.getElementById("name").value || "User",
        age: document.getElementById("age").value || "Not Available",
        weight: document.getElementById("weight").value || "Not Available",

        bp: bloodPressure,
        creatinine: creatinine,
        glucose: glucose,
        hydration: "Normal",

        diabetes,
        high_bp: bp,
        swelling,
        fatigue
    }
}else{

    data = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        weight: document.getElementById("weight").value,
        bp: document.getElementById("bp").value,
        creatinine: document.getElementById("creatinine").value,
        glucose: document.getElementById("glucose").value,
        hydration: document.getElementById("hydration").value
    }

}

if(mode === "advanced"){
    if(!data.creatinine || !data.glucose){
        alert("Please fill required fields")
        return
    }
}

data.email = localStorage.getItem("user_email")
console.log("Sending:", data)

try{

const response = await fetch("http://127.0.0.1:5000/predict",{
    method:"POST",
    headers:{
        "Content-Type":"application/json"
    },
    body: JSON.stringify(data)
})

const result = await response.json()

localStorage.setItem("risk", result.risk)
localStorage.setItem("explanation", result.explanation)
localStorage.setItem("health_score", result.health_score)
localStorage.setItem("ckd_stage", result.ckd_stage)
localStorage.setItem("simulation", JSON.stringify(result.simulation))

console.log("RESULT:", result)

/* SAVE DATA */
localStorage.setItem("name", data.name || "User")
localStorage.setItem("age", data.age || "Not Available")
localStorage.setItem("weight", data.weight || "Not Available")
localStorage.setItem("bp", data.bp || "Not Available")
localStorage.setItem("creatinine", data.creatinine || "Not Available")
localStorage.setItem("glucose", data.glucose || "Not Available")
localStorage.setItem("hydration", data.hydration || "Not Available")


localStorage.setItem("new_report", "true")
/* REDIRECT */
window.location.href = "result.html"

}catch(err){

alert("Backend connection failed")

}

})

}
function downloadReport(){

const element = document.getElementById("reportContent")

html2pdf(element, {
margin: 10,
filename: 'Kidney_Digital_Twin_Report.pdf',
image: { type: 'jpeg', quality: 0.98 },
html2canvas: { scale: 2 },
jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
})

}

const risk = localStorage.getItem("risk")

const riskElement = document.getElementById("riskLevel")

if(riskElement){
    riskElement.innerText = risk

    if(risk && risk.toLowerCase().includes("high")){
        riskElement.style.color = "red"
    }
    else if(risk && risk.toLowerCase().includes("moderate")){
        riskElement.style.color = "orange"
    }
    else{
        riskElement.style.color = "green"
    }
}

function goToDoctor(){
    window.location.href = "doctor.html"
}

/* RESULT PAGE */

if(document.getElementById("riskLevel")){

document.getElementById("r_name").innerText =
localStorage.getItem("name")

document.getElementById("riskLevel").innerText =
localStorage.getItem("risk")

const aiText = localStorage.getItem("explanation")

if(aiText){
    const formatted = aiText
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\n\*/g, "<br>•")
        .replace(/\n\+/g, "<br>&nbsp;&nbsp;+")
        .replace(/\n/g, "<br>")
        .replace(/Explanation:<\/b><br>/g, "Explanation:</b><br><br>") // spacing

    document.getElementById("aiMessage").innerHTML = formatted
}

document.getElementById("r_age").innerText =
localStorage.getItem("age")

document.getElementById("r_weight").innerText =
localStorage.getItem("weight")

document.getElementById("r_bp").innerText =
localStorage.getItem("bp")

document.getElementById("r_creatinine").innerText =
localStorage.getItem("creatinine")

document.getElementById("r_glucose").innerText =
localStorage.getItem("glucose")

document.getElementById("r_hydration").innerText =
localStorage.getItem("hydration")

document.getElementById("healthScore").innerText =
localStorage.getItem("health_score")

document.getElementById("ckdStage").innerText =
localStorage.getItem("ckd_stage")
}