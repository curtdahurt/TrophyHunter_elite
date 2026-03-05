// ==UserScript==
// @name        Torn Trophy Hunter v3 Elite - Final
// @namespace   GeminiAI.Torn
// @match       https://www.torn.com/*
// @version     3.1
// @grant       none
// @uploadurl 
// @updateurl 
// ==/UserScript==

(function() {
    'use strict';

    // Medal Requirement DB (Key: personalstat name)
    const medalRequirements = [
        { name: "Civil Offence", stat: "crimes", goal: 100, cat: "Crime" },
        { name: "Career Criminal", stat: "crimes", goal: 5000, cat: "Crime" },
        { name: "Legendary Criminal", stat: "crimes", goal: 50000, cat: "Crime" },
        { name: "Warrior", stat: "attackswon", goal: 100, cat: "Combat" },
        { name: "Warlord", stat: "attackswon", goal: 5000, cat: "Combat" },
        { name: "Conqueror", stat: "attackswon", goal: 10000, cat: "Combat" },
        { name: "Jetsetter", stat: "traveltimes", goal: 100, cat: "Travel" },
        { name: "World Traveller", stat: "traveltimes", goal: 1000, cat: "Travel" },
        { name: "Addict", stat: "drugsused", goal: 250, cat: "Misc" },
        { name: "Toxic Legend", stat: "drugsused", goal: 5000, cat: "Misc" },
        { name: "Billionaire", stat: "networth", goal: 1000000000, cat: "Misc" }
    ];

    let currentCat = "All";

    function createUI() {
        if (document.getElementById("thElite")) return;

        const panel = document.createElement("div");
        panel.id = "thElite";
        panel.style = "position:fixed; top:80px; right:20px; width:350px; background:#222; color:#fff; border:1px solid #444; z-index:9999; padding:12px; font-family:Arial, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border-radius:4px;";

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
