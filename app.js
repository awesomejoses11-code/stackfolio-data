/* =========================================================
   X Analytics Dashboard - app.js
   ---------------------------------------------------------
   To go LIVE with real X data:
   Replace generateTimeSeriesData() and the helpers in the
   "MOCK DATA LAYER" section with calls to X API v2:
     - GET /2/users/:id/tweets
     - GET /2/tweets/:id  (with tweet.fields=public_metrics,non_public_metrics)
     - GET /2/users/:id   (with user.fields=public_metrics)
   See the api.example.js section at the bottom for a stub.
   ========================================================= */

/* -------- Chart.js global theme -------- */
Chart.defaults.color = '#71767b';
Chart.defaults.borderColor = 'rgba(47,51,54,0.6)';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const COLORS = {
  blue:   '#1d9bf0',
  purple: '#8b5cf6',
  green:  '#00ba7c',
  red:    '#f4212e',
  yellow: '#ffd400',
  pink:   '#f91880',
  gray:   '#536471',
};

/* =========================================================
   MOCK DATA LAYER
   Replace with calls to X API v2 when integrating.
   ========================================================= */

// Seeded RNG for reproducible mock data
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generates time-series daily metrics for the dashboard.
 * REPLACE THIS with an async fetch to X API v2.
 *
 * @param {number} days  - Number of days back from today.
 * @returns {{
 *   labels: string[],
 *   impressions: number[],
 *   engagements: number[],
 *   visits: number[],
 *   followers: number[]
 * }}
 */
function generateTimeSeriesData(days = 28) {
  const rand = seededRandom(days * 42 + 7);
  const labels = [];
  const impressions = [];
  const engagements = [];
  const visits = [];
  const followers = [];

  let baseFollowers = 12400;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

    const weekendDip = [0, 6].includes(d.getDay()) ? 0.75 : 1;
    const trend = 1 + (days - i) * 0.004;

    const imp = Math.round((6000 + rand() * 9000) * weekendDip * trend);
    const eng = Math.round(imp * (0.025 + rand() * 0.04));
    const vis = Math.round(imp * (0.008 + rand() * 0.012));
    const newF = Math.round(20 + rand() * 60 * weekendDip);

    impressions.push(imp);
    engagements.push(eng);
    visits.push(vis);
    baseFollowers += newF;
    followers.push(baseFollowers);
  }

  return { labels, impressions, engagements, visits, followers };
}

function generateTopPosts() {
  return [
    { text: "Just shipped a new feature 🚀 Real-time collab now live in beta. Try it and tell me what breaks.", date: "May 3", impressions: 142300, engagements: 8420, er: 5.92 },
    { text: "Three lessons from a year of building solo: 1) ship weekly 2) talk to users 3) charge from day one.", date: "Apr 28", impressions: 98750, engagements: 5210, er: 5.28 },
    { text: "Hot take: most analytics dashboards show too much. Pick 3 metrics that actually move the business.", date: "Apr 22", impressions: 76400, engagements: 3120, er: 4.08 },
    { text: "Been experimenting with X API v2. The new metrics endpoints are way cleaner. Thread below 🧵", date: "Apr 18", impressions: 54200, engagements: 1890, er: 3.49 },
    { text: "Friday wins: closed 2 deals, fixed a nasty perf bug, and finally got the dog to sit. Big week.", date: "Apr 12", impressions: 41100, engagements: 1340, er: 3.26 },
  ];
}

function generateEngagementBreakdown() {
  return [
    { label: 'Likes',     value: 18420, color: COLORS.pink },
    { label: 'Reposts',   value: 4210,  color: COLORS.green },
    { label: 'Replies',   value: 2865,  color: COLORS.blue },
    { label: 'Bookmarks', value: 3540,  color: COLORS.purple },
    { label: 'Link clicks', value: 5120, color: COLORS.yellow },
  ];
}

function generateCountries() {
  return [
    { name: 'United States', value: 38 },
    { name: 'United Kingdom', value: 14 },
    { name: 'India', value: 11 },
    { name: 'Germany', value: 8 },
    { name: 'Canada', value: 6 },
    { name: 'Brazil', value: 5 },
    { name: 'Other', value: 18 },
  ];
}

function generateAgeGroups() {
  return {
    labels: ['13–17', '18–24', '25–34', '35–44', '45–54', '55+'],
    values: [3, 22, 41, 19, 10, 5],
  };
}

function generateDevices() {
  return {
    labels: ['Mobile', 'Desktop', 'Tablet'],
    values: [68, 27, 5],
    colors: [COLORS.blue, COLORS.purple, COLORS.yellow],
  };
}

/* =========================================================
   RENDERERS
   ========================================================= */

const charts = {};

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

function pctChange(arr) {
  if (arr.length < 2) return 0;
  const half = Math.floor(arr.length / 2);
  const prev = sum(arr.slice(0, half)) || 1;
  const curr = sum(arr.slice(half));
  return ((curr - prev) / prev) * 100;
}

function setKPI(id, value, changeId, change) {
  document.getElementById(id).textContent = fmtNum(value);
  const el = document.getElementById(changeId);
  const up = change >= 0;
  el.className = 'kpi-change ' + (up ? 'up' : 'down');
  el.textContent = (up ? '▲ ' : '▼ ') + Math.abs(change).toFixed(1) + '%';
}

function spark(canvasId, data, color) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 60);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: grad,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    }
  });
}

function renderMainChart(d) {
  if (charts.main) charts.main.destroy();
  const ctx = document.getElementById('mainChart').getContext('2d');
  const g1 = ctx.createLinearGradient(0, 0, 0, 280);
  g1.addColorStop(0, COLORS.blue + '55');
  g1.addColorStop(1, COLORS.blue + '00');
  const g2 = ctx.createLinearGradient(0, 0, 0, 280);
  g2.addColorStop(0, COLORS.purple + '55');
  g2.addColorStop(1, COLORS.purple + '00');

  charts.main = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        {
          label: 'Impressions',
          data: d.impressions,
          borderColor: COLORS.blue,
          backgroundColor: g1,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Engagements',
          data: d.engagements,
          borderColor: COLORS.purple,
          backgroundColor: g2,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y1',
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#000',
          borderColor: '#2f3336',
          borderWidth: 1,
          padding: 10,
          titleColor: '#fff',
          bodyColor: '#e7e9ea',
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(47,51,54,0.5)' }, ticks: { callback: v => fmtNum(v) } },
        y1: { position: 'right', grid: { display: false }, ticks: { callback: v => fmtNum(v) } },
      }
    }
  });
}

function renderDonut(items) {
  if (charts.donut) charts.donut.destroy();
  const ctx = document.getElementById('donutChart').getContext('2d');
  charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.value),
        backgroundColor: items.map(i => i.color),
        borderColor: '#16181c',
        borderWidth: 2,
      }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#000', borderColor: '#2f3336', borderWidth: 1 }
      }
    }
  });

  const total = sum(items.map(i => i.value));
  const list = document.getElementById('donutLegend');
  list.innerHTML = items.map(i =>
    `<li><span class="swatch" style="background:${i.color}"></span>${i.label} · <strong style="color:#e7e9ea">${fmtNum(i.value)}</strong> <span class="muted">(${((i.value/total)*100).toFixed(1)}%)</span></li>`
  ).join('');
}

function renderTopPosts(posts) {
  const tbody = document.getElementById('topPostsBody');
  tbody.innerHTML = posts.map(p => {
    const erClass = p.er >= 5 ? '' : (p.er >= 3.5 ? 'mid' : 'low');
    return `<tr>
      <td>
        <div class="post-content">${escapeHtml(p.text)}</div>
        <div class="post-meta">${p.date}</div>
      </td>
      <td>${fmtNum(p.impressions)}</td>
      <td>${fmtNum(p.engagements)}</td>
      <td><span class="er-pill ${erClass}">${p.er.toFixed(2)}%</span></td>
    </tr>`;
  }).join('');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderAudience(d) {
  if (charts.audience) charts.audience.destroy();
  const ctx = document.getElementById('audienceChart').getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, COLORS.green + '55');
  g.addColorStop(1, COLORS.green + '00');

  charts.audience = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [{
        data: d.followers,
        borderColor: COLORS.green,
        backgroundColor: g,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#000' } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(47,51,54,0.5)' }, ticks: { callback: v => fmtNum(v) } },
      }
    }
  });
}

function renderCountries(items) {
  const max = Math.max(...items.map(i => i.value));
  const list = document.getElementById('countryList');
  list.innerHTML = items.map(i =>
    `<li>
       <div class="bar-row"><span>${i.name}</span><span class="muted">${i.value}%</span></div>
       <div class="bar-bg"><div class="bar-fill" style="width:${(i.value/max)*100}%"></div></div>
     </li>`
  ).join('');
}

function renderAge(d) {
  if (charts.age) charts.age.destroy();
  const ctx = document.getElementById('ageChart').getContext('2d');
  charts.age = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        data: d.values,
        backgroundColor: COLORS.blue,
        borderRadius: 6,
        maxBarThickness: 28,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#000', callbacks: { label: c => c.parsed.y + '%' } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(47,51,54,0.5)' }, ticks: { callback: v => v + '%' } }
      }
    }
  });
}

function renderDevices(d) {
  if (charts.device) charts.device.destroy();
  const ctx = document.getElementById('deviceChart').getContext('2d');
  charts.device = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: d.labels,
      datasets: [{
        data: d.values,
        backgroundColor: d.colors.map(c => c + 'cc'),
        borderColor: '#16181c',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#71767b', boxWidth: 10 } },
        tooltip: { callbacks: { label: c => c.label + ': ' + c.parsed.r + '%' } },
      },
      scales: {
        r: {
          ticks: { display: false },
          grid: { color: 'rgba(47,51,54,0.5)' },
          angleLines: { color: 'rgba(47,51,54,0.5)' }
        }
      }
    }
  });
}

/* =========================================================
   ORCHESTRATION
   ========================================================= */

async function loadDashboard() {
  const days = parseInt(document.getElementById('rangeSelect').value, 10);

  // ===> Replace with: const ts = await api.getTimeSeries(days);
  const ts = generateTimeSeriesData(days);

  // KPIs
  setKPI('kpiImpressions', sum(ts.impressions), 'kpiImpressionsChange', pctChange(ts.impressions));
  setKPI('kpiEngagements', sum(ts.engagements), 'kpiEngagementsChange', pctChange(ts.engagements));
  setKPI('kpiVisits',      sum(ts.visits),      'kpiVisitsChange',      pctChange(ts.visits));
  setKPI('kpiFollowers',   sum(ts.followers.map((v,i,a) => i===0?0:v-a[i-1])), 'kpiFollowersChange', pctChange(ts.impressions));

  // Sparklines
  spark('sparkImpressions', ts.impressions, COLORS.blue);
  spark('sparkEngagements', ts.engagements, COLORS.purple);
  spark('sparkVisits',      ts.visits,      COLORS.yellow);
  spark('sparkFollowers',   ts.followers,   COLORS.green);

  // Main chart
  renderMainChart(ts);

  // Engagement breakdown
  renderDonut(generateEngagementBreakdown());

  // Top posts
  renderTopPosts(generateTopPosts());

  // Audience
  renderAudience(ts);

  // Demographics
  renderCountries(generateCountries());
  renderAge(generateAgeGroups());
  renderDevices(generateDevices());
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

  document.getElementById('rangeSelect').addEventListener('change', loadDashboard);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⟳</span> Refreshing...';
    setTimeout(() => {
      loadDashboard();
      btn.disabled = false;
      btn.innerHTML = '<span>↻</span> Refresh';
    }, 500);
  });

  // Sidebar nav (visual only for demo)
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      a.classList.add('active');
    });
  });
});

/* =========================================================
   X API v2 INTEGRATION STUB (api.example.js)
   ---------------------------------------------------------
   const X_BEARER = process.env.X_BEARER_TOKEN;   // server-side only
   const USER_ID  = '12345';                       // your numeric user id

   async function xFetch(path) {
     const r = await fetch(`https://api.twitter.com/2${path}`, {
       headers: { Authorization: `Bearer ${X_BEARER}` }
     });
     if (!r.ok) throw new Error(`X API ${r.status}`);
     return r.json();
   }

   // Replacement for generateTimeSeriesData()
   async function getTimeSeries(days) {
     const start = new Date(Date.now() - days * 86400000).toISOString();
     const tweets = await xFetch(
       `/users/${USER_ID}/tweets` +
       `?max_results=100` +
       `&start_time=${start}` +
       `&tweet.fields=created_at,public_metrics,non_public_metrics,organic_metrics`
     );

     // Bucket by day, then sum impression_count, like_count, reply_count, etc.
     const byDay = {};
     for (const t of tweets.data ?? []) {
       const day = t.created_at.slice(0,10);
       byDay[day] ??= { impressions: 0, engagements: 0, visits: 0 };
       const m = t.non_public_metrics || {};
       const p = t.public_metrics || {};
       byDay[day].impressions += m.impression_count || 0;
       byDay[day].engagements += (p.like_count||0) + (p.retweet_count||0) +
                                  (p.reply_count||0) + (p.quote_count||0);
       byDay[day].visits      += m.user_profile_clicks || 0;
     }

     // Followers: GET /2/users/:id?user.fields=public_metrics
     // (Snapshot only — for daily history, store in your own DB.)
     const u = await xFetch(`/users/${USER_ID}?user.fields=public_metrics`);
     const followersNow = u.data.public_metrics.followers_count;

     // Build arrays in chronological order
     const labels = [], imp = [], eng = [], vis = [], fol = [];
     for (let i = days - 1; i >= 0; i--) {
       const d = new Date(Date.now() - i * 86400000);
       const key = d.toISOString().slice(0,10);
       labels.push(d.toLocaleDateString(undefined,{month:'short',day:'numeric'}));
       imp.push(byDay[key]?.impressions || 0);
       eng.push(byDay[key]?.engagements || 0);
       vis.push(byDay[key]?.visits      || 0);
       fol.push(followersNow); // replace with stored daily snapshots
     }
     return { labels, impressions: imp, engagements: eng, visits: vis, followers: fol };
   }
   ========================================================= */
