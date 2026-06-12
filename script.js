// ── HELPERS ────────────────────────────────────────
const $ = id => document.getElementById(id);

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function daysLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
}

// ── TICKER ────────────────────────────────────────
function buildTicker(banks) {
  const sorted = [...banks].sort(
    (a, b) => daysUntil(a.next_meeting) - daysUntil(b.next_meeting)
  );

  const items = sorted.map(b => {
    const days = daysUntil(b.next_meeting);
    const cls = days <= 3 ? 'urgent' : days <= 14 ? 'soon' : '';
    return `<span class="ticker-item">
      ${b.flag} <strong>${b.id.toUpperCase()}</strong>
      <span class="days ${cls}">${daysLabel(days)}</span>
      · ${formatDate(b.next_meeting)}
    </span>`;
  }).join('');

  // Duplicate for seamless loop
  $('ticker').innerHTML = items + items;
}

// ── STATS BAR ─────────────────────────────────────
function buildStats(banks) {
  const cut  = banks.filter(b => b.direction === 'cut').length;
  const hold = banks.filter(b => b.direction === 'hold').length;
  const hike = banks.filter(b => b.direction === 'hike').length;

  $('count-cut').textContent  = cut;
  $('count-hold').textContent = hold;
  $('count-hike').textContent = hike;

  const next = [...banks].sort(
    (a, b) => daysUntil(a.next_meeting) - daysUntil(b.next_meeting)
  )[0];

  $('next-meeting-bank').textContent =
    `${next.flag} ${next.id.toUpperCase()} · ${daysLabel(daysUntil(next.next_meeting))}`;
}

// ── RATE CARDS ────────────────────────────────────
function buildCards(banks) {
  const grid = $('cards-grid');
  grid.innerHTML = banks.map(b => {
    const days = daysUntil(b.next_meeting);
    const daysCls = days <= 3 ? 'urgent' : days <= 14 ? 'soon' : '';
    const change = b.current_rate - b.previous_rate;
    const changeStr = change === 0 ? '—'
      : (change > 0 ? '+' : '') + change.toFixed(2) + '%';

    return `
    <div class="rate-card ${b.direction}">
      <div class="card-header">
        <div class="card-flag-name">
          <span class="card-flag">${b.flag}</span>
          <span class="card-name">${b.name}</span>
          <span class="card-country">${b.country}</span>
        </div>
        <span class="direction-badge ${b.direction}">
          ${b.direction === 'cut' ? '▼ Cut' : b.direction === 'hike' ? '▲ Hike' : '◆ Hold'}
        </span>
      </div>

      <div class="card-rates">
        <div class="rate-box">
          <span class="rate-label">Current Rate</span>
          <span class="rate-value current">${b.current_rate.toFixed(2)}%</span>
          <span style="font-size:11px;color:${change < 0 ? 'var(--cut)' : change > 0 ? 'var(--hike)' : 'var(--muted)'}">
            ${changeStr} vs prev
          </span>
        </div>
        <div class="rate-box">
          <span class="rate-label">Consensus Next</span>
          <span class="rate-value consensus">${b.consensus_next.toFixed(2)}%</span>
        </div>
      </div>

      <div class="card-footer">
        <div>
          <div class="meeting-label">Next Meeting</div>
          <div class="meeting-date">${formatDate(b.next_meeting)}</div>
        </div>
        <span class="days-away ${daysCls}">${daysLabel(days)}</span>
      </div>
    </div>`;
  }).join('');
}

// ── CHARTS ────────────────────────────────────────
function buildCharts(banks) {
  const labels   = banks.map(b => `${b.flag} ${b.id.toUpperCase()}`);
  const current  = banks.map(b => b.current_rate);
  const consensus = banks.map(b => b.consensus_next);
  const colors   = banks.map(b => b.color);

  // Bar chart — current vs consensus
  new Chart($('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Current Rate %',
          data: current,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Consensus Next %',
          data: consensus,
          backgroundColor: 'rgba(59,130,246,0.25)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1f2d45' } },
        y: { ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: '#1f2d45' } }
      }
    }
  });

  // Doughnut — policy direction breakdown
  const cut  = banks.filter(b => b.direction === 'cut').length;
  const hold = banks.filter(b => b.direction === 'hold').length;
  const hike = banks.filter(b => b.direction === 'hike').length;

  new Chart($('directionChart'), {
    type: 'doughnut',
    data: {
      labels: ['Cutting', 'Holding', 'Hiking'],
      datasets: [{
        data: [cut, hold, hike],
        backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'],
        borderColor: ['#22c55e', '#f59e0b', '#ef4444'],
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 }
        }
      }
    }
  });
}

// ── BRIEFING ──────────────────────────────────────
async function loadBriefing() {
  try {
    const res = await fetch('data/briefing.md');
    const md  = await res.text();
    $('briefing-content').innerHTML = marked.parse(md);
  } catch {
    $('briefing-content').innerHTML =
      '<p class="loading-text">Briefing unavailable — check back after the next automated run.</p>';
  }
}

// ── INIT ──────────────────────────────────────────
async function init() {
  try {
    const res  = await fetch('data/rates.json');
    const data = await res.json();
    const banks = data.banks;

    $('last-updated').textContent = `Updated: ${data.last_updated}`;

    buildTicker(banks);
    buildStats(banks);
    buildCards(banks);
    buildCharts(banks);
    loadBriefing();

  } catch (err) {
    console.error('Failed to load rate data:', err);
  }
}

init();
