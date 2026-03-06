// ==UserScript==
// @name         Torn Trophy Hunter v3.7 Elite
// @namespace    GeminiAI.Torn
// @match        https://www.torn.com/*
// @version      3.7
// @author       Gemini & CurtDaHurt
// @uploadurl    https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/curtdahurt-patch-1/trophyHunter.js
// @updateurl    https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/curtdahurt-patch-1/trophyHunter.js
// @downloadurl  https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/curtdahurt-patch-1/trophyHunter.js
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const GITHUB_JSON_URL = "https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/main/awards.json";
    let awardDB = {};
    let activeCat = "Combat";
    let view = "main"; // "main" or "settings"

    const CSS = `
        @keyframes gold-pulse {
            0% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); border-color: rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); border-color: #fff; }
            100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); border-color: rgba(255, 215, 0, 0.5); }
        }
        .th-alert { animation: gold-pulse 2s infinite; }
        .th-card { background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); transition: transform 0.2s; }
        .th-card:hover { transform: translateY(-2px); border-color: rgba(76, 175, 80, 0.4); }
        .th-btn { background: #333; border: 1px solid #444; color: #ccc; transition: 0.2s; cursor: pointer; }
        .th-btn:hover { background: #444; color: #fff; border-color: #666; }
        .th-btn.active { background: #4caf50; color: #fff; border-color: #4caf50; box-shadow: 0 2px 8px rgba(76,175,80,0.4); }
        #thList::-webkit-scrollbar { width: 4px; }
        #thList::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
    `;

    function createUI() {
        if (document.getElementById("thElite")) return;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = CSS;
        document.head.appendChild(styleSheet);

        const isMinimized = localStorage.getItem("th_minimized") === "true";
        const panel = document.createElement("div");
        panel.id = "thElite";
        panel.style = `position:fixed; top:70px; right:20px; width:380px; background:rgba(18, 18, 18, 0.95); color:#fff; border:1px solid #333; z-index:9999; padding:0; font-family:'Segoe UI', Roboto, sans-serif; border-radius:12px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); overflow:hidden; transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);`;
        if (isMinimized) panel.style.height = "40px";

        panel.innerHTML = `
            <div id="thHeader" style="cursor:move; padding:12px 16px; background:rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">🏆</span>
                    <span style="font-weight:600; letter-spacing:0.5px; font-size:13px; color:#efefef;">TROPHY HUNTER</span>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <span id="settingsBtn" style="cursor:pointer; opacity:0.6; transition:0.2s; font-size:16px;">⚙️</span>
                    <span id="minimizeTh" style="cursor:pointer; opacity:0.6; font-size:18px;">${isMinimized ? '□' : '−'}</span>
                    <span id="closeTh" style="cursor:pointer; opacity:0.4;">✕</span>
                </div>
            </div>
            <div id="thBody" style="padding:16px; display:${isMinimized ? 'none' : 'block'};">
                <div id="view-settings" style="display:none;">
                    <div style="font-size:11px; color:#aaa; margin-bottom:8px; text-transform:uppercase; font-weight:bold;">API Configuration</div>
                    <input type="password" id="thKeyInput" placeholder="Enter API Key" value="${localStorage.getItem("th_api_key") || ""}" style="width:100%; background:#000; color:#4caf50; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px; outline:none;">
                    <button id="saveKey" class="th-btn" style="width:100%; padding:8px; border-radius:6px; background:#4caf50; color:white; border:none; font-weight:bold;">SAVE & SYNC</button>
                    <div style="margin-top:10px; font-size:10px; color:#666; text-align:center;">Key is stored locally in your browser.</div>
                </div>
                <div id="view-main">
                    <div id="thPinnedSection" style="margin-bottom:16px; display:none;">
                        <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Pinned Goal</div>
                        <div id="thPinnedList"></div>
                    </div>
                    <div id="thTabs" style="display:flex; gap:6px; margin-bottom:16px; overflow-x:auto; padding-bottom:4px;"></div>
                    <div id="thList" style="max-height:380px; overflow-y:auto; padding-right:4px;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        initUI();
        dragElement(panel);
    }

    function initUI() {
        GM_xmlhttpRequest({
            method: "GET", url: GITHUB_JSON_URL,
            onload: function(r) {
                try {
                    awardDB = JSON.parse(r.responseText);
                    renderTabs();
                    if (localStorage.getItem("th_api_key")) loadTornData();
                } catch (e) { document.getElementById("thList").innerText = "GitHub Sync Failed."; }
            }
        });

        document.getElementById("settingsBtn").onclick = () => {
            view = (view === "main") ? "settings" : "main";
            document.getElementById("view-main").style.display = (view === "main") ? "block" : "none";
            document.getElementById("view-settings").style.display = (view === "settings") ? "block" : "none";
            document.getElementById("settingsBtn").style.opacity = (view === "settings") ? "1" : "0.6";
        };

        document.getElementById("saveKey").onclick = () => {
            localStorage.setItem("th_api_key", document.getElementById("thKeyInput").value.trim());
            view = "main";
            document.getElementById("view-main").style.display = "block";
            document.getElementById("view-settings").style.display = "none";
            loadTornData();
        };

        document.getElementById("minimizeTh").onclick = (e) => {
            const panel = document.getElementById("thElite");
            const body = document.getElementById("thBody");
            const isMin = panel.style.height === "40px";
            panel.style.height = isMin ? "auto" : "40px";
            body.style.display = isMin ? "block" : "none";
            e.target.innerText = isMin ? "−" : "□";
            localStorage.setItem("th_minimized", !isMin);
            panel.classList.remove("th-alert");
        };

        document.getElementById("closeTh").onclick = () => document.getElementById("thElite").remove();
    }

    function renderTabs() {
        const tabs = document.getElementById("thTabs");
        tabs.innerHTML = Object.keys(awardDB).map(cat => `
            <button class="tab-btn th-btn ${cat===activeCat?'active':''}" style="padding:5px 10px; font-size:10px; border-radius:20px; white-space:nowrap;">${cat}</button>
        `).join('');
        tabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                activeCat = e.target.innerText;
                renderTabs();
                loadTornData();
            };
        });
    }

    async function loadTornData() {
        const key = localStorage.getItem("th_api_key");
        if (!key) { document.getElementById("thList").innerHTML = "<p style='text-align:center; color:#666;'>Go to settings ⚙️ to add API Key</p>"; return; }
        try {
            const res = await fetch(`https://api.torn.com/user/?selections=personalstats,profile&key=${key}`);
            const data = await res.json();
            renderAwards(data.personalstats);
        } catch (e) { console.error("API Error"); }
    }

    function renderAwards(stats) {
        const listDiv = document.getElementById("thList");
        const pinnedList = document.getElementById("thPinnedList");
        const pinnedSection = document.getElementById("thPinnedSection");
        const pinnedKeys = JSON.parse(localStorage.getItem("th_pinned") || "[]");
        let html = ""; let pinnedHtml = "";

        Object.keys(awardDB).forEach(cat => {
            awardDB[cat].forEach(item => {
                item.goals.forEach(goal => {
                    const current = stats[item.stat] || 0;
                    const isDone = current >= goal;
                    const uniqueId = `${item.stat}_${goal}`;
                    const isPinned = pinnedKeys.includes(uniqueId);
                    const pct = Math.min(100, (current/goal*100)).toFixed(1);

                    const card = `
                        <div class="th-card" style="margin-bottom:10px; padding:12px; border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div>
                                    <div style="font-weight:600; font-size:12px; color:#fff;">${item.label}</div>
                                    <div style="font-size:10px; color:#4caf50; font-weight:bold; margin-top:2px;">${goal.toLocaleString()}</div>
                                </div>
                                <span class="pin-btn" data-id="${uniqueId}" style="cursor:pointer; font-size:16px; color:${isPinned?'#ffd700':'rgba(255,255,255,0.1)'}; transition:0.2s;">★</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:10px; color:#888; margin-bottom:6px;">
                                <span>${current.toLocaleString()} units</span>
                                <span>${pct}%</span>
                            </div>
                            <div style="height:6px; background:rgba(0,0,0,0.3); border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
                                <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #4caf50, #81c784); border-radius:10px; box-shadow: 0 0 10px rgba(76,175,80,0.3);"></div>
                            </div>
                        </div>
                    `;

                    if (isPinned) pinnedHtml += card;
                    if (cat === activeCat) html += card;
                });
            });
        });

        pinnedSection.style.display = pinnedHtml ? "block" : "none";
        pinnedList.innerHTML = pinnedHtml;
        listDiv.innerHTML = html;
        
        document.querySelectorAll(".pin-btn").forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute("data-id");
                let pins = JSON.parse(localStorage.getItem("th_pinned") || "[]");
                pins.includes(id) ? pins = pins.filter(p => p !== id) : pins.push(id);
                localStorage.setItem("th_pinned", JSON.stringify(pins));
                renderAwards(stats);
            };
        });
    }

    function dragElement(elmnt) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        document.getElementById("thHeader").onmousedown = (e) => {
            if(e.target.id !== "thHeader") return;
            p3 = e.clientX; p4 = e.clientY;
            document.onmousemove = (m) => {
                p1 = p3 - m.clientX; p2 = p4 - m.clientY;
                p3 = m.clientX; p4 = m.clientY;
                elmnt.style.top = (elmnt.offsetTop - p2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - p1) + "px";
            };
            document.onmouseup = () => document.onmousemove = null;
        };
    }

    setTimeout(createUI, 500);
})();
