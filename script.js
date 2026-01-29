// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAqE6Qspl-9o9PjdYqdeEM3xwaIk82aNY0",
  authDomain: "carbon-footprint-calcula-1dd77.firebaseapp.com",
  projectId: "carbon-footprint-calcula-1dd77"
});

const auth = firebase.auth();
const db = firebase.firestore();
let userId = null;
let chart = null;

// ---------- Screen Control ----------
function showOnly(id){
  ["loginScreen","registerScreen","homeScreen","calculatorScreen","historyScreen"]
    .forEach(s=>document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  
  // Add smooth scroll to top
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function showLogin(){ 
  showOnly("loginScreen"); 
}

function showRegister(){ 
  showOnly("registerScreen"); 
}

function showHome(){ 
  showOnly("homeScreen"); 
  // Trigger animations
  setTimeout(() => {
    document.querySelectorAll('.animate-slide-up, .animate-fade, .animate-float').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.1}s`;
    });
  }, 100);
}

function showCalculator(){ 
  showOnly("calculatorScreen"); 
  document.getElementById('resultSection').classList.add('hidden');
}

function showHistory(){
  showOnly("historyScreen");
  setTimeout(loadHistory, 300);
}

// ---------- AUTH ----------
function login(){
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if(!email || !password) {
    document.getElementById('loginStatus').innerText = "Please fill in all fields";
    return;
  }
  
  auth.signInWithEmailAndPassword(email, password)
    .then(r=>{
      userId = r.user.uid;
      document.getElementById('loginStatus').innerText = "Login successful!";
      document.getElementById('loginStatus').style.color = "#2d7a4d";
      setTimeout(() => showHome(), 500);
    })
    .catch(e=>{
      document.getElementById('loginStatus').innerText = e.message;
      document.getElementById('loginStatus').style.color = "#dc3545";
    });
}

function register(){
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  if(!email || !password) {
    document.getElementById('registerStatus').innerText = "Please fill in all fields";
    return;
  }
  
  if(password.length < 6) {
    document.getElementById('registerStatus').innerText = "Password must be at least 6 characters";
    return;
  }
  
  auth.createUserWithEmailAndPassword(email, password)
    .then(()=>{
      document.getElementById('registerStatus').innerText = "Account created successfully!";
      document.getElementById('registerStatus').style.color = "#2d7a4d";
      setTimeout(showLogin, 1500);
    })
    .catch(e=>{
      document.getElementById('registerStatus').innerText = e.message;
      document.getElementById('registerStatus').style.color = "#dc3545";
    });
}

function logout(){
  auth.signOut().then(()=>{
    userId = null;
    location.reload();
  });
}

// ---------- CALCULATOR ----------
function calculate(){
  const e = +document.getElementById('electricity').value || 0;
  const t = +document.getElementById('travel').value || 0;
  const f = +document.getElementById('fuel').value || 0;
  const w = +document.getElementById('waste').value || 0;
  const date = document.getElementById('measurementDate').value;
  
  if(!date) {
    alert("Please select a date");
    return;
  }

  // Show result section with animation
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.remove('hidden');
  resultSection.style.animation = 'fadeIn 0.5s ease forwards';

  const total = (e*0.82 + t*0.21 + f*2.9 + w*0.1) / 1000;
  animateResult(total);

  const indicator = document.getElementById('indicator');
  const suggestions = document.getElementById('suggestions');
  
  indicator.className = 'indicator-badge ' + (total<1 ? "low" : total<=1.5 ? "average" : "high");
  indicator.innerText = total<1 ? "🌟 Low Emission - Excellent!" : total<=1.5 ? "⚠️ Moderate Emission" : "🚨 High Emission - Action Needed";

  if(total < 1) {
    suggestions.innerHTML = `
      <div class="suggestion-card good">
        <h4>🎉 Outstanding Performance!</h4>
        <p>Your carbon footprint is below average. Keep up these excellent habits:</p>
        <ul>
          <li>Continue using energy-efficient appliances</li>
          <li>Maintain your sustainable transportation choices</li>
          <li>Share your eco-friendly practices with others</li>
        </ul>
      </div>
    `;
  } else if(total <= 1.5) {
    suggestions.innerHTML = `
      <div class="suggestion-card moderate">
        <h4>💡 Room for Improvement</h4>
        <p>Your emissions are moderate. Try these changes:</p>
        <ul>
          <li>Reduce electricity usage by 10-15% (turn off unused devices)</li>
          <li>Use public transport or carpool 2-3 times per week</li>
          <li>Switch to LED bulbs throughout your home</li>
          <li>Implement a recycling system at home</li>
        </ul>
      </div>
    `;
  } else {
    suggestions.innerHTML = `
      <div class="suggestion-card high">
        <h4>⚠️ Urgent Action Required</h4>
        <p>Your carbon footprint is high. Immediate changes recommended:</p>
        <ul>
          <li>🔴 <strong>Critical:</strong> Reduce electricity consumption by 30%</li>
          <li>🔴 <strong>Critical:</strong> Switch to renewable energy sources</li>
          <li>🔴 Minimize car usage - try cycling or public transport</li>
          <li>🔴 Implement strict waste reduction and recycling</li>
          <li>🔴 Consider carbon offset programs</li>
        </ul>
      </div>
    `;
  }

  // Save to Firebase
  db.collection("history").add({
    uid: userId,
    electricity: e,
    travel: t,
    fuel: f,
    waste: w,
    total: parseFloat(total.toFixed(2)),
    date: date,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("Data saved successfully!");
  }).catch(err => {
    console.error("Error saving data:", err);
    alert("Failed to save data. Please try again.");
  });
}

// ---------- RESULT ANIMATION ----------
function animateResult(val){
  const result = document.getElementById('result');
  let n = 0;
  const increment = val / 50;
  const i = setInterval(()=>{
    n += increment;
    if(n >= val){
      n = val;
      clearInterval(i);
    }
    result.innerText = `Monthly Emission: ${n.toFixed(2)} tons CO₂`;
  }, 20);
}

// ---------- HISTORY DISPLAY (FIXED) ----------
function loadHistory(){
  if(!userId) {
    console.error("No user logged in");
    return;
  }

  const historyList = document.getElementById('historyList');
  const noHistory = document.getElementById('noHistory');
  
  historyList.innerHTML = '<div class="loading">Loading your history...</div>';
  
  // First, check if there's ANY data in history collection
  db.collection("history")
    .where("uid", "==", userId)
    .limit(1)
    .get()
    .then(testSnap => {
      if(testSnap.empty) {
        // No data at all - show empty state
        historyList.classList.add('hidden');
        noHistory.classList.remove('hidden');
        historyList.innerHTML = "";
        if(chart) {
          chart.destroy();
          chart = null;
        }
        return;
      }
      
      // Data exists, now get all with ordering
      // Try to get data without ordering first (in case timestamp index doesn't exist)
      db.collection("history")
        .where("uid", "==", userId)
        .get()
        .then(snap => {
          historyList.innerHTML = "";
          
          if(snap.empty) {
            historyList.classList.add('hidden');
            noHistory.classList.remove('hidden');
            if(chart) {
              chart.destroy();
              chart = null;
            }
            return;
          }
          
          // Hide empty state, show history
          historyList.classList.remove('hidden');
          noHistory.classList.add('hidden');
          
          const labels = [];
          const totals = [];
          const eData = [];
          const tData = [];
          const fData = [];
          const wData = [];
          
          // Convert to array and sort by date
          const docs = [];
          snap.forEach(doc => {
            docs.push({id: doc.id, data: doc.data()});
          });
          
          // Sort by date (newest first)
          docs.sort((a, b) => {
            const dateA = new Date(a.data.date);
            const dateB = new Date(b.data.date);
            return dateB - dateA;
          });
          
          docs.forEach((doc, index) => {
            const d = doc.data;
            
            // Add to chart data (reverse order for chronological display)
            labels.unshift(d.date);
            totals.unshift(d.total);
            eData.unshift((d.electricity * 0.82 / 1000).toFixed(2));
            tData.unshift((d.travel * 0.21 / 1000).toFixed(2));
            fData.unshift((d.fuel * 2.9 / 1000).toFixed(2));
            wData.unshift((d.waste * 0.1 / 1000).toFixed(2));

            // Create history card
            const emissionClass = d.total < 1 ? 'low' : d.total <= 1.5 ? 'average' : 'high';
            const emissionLabel = d.total < 1 ? 'Low' : d.total <= 1.5 ? 'Moderate' : 'High';
            
            historyList.innerHTML += `
              <div class="history-card animate-slide-up" style="animation-delay: ${index * 0.05}s">
                <div class="history-header">
                  <span class="history-date">📅 ${d.date}</span>
                  <span class="history-badge ${emissionClass}">${emissionLabel}</span>
                </div>
                <div class="history-stats">
                  <div class="stat-item">
                    <span class="stat-icon">⚡</span>
                    <span class="stat-value">${d.electricity}</span>
                    <span class="stat-unit">kWh</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">🚗</span>
                    <span class="stat-value">${d.travel}</span>
                    <span class="stat-unit">km</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">⛽</span>
                    <span class="stat-value">${d.fuel}</span>
                    <span class="stat-unit">kg</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">🗑️</span>
                    <span class="stat-value">${d.waste}</span>
                    <span class="stat-unit">kg</span>
                  </div>
                </div>
                <div class="history-total">
                  <strong>Total Carbon Footprint:</strong> 
                  <span class="total-value">${d.total.toFixed(2)} tons CO₂</span>
                </div>
              </div>
            `;
          });

          // Create/Update Chart
          const ctx = document.getElementById('historyChart');
          if(chart) {
            chart.destroy();
          }
          
          chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Total CO₂ (tons)',
                  data: totals,
                  borderColor: '#2d7a4d',
                  backgroundColor: 'rgba(45, 122, 77, 0.1)',
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 5,
                  pointHoverRadius: 7
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    font: { size: 14 },
                    padding: 15
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: 12,
                  titleFont: { size: 14 },
                  bodyFont: { size: 13 }
                }
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { font: { size: 12 } }
                },
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0,0,0,0.05)' },
                  ticks: { 
                    font: { size: 12 },
                    callback: (value) => value.toFixed(2) + ' tons'
                  }
                }
              }
            }
          });
          
        })
        .catch(err => {
          console.error("Error loading history:", err);
          historyList.innerHTML = `
            <div class="error-message">
              <p>⚠️ Error: ${err.message}</p>
              <p>Your data exists but couldn't be loaded. Please refresh the page or contact support.</p>
            </div>
          `;
        });
    })
    .catch(err => {
      console.error("Error checking history:", err);
      historyList.innerHTML = `
        <div class="error-message">
          <p>⚠️ Failed to load history: ${err.message}</p>
          <p>Please check your internet connection and try again.</p>
        </div>
      `;
    });
}

// Check auth state on load - FIXED to always show login screen first
auth.onAuthStateChanged(user => {
  if(user) {
    userId = user.uid;
    // Only auto-login if user was already logged in
    // Don't auto-show home screen on first load
    const hasLoggedIn = sessionStorage.getItem('hasLoggedIn');
    if(hasLoggedIn === 'true') {
      showHome();
    } else {
      showLogin();
    }
  } else {
    userId = null;
    sessionStorage.removeItem('hasLoggedIn');
    showLogin();
  }
});

// Set flag when user successfully logs in
const originalLogin = login;
login = function() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if(!email || !password) {
    document.getElementById('loginStatus').innerText = "Please fill in all fields";
    return;
  }
  
  auth.signInWithEmailAndPassword(email, password)
    .then(r=>{
      userId = r.user.uid;
      sessionStorage.setItem('hasLoggedIn', 'true');
      document.getElementById('loginStatus').innerText = "Login successful!";
      document.getElementById('loginStatus').style.color = "#2d7a4d";
      setTimeout(() => showHome(), 500);
    })
    .catch(e=>{
      document.getElementById('loginStatus').innerText = e.message;
      document.getElementById('loginStatus').style.color = "#dc3545";
    });
};
