import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = s => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), typing = $("#typing");
let messages = JSON.parse(localStorage.getItem("ap_ai_messages") || "[]");
let chats = JSON.parse(localStorage.getItem("ap_ai_chats") || "[]");
let generator = null;
let busy = false;

function save(){localStorage.setItem("ap_ai_messages",JSON.stringify(messages));localStorage.setItem("ap_ai_chats",JSON.stringify(chats));}
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
  chat.innerHTML="";
  if(!messages.length){
    chat.innerHTML=`<div class="welcome"><div class="logo">✦</div><h1>How can I help?</h1><p>Your private local AI assistant. No OpenAI API key required.</p><div class="cards">
    <button data-prompt="Explain photosynthesis simply">📚 Learn something</button><button data-prompt="Help me write a school paragraph">✍️ Write something</button>
    <button data-prompt="Give me some fun coding ideas">💻 Coding ideas</button><button data-prompt="Tell me a short interesting fact">💡 Interesting fact</button></div></div>`;
  } else messages.forEach(m=>{
    const row=document.createElement("div"); row.className="msg "+m.role;
    row.innerHTML=`<div class="avatar">${m.role==="user"?"You":"✦"}</div><div class="bubble">${escapeHTML(m.content)}</div>`;
    chat.appendChild(row);
  });
  chat.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;input.focus();});
  chat.scrollTop=chat.scrollHeight; renderHistory();
}
function renderHistory(){
  const h=$("#history"); h.innerHTML="";
  chats.slice().reverse().forEach((c,i)=>{
    const b=document.createElement("button"); b.textContent=c.title||"New chat"; b.onclick=()=>{messages=c.messages||[];save();render();}; h.appendChild(b);
  });
}
function add(role,content){messages.push({role,content});render();save();}
async function getModel(){
  if(generator) return generator;
  typing.textContent="Downloading local AI model for the first time…";
  generator=await pipeline("text-generation","HuggingFaceTB/SmolLM2-360M-Instruct",{dtype:"q4f16"});
  return generator;
}
async function answer(prompt){
  busy=true; typing.textContent="A.P AI is thinking…";
  try{
    const model=await getModel();
    const recent=messages.slice(-8).map(m=>`${m.role==="user"?"User":"Assistant"}: ${m.content}`).join("\n");
    const full=`You are A.P AI, a helpful, friendly assistant. Give concise, useful answers. Do not claim to have abilities you don't have.
Conversation:
${recent}
User: ${prompt}
Assistant:`;
    const out=await model(full,{max_new_tokens:220,temperature:.7,do_sample:true});
    let text=Array.isArray(out)?out[0].generated_text:out.generated_text;
    text=text.split("Assistant:").pop().trim();
    if(!text) text="I couldn't generate an answer. Please try again.";
    add("assistant",text);
  }catch(e){
    console.error(e);
    add("assistant","The local AI model could not start. On some phones, this browser may not support WebGPU/WASM memory requirements. Try Chrome/Edge and make sure you have enough free storage and RAM.");
  }finally{busy=false;typing.textContent="";}
}
$("#composer").onsubmit=e=>{e.preventDefault();const p=input.value.trim();if(!p||busy)return;input.value="";add("user",p);answer(p);};
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px";});
$("#newChat").onclick=()=>{if(messages.length)chats.push({title:messages.find(x=>x.role==="user")?.content?.slice(0,35)||"New chat",messages});messages=[];save();render();};
$("#clearBtn").onclick=()=>{if(confirm("Clear all saved chats?")){messages=[];chats=[];save();render();}};
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$("#themeBtn").onclick=()=>{document.documentElement.classList.toggle("dark");localStorage.setItem("ap_ai_dark",document.documentElement.classList.contains("dark"));};
if(localStorage.getItem("ap_ai_dark")==="true")document.documentElement.classList.add("dark");

$("#attachBtn").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text();input.value=`Summarize this file:\n\n${text.slice(0,12000)}`;input.dispatchEvent(new Event("input"));};

let recognition=null;
if("webkitSpeechRecognition" in window || "SpeechRecognition" in window){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition; recognition=new R(); recognition.lang="en-US"; recognition.interimResults=false;
 recognition.onstart=()=>$("#micBtn").textContent="🔴"; recognition.onend=()=>$("#micBtn").textContent="🎤";
 recognition.onresult=e=>{input.value=e.results[0][0].transcript;input.dispatchEvent(new Event("input"));};
}
$("#micBtn").onclick=()=>recognition?recognition.start():alert("Voice input is not supported by this browser.");

render();
