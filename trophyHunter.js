// ==UserScript==
// @name         Torn Trophy Hunter v3.4 Elite
// @namespace    GeminiAI.Torn
// @match        https://www.torn.com/*
// @version      3.4
// @author       Gemini & CurtDaHurt
// @uploadurl    https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/main/trophyHunter.js
// @updateurl    https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/main/trophyHunter.js
// @downloadurl  https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/refs/heads/main/trophyHunter.js
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const GITHUB_JSON_URL = "https://raw.githubusercontent.com/curtdahurt/TrophyHunter_elite/main/awards.json";
    let awardDB = {};
    let activeCat = "Combat";

    function createUI() {
        if (document.getElementById("thElite")) return;
        const panel = document.createElement("div");
        panel.id = "thElite";
        panel.style = "position:fixed; top:70px; right:20px; width:400px; background:#111; color:#fff; border:1px solid #333; z-index:9999; padding:15px; font-family:Arial, sans-serif; border-radius:10px; box-shadow: 0 0 20px #000;";

        const savedKey = localStorage.getItem("th_api_key") || "";

        panel.innerHTML = `
            <div id="thHeader" style="cursor:move; font-weight:bold; color:#4caf50; display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>🎯 TROPHY HUNTER ELITE v3.4</span>
                <span id="closeTh" style="cursor:pointer">✕</span>
            </div>
            <div style="margin-bottom:12px;">
                <input type="password" id="thKeyInput" placeholder="API Key" value="${savedKey}" style="width:70%; background:#222; color:#0f0; border:1px solid #444; padding:5px; border-radius:4px;">
                <button id="saveKey" style="width:25%; cursor:pointer; background:#444; color:#fff; border:none; border-radius:4px; padding:5px;">SYNC</button>
            </div>
            <div id="thTabs" style="display:flex; gap:5px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px;"></div>
            <div id="thList" style="max-height:400px; overflow-y:auto; padding-right:5px;">
                <p style="color:#666; text-align:center;">Syncing award database from GitHub...</p>
            </div>
        `;

        document.body.appendChild(panel);
        initSync();
        dragElement(panel);
    }

    async function initSync() {
        // Fetch external award list
        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_JSON_URL,
            onload: function(response) {
                try {
                    awardDB = JSON.parse(response.responseText);
                    renderTabs();
                    const key = localStorage.getItem("th_api_key");
                    if (key) loadTornData(key);
                } catch (e) {
                    document.getElementById("thList").innerHTML = "Error: Create 'awards.json' in your GitHub repo.";
                }
            }
        });

        document.getElementById("saveKey").onclick = () => {
            const key = document.getElementById("thKeyInput").value.trim();
            localStorage.setItem("th_api_key", key);
            loadTornData(key);
        };
        
        document.getElementById("closeTh").onclick = () => document.getElementById("thElite").remove();
    }

    function renderTabs() {
        const tabsDiv = document.getElementById("thTabs");
        tabsDiv.innerHTML = Object.keys(awardDB).map(cat => `
            <button class="tab-btn" data-cat="${cat}" style="padding:4px 8px; font-size:11px; cursor:pointer; background:${cat === activeCat ? '#4caf50' : '#333'}; color:#fff; border:none; border-radius:4px; white-space:nowrap;">${cat}</button>
        `).join('');

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.onclick = (e) => {
                activeCat = e.target.getAttribute("data-cat");
                document.querySelectorAll(".tab-btn").forEach(b => b.style.background = "#333");
                e.target.style.background = "#4caf50";
                loadTornData(localStorage.getItem("th_api_key"));
            };
        });
    }

    async function loadTornData(key) {
        if(!key) return;
        const listDiv = document.getElementById("thList");
        listDiv.innerHTML = "Querying API...";

        try {
            const res = await fetch(`https://api.torn.com/user/?selections=personalstats,profile&key=${key}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.error);

            renderCategory(data.personalstats, data.age);
        } catch (e) {
            listDiv.innerHTML = `<span style="color:red">Error: ${e.message}</span>`;
        }
    }

    function renderCategory(stats, age) {
        const listDiv = document.getElementById("thList");
        let html = "";
        const group = awardDB[activeCat] || [];

        group.forEach(item => {
            const current = stats[item.stat] || 0;
            const dailyAvg = current / (age || 1);

            item.goals.forEach(goal => {
                const isComplete = current >= goal;
                const remaining = Math.max(goal - current, 0);
                const pct = Math.min((current / goal) * 100, 100).toFixed(1);
                
                // ETA and Daily Goal Logic
                const daysLeft = dailyAvg > 0 ? Math.ceil(remaining / dailyAvg) : "∞";
                // Daily Goal: Target completion in 30 days OR current pace (whichever is faster)
                const dailyTarget = isComplete ? 0 : Math.ceil(remaining / 30); 

                html += `
                    <div style="background:#1a1a1a; margin-bottom:8px; padding:10px; border-radius:6px; border-left:4px solid ${isComplete ? '#4caf50' : '#444'}">
                        <div style="display:flex; justify-content:space-between; font-size:12px;">
                            <span style="font-weight:bold;">${item.label} ${goal.toLocaleString()}</span>
                            <span style="color:${isComplete ? '#4caf50' : '#ffa500'}">${isComplete ? '✓' : 'ETA: ' + daysLeft + 'd'}</span>
                        </div>
                        <div style="font-size:10px; color:#888; margin:4px 0;">
                            Prog: ${current.toLocaleString()} / ${goal.toLocaleString()} (${pct}%)
                            ${!isComplete ? `<br><span style="color:#2196f3">Target for 30d completion: ${dailyTarget}/day</span>` : ''}
                        </div>
                        <div style="height:4px; background:#000; border-radius:2px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${isComplete ? '#4caf50' : '#2196f3'};"></div>
                        </div>
                    </div>
                `;
            });
        });
        listDiv.innerHTML = html;
    }

    function dragElement(elmnt) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        document.getElementById("thHeader").onmousedown = (e) => {
            p3 = e.clientX; p4 = e.clientY;
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; // Fixed logic
                elmnt.style.top = (elmnt.offsetTop - p2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - p1) + "px";
            };
            document.onmouseup = () => { document.onmousemove = null; };
        };
    }

    setTimeout(createUI, 1000);
})();

        const savedKey = localStorage.getItem("th_api_key") || "";

        panel.innerHTML = `
            <div id="thHeader" style="cursor:move; font-weight:bold; border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>🏆 Trophy Hunter Elite</span>
                <span id="closeTh" style="cursor:pointer">×</span>
            </div>
            <div style="margin-bottom:10px;">
                <input type="text" id="thKeyInput" placeholder="Enter API Key" value="${savedKey}" style="width:70%; background:#111; color:#0f0; border:1px solid #444; padding:3px;">
                <button id="saveKey" style="width:25%; cursor:pointer;">Save</button>
            </div>
            <div id="thFilters" style="margin-bottom:10px; display:flex; gap:4px; flex-wrap:wrap;">
                <button class="th-filter" data-cat="All">All</button>
                <button class="th-filter" data-cat="Combat">Combat</button>
                <button class="th-filter" data-cat="Crime">Crime</button>
                <button class="th-filter" data-cat="Travel">Travel</button>
            </div>
            <div id="thContent" style="max-height:400px; overflow-y:auto; font-size:11px;">
                <p style="color:#aaa;">Click "Save" or Enter key to load data...</p>
            </div>
        `;

        document.body.appendChild(panel);
        
        // Listeners
        document.getElementById("saveKey").onclick = () => {
            const key = document.getElementById("thKeyInput").value.trim();
            localStorage.setItem("th_api_key", key);
            fetchData(key);
        };

        document.querySelectorAll(".th-filter").forEach(btn => {
            btn.onclick = () => {
                currentCat = btn.getAttribute("data-cat");
                const key = localStorage.getItem("th_api_key");
                if (key) fetchData(key);
            };
        });

        document.getElementById("closeTh").onclick = () => panel.remove();
        dragElement(panel);
    }

    async function fetchData(key) {
        const container = document.getElementById("thContent");
        container.innerHTML = "Fetching Torn API...";

        try {
            const res = await fetch(`https://api.torn.com/user/?selections=personalstats,profile&key=${key}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error.error);

            const stats = data.personalstats;
            const age = data.age || 1; // Used for ETA calc
            
            renderList(stats, age);
        } catch (err) {
            container.innerHTML = `<span style="color:#ff5555;">Error: ${err.message}</span>`;
        }
    }

    function renderList(stats, age) {
        const container = document.getElementById("thContent");
        let html = "";

        const filtered = currentCat === "All" ? medalRequirements : medalRequirements.filter(m => m.cat === currentCat);

        filtered.forEach(m => {
            const current = stats[m.stat] || 0;
            const progress = Math.min((current / m.goal) * 100, 100);
            const remaining = Math.max(m.goal - current, 0);
            
            // ETA Logic: Progress per day
            const perDay = current / age;
            const daysLeft = perDay > 0 ? Math.ceil(remaining / perDay) : "∞";
            const etaText = remaining === 0 ? "DONE" : `${daysLeft} days`;

            html += `
                <div style="margin-bottom:12px; border-left: 2px solid ${remaining === 0 ? '#4caf50' : '#444'}; padding-left:8px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>${m.name}</span>
                        <span style="color:${remaining === 0 ? '#4caf50' : '#ffb86c'}">${etaText}</span>
                    </div>
                    <div style="color:#aaa;">${current.toLocaleString()} / ${m.goal.toLocaleString()}</div>
                    <div style="width:100%; background:#333; height:4px; margin-top:4px;">
                        <div style="width:${progress}%; height:100%; background:#4caf50;"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || "No medals found for this category.";
    }

    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = document.getElementById("thHeader");
        header.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            };
        };
    }

    setTimeout(createUI, 1000);
})();
