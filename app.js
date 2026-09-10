import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "eduardoworrel/SmolLM2-360M-Instruct";
let generator = null;
let generatorDevice = null;
let busy = false;

const $ = s => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), typing = $("#typing");
let messages = JSON.parse(localStorage.getItem("ap_ai_messages") || "[]");
let chats = JSON.parse(localStorage.getItem("ap_ai_chats") || "[]");

function save(){localStorage.setItem("ap_ai_messages",JSON.stringify(messages));localStorage.setItem("ap_ai_chats",JSON.stringify(chats));}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function render(){
  chat.innerHTML="";
  if(!messages.length){
    chat.innerHTML=`<div class="welcome"><div class="logo">✦</div><h1>How can I help?</h1><p>Your private local AI assistant. No OpenAI API key required.</p><div class="cards">
    <button data-prompt="Explain photosynthesis simply">📚 Learn something</button>
    <button data-prompt="Help me write a school paragraph">✍️ Write something</button>
    <button data-prompt="Give me some fun coding ideas">💻 Coding ideas</button>
    <button data-prompt="Tell me a short interesting fact">💡 Interesting fact</button></div></div>`;
  } else {
    messages.forEach(m=>{
      const row=document.createElement("div");
      row.className="msg "+m.role;
      row.innerHTML=`<div class="avatar">${m.role==="user"?"You":"✦"}</div><div class="bubble">${escapeHTML(m.content)}</div>`;
      chat.appendChild(row);
    });
  }
  chat.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;input.focus();});
  chat.scrollTop=chat.scrollHeight;
  renderHistory();
}

function renderHistory(){
  const h=$("#history"); if(!h)return;
  h.innerHTML="";
  chats.slice().reverse().forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c.title||"New chat";
    b.onclick=()=>{messages=c.messages||[];save();render();};
    h.appendChild(b);
  });
}

function add(role,content){messages.push({role,content});save();render();}

async function getModel(){
  if(generator) return generator;

  typing.textContent="Preparing the local AI model…";
  $("#status").textContent="Loading AI…";

  // WASM + q8 is intentionally preferred for phones because it doesn't require WebGPU.
  try{
    generator=await pipeline("text-generation", MODEL, {
      device:"wasm",
      dtype:"q8"
    });
    generatorDevice="WASM";
    $("#status").textContent="Local AI • WASM";
    return generator;
  }catch(wasmError){
    console.warn("WASM load failed:",wasmError);
  }

  // Fallback for browsers with working WebGPU.
  try{
    generator=await pipeline("text-generation", MODEL, {
      device:"webgpu",
      dtype:"q4f16"
    });
    generatorDevice="WebGPU";
    $("#status").textContent="Local AI • WebGPU";
    return generator;
  }catch(gpuError){
    console.error("WebGPU load failed:",gpuError);
    generator=null;
    throw gpuError;
  }
}

function cleanOutput(output){
  let text="";
  if(Array.isArray(output)) text=output[0]?.generated_text ?? "";
  else text=output?.generated_text ?? "";

  if(Array.isArray(text)){
    const last=text[text.length-1];
    text=typeof last==="string"?last:(last?.content||"");
  }
  text=String(text).trim();

  if(text.includes("Assistant:")) text=text.split("Assistant:").pop().trim();
  if(text.startsWith("assistant")) text=text.replace(/^assistant\s*:?\s*/i,"").trim();
  return text || "I couldn't generate a response. Please try again.";
}

async function answer(prompt){
  busy=true;
  typing.textContent="A.P AI is thinking…";

  try{
    const model=await getModel();
    const recent=messages.slice(-8).map(m=>({
      role:m.role,
      content:m.content
    }));

    const system="You are A.P AI, a friendly helpful assistant. Answer clearly and concisely. You are a small local model, so never claim to have internet access or abilities you don't have.";
    const conversation=[{role:"system",content:system},...recent];

    const out=await model(conversation,{
      max_new_tokens:180,
      temperature:0.7,
      do_sample:true
    });

    add("assistant",cleanOutput(out));
  }catch(e){
    console.error(e);
    $("#status").textContent="AI unavailable";
    add("assistant","I couldn't start the local AI model on this browser. Please try the latest Chrome or Edge, make sure you have enough free memory/storage, and reload the page. The website itself is working.");
  }finally{
    busy=false;
    typing.textContent="";
  }
}

$("#composer").onsubmit=e=>{
  e.preventDefault();
  const p=input.value.trim();
  if(!p||busy)return;
  input.value="";
  input.style.height="auto";
  add("user",p);
  answer(p);
};

input.addEventListener("input",()=>{
  input.style.height="auto";
  input.style.height=Math.min(input.scrollHeight,150)+"px";
});

$("#newChat").onclick=()=>{
  if(messages.length)chats.push({
    title:messages.find(x=>x.role==="user")?.content?.slice(0,35)||"New chat",
    messages:[...messages]
  });
  messages=[];save();render();
};

$("#clearBtn").onclick=()=>{
  if(confirm("Clear all saved chats?")){
    messages=[];chats=[];save();render();
  }
};

$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");

$("#themeBtn").onclick=()=>{
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("ap_ai_dark",document.documentElement.classList.contains("dark"));
};

if(localStorage.getItem("ap_ai_dark")==="true")
  document.documentElement.classList.add("dark");

$("#attachBtn").onclick=()=>$("#fileInput").click();

$("#fileInput").onchange=async e=>{
  const f=e.target.files[0];
  if(!f)return;
  const text=await f.text();
  input.value=`Summarize this file:\n\n${text.slice(0,12000)}`;
  input.dispatchEvent(new Event("input"));
};

let recognition=null;
if("webkitSpeechRecognition" in window || "SpeechRecognition" in window){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  recognition=new R();
  recognition.lang="en-US";
  recognition.interimResults=false;
  recognition.onstart=()=>$("#micBtn").textContent="🔴";
  recognition.onend=()=>$("#micBtn").textContent="🎤";
  recognition.onresult=e=>{
    input.value=e.results[0][0].transcript;
    input.dispatchEvent(new Event("input"));
  };
}
$("#micBtn").onclick=()=>{
  if(recognition) recognition.start();
  else alert("Voice input is not supported by this browser.");
};

render();
