// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAqE6Qspl-9o9PjdYqdeEM3xwaIk82aNY0",
  authDomain: "carbon-footprint-calcula-1dd77.firebaseapp.com",
  projectId: "carbon-footprint-calcula-1dd77",
  storageBucket: "carbon-footprint-calcula-1dd77.appspot.com",
  messagingSenderId: "137787414051",
  appId: "1:137787414051:web:8239c1d78484695ef18396"
};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth();
const db=firebase.firestore();
let userId=null;
let historyChartInstance=null;

// Screens
function showScreen(id){
  ["authScreen","homeScreen","calculatorScreen","historyScreen","emissionScreen"].forEach(s=>{
    document.getElementById(s).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}
function showCalculator(){ showScreen("calculatorScreen"); }
function showHistory(){ showScreen("historyScreen"); loadChart(); }
function backHome(){ showScreen("homeScreen"); }
function showEmissionReminder(){ showScreen("emissionScreen"); loadVehicles(); }

// Auth
const authEmail=document.getElementById("authEmail");
const authPassword=document.getElementById("authPassword");
const authButton=document.getElementById("authButton");
const authStatus=document.getElementById("authStatus");
const registerBtn=document.getElementById("registerBtn");

authButton.addEventListener("click",()=>{
  const email=authEmail.value.trim();
  const pass=authPassword.value.trim();
  if(!email||!pass){ authStatus.innerText="Enter email & password"; return;}
  if(authButton.innerText.includes("Login")){
    auth.signInWithEmailAndPassword(email,pass).then(res=>{userId=res.user.uid;showScreen("homeScreen");}).catch(err=>authStatus.innerText=err.message);
  }else{
    auth.createUserWithEmailAndPassword(email,pass).then(res=>{userId=res.user.uid;showScreen("homeScreen");}).catch(err=>authStatus.innerText=err.message);
  }
});
registerBtn.addEventListener("click",()=>{ authButton.innerText="Register"; authStatus.innerText=""; });

// Logout
function logout(){ auth.signOut().then(()=>{ userId=null; showScreen("authScreen"); authEmail.value=""; authPassword.value=""; authButton.innerText="Login"; }); }

// Calculator
function calculate(){
  const electricity=+document.getElementById("electricity").value||0;
  const travel=+document.getElementById("travel").value||0;
  const fuel=+document.getElementById("fuel").value||0;
  const waste=+document.getElementById("waste").value||0;
  const other=+document.getElementById("other").value||0;
  const dateInput=document.getElementById("measurementDate").value;
  if(!dateInput){ alert("Select measurement date"); return; }

  let annual=(electricity*0.82+travel*0.21+fuel*2.9+waste*0.1+other)*12/1000;

  const r=document.getElementById("result");
  const i=document.getElementById("indicator");
  const s=document.getElementById("suggestions");

  let cur=0, step=annual/40;
  clearInterval(r.timer);
  r.timer=setInterval(()=>{ cur+=step; if(cur>=annual){ cur=annual; clearInterval(r.timer); } r.innerHTML=`Annual Emission: ${cur.toFixed(2)} t CO₂`; },20);

  let cls="low", txt="Low Emission (<10 t/year)";
  if(annual>=10 && annual<=15){ cls="average"; txt="Average Emission (10–15 t/year)"; }
  if(annual>15){ cls="high"; txt="High Emission (>15 t/year)"; }
  i.className=cls; i.innerText=txt;
  s.innerHTML = cls==="low"?"Excellent! Conserve electricity, walk/cycle, minimize waste, plant trees, use renewable energy.":
                cls==="average"?"Reduce travel, use LED bulbs, public transport, energy-efficient appliances, maintain vehicles.":
                "High emission! Switch to renewable energy, reduce fuel, recycle, use electric vehicles, optimize energy usage.";

  if(userId){
    const dt=firebase.firestore.Timestamp.fromDate(new Date(dateInput));
    db.collection("history").add({uid:userId,total:annual,timestamp:dt}).then(()=>loadChart());
  }
}

// History Graph
function loadChart(){
  if(!userId) return;
  db.collection("history").where("uid","==",userId).orderBy("timestamp")
    .get().then(s=>{
      const labels=[], data=[];
      s.forEach(d=>{
        const dt=d.data();
        if(dt.timestamp){
          labels.push(dt.timestamp.toDate().toLocaleDateString());
          data.push(dt.total);
        }
      });
      const ctx=document.getElementById("historyChart").getContext("2d");
      if(historyChartInstance) historyChartInstance.destroy();
      historyChartInstance=new Chart(ctx,{
        type:"line",
        data:{ labels, datasets:[{ label:"Annual CO₂ Emissions (t)", data, borderColor:"#2e8b57", backgroundColor:"rgba(46,139,87,0.2)", fill:true, tension:0.3 }]},
        options:{ responsive:true, animation:{duration:1000}, plugins:{legend:{display:true}} }
      });
    });
}
function showHistory() {
  showScreen("historyScreen");

  setTimeout(() => {
    loadChart();
  }, 300); // wait for screen to be visible
}


// Emission Reminders
function loadVehicles(){
  if(!userId) return;
  const container=document.getElementById("vehiclesContainer");
  container.innerHTML="";
  db.collection("users").doc(userId).get().then(doc=>{
    let vehicles=doc.exists?doc.data().vehicles||[]:[];
    vehicles.forEach((v,idx)=>{
      const dueDate=v.lastTest.toDate();
      dueDate.setMonth(dueDate.getMonth()+(v.validityMonths||6));
      const diffDays=Math.ceil((dueDate-new Date())/86400000);
      const div=document.createElement("div");
      div.className="vehicleCard card";
      div.innerHTML=`<h3>${v.name}</h3>
        <p>Next emission test: ${dueDate.toLocaleDateString()} (<span id="countdown${idx}">${diffDays>=0?diffDays+" days left":"Overdue by "+(-diffDays)+" days"}</span>)</p>
        <button onclick="editVehicle(${idx})">Edit</button>
        <button onclick="deleteVehicle(${idx})">Delete</button>`;
      container.appendChild(div);

      // Countdown update
      setInterval(()=>{
        const remaining=Math.ceil((dueDate-new Date())/86400000);
        document.getElementById(`countdown${idx}`).innerText=remaining>=0?remaining+" days left":"Overdue by "+(-remaining)+" days";
      },60000);
    });
  });
}

document.getElementById("addVehicleBtn").addEventListener("click",()=>{
  const container=document.getElementById("vehiclesContainer");
  const nameInput=document.createElement("input"); nameInput.placeholder="Vehicle Name";
  const dateInput=document.createElement("input"); dateInput.type="date";
  const validityInput=document.createElement("input"); validityInput.type="number"; validityInput.placeholder="Validity months";
  const saveBtn=document.createElement("button"); saveBtn.textContent="Save";
  const card=document.createElement("div"); card.className="vehicleCard card";
  card.append(nameInput,dateInput,validityInput,saveBtn);
  container.appendChild(card);
  saveBtn.addEventListener("click",()=>{
    if(!nameInput.value||!dateInput.value) return alert("Fill all fields!");
    const lastTest=firebase.firestore.Timestamp.fromDate(new Date(dateInput.value));
    const validity=+validityInput.value||6;
    const userRef=db.collection("users").doc(userId);
    userRef.get().then(doc=>{
      let vehicles=doc.exists?doc.data().vehicles||[]:[];
      vehicles.push({name:nameInput.value,lastTest,validityMonths:validity});
      userRef.set({vehicles},{merge:true}).then(()=>loadVehicles());
    });
  });
});

function editVehicle(idx){
  const userRef=db.collection("users").doc(userId);
  userRef.get().then(doc=>{
    let vehicles=doc.data().vehicles||[];
    const v=vehicles[idx];
    const newName=prompt("Update name:",v.name);
    const newDate=prompt("Update last test (YYYY-MM-DD):",v.lastTest.toDate().toISOString().split('T')[0]);
    const newValidity=+prompt("Update validity months:",v.validityMonths);
    if(newName && newDate){
      vehicles[idx]={name:newName,lastTest:firebase.firestore.Timestamp.fromDate(new Date(newDate)),validityMonths:newValidity};
      userRef.set({vehicles},{merge:true}).then(()=>loadVehicles());
    }
  });
}

function deleteVehicle(idx){
  const userRef=db.collection("users").doc(userId);
  userRef.get().then(doc=>{
    let vehicles=doc.data().vehicles||[];
    vehicles.splice(idx,1);
    userRef.set({vehicles},{merge:true}).then(()=>loadVehicles());
  });
}
``
