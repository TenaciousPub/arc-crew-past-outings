var allEvents = [];
  var activeCat = 'all';

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  async function loadEvents() {
    var container = document.getElementById('events-container');
    var metaEl = document.querySelector('meta[name="sheet-data-url"]');
    if (!metaEl) {
      container.innerHTML = '<div class="empty-state"><div class="big-icon">⚠️</div><p>Sheet not linked — reload the page.</p></div>';
      return;
    }
    try {
      var res = await fetch(metaEl.content + '?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();

      // PMG returns { headers: [...], data: [...] } — data is an array of objects
      var rawRows = [];
      if (Array.isArray(json)) rawRows = json;
      else if (Array.isArray(json.data)) rawRows = json.data;
      else if (Array.isArray(json.rows)) rawRows = json.rows;

      // Keep only rows with a real WinnerTitle, reverse so most recent first
      allEvents = rawRows
        .filter(function(r){ return r && r.WinnerTitle && String(r.WinnerTitle).trim() !== ''; })
        .reverse();

      renderStats();
      applyFilters();
    } catch(e) {
      container.innerHTML = '<div class="empty-state"><div class="big-icon">⚠️</div><p>Couldn\'t load outings. Try refreshing!</p></div>';
      console.error('loadEvents:', e);
    }
  }

  function renderStats() {
    document.getElementById('stat-total').textContent = allEvents.length;
    if (!allEvents.length) return;

    var catCount = {};
    allEvents.forEach(function(e){
      var c = String(e.WinnerCategory||'Other').trim();
      catCount[c] = (catCount[c]||0) + 1;
    });
    var topCat = Object.keys(catCount).sort(function(a,b){ return catCount[b]-catCount[a]; })[0] || '—';
    // Show last word of the category (the actual name, minus emoji)
    var parts = topCat.split(' ').filter(function(p){ return p && !/^[\u{1F000}-\u{1FFFF}\u2600-\u27BF]+$/u.test(p); });
    document.getElementById('stat-top-cat').textContent = parts.length ? parts[parts.length-1] : topCat;

    var total = allEvents.reduce(function(sum,e){ return sum + (parseInt(e.NetVotes)||0); }, 0);
    document.getElementById('stat-avg-votes').textContent = (total / allEvents.length).toFixed(1);
  }

  function setCat(btn) {
    document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    applyFilters();
  }

  function applyFilters() {
    var query = (document.getElementById('search-input').value || '').toLowerCase().trim();
    var filtered = allEvents.filter(function(e) {
      var cat = String(e.WinnerCategory||'');
      var matchCat = activeCat === 'all' || cat.toLowerCase().indexOf(activeCat.toLowerCase()) !== -1;
      var matchSearch = !query ||
        String(e.WinnerTitle||'').toLowerCase().indexOf(query) !== -1 ||
        String(e.WinnerDescription||'').toLowerCase().indexOf(query) !== -1 ||
        String(e.WinnerProposedBy||'').toLowerCase().indexOf(query) !== -1 ||
        String(e.WinnerAddress||'').toLowerCase().indexOf(query) !== -1 ||
        cat.toLowerCase().indexOf(query) !== -1;
      return matchCat && matchSearch;
    });

    var countEl = document.getElementById('results-count');
    countEl.textContent = (query || activeCat !== 'all')
      ? filtered.length + ' outing' + (filtered.length !== 1 ? 's' : '') + ' found'
      : '';

    renderEvents(filtered);
  }

  function renderEvents(events) {
    var container = document.getElementById('events-container');
    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><div class="big-icon">🔍</div><p>No outings match that filter.</p></div>';
      return;
    }
    var html = '<div class="events-grid">';
    events.forEach(function(e, i) {
      var net = parseInt(e.NetVotes) || 0;
      var dateStr = '';
      if (e.PickedAt) {
        var d = new Date(e.PickedAt);
        if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      }
      var num = allEvents.length - allEvents.indexOf(e);
      html +=
        '<div class="event-card" style="animation-delay:' + (i*0.04) + 's">' +
          '<div class="event-num">' + num + '</div>' +
          '<div class="event-top">' +
            '<div><div class="event-title">' + esc(e.WinnerTitle) + '</div></div>' +
            (e.WinnerCategory ? '<span class="event-cat">' + esc(e.WinnerCategory) + '</span>' : '') +
          '</div>' +
          (e.WinnerDescription ? '<div class="event-desc">' + esc(e.WinnerDescription) + '</div>' : '') +
          (e.WinnerAddress && String(e.WinnerAddress).trim() !== '' ? '<div class="event-address"><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.WinnerAddress) + '" target="_blank" rel="noopener noreferrer">📍 ' + esc(e.WinnerAddress) + '</a></div>' : '') +
          '<div class="event-footer">' +
            (e.WinnerProposedBy ? '<div class="event-proposer">Proposed by <span>' + esc(e.WinnerProposedBy) + '</span></div>' : '') +
            (dateStr ? '<div class="event-date">📅 ' + esc(dateStr) + '</div>' : '') +
            '<div class="event-votes">⚡ <span class="score' + (net<0?' neg':'') + '">' + net + '</span>&nbsp;net votes</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  loadEvents();