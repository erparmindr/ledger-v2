window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

/* ============================================================
   OVERVIEW PAGE
   ============================================================ */
window.Ledger.pages.renderOverviewPage = function(){
  var accs = window.Ledger.activeAccounts();
  var byCurrency = {};
  accs.forEach(function(a){
    byCurrency[a.currency] = byCurrency[a.currency] || 0;
    byCurrency[a.currency] += window.Ledger.accountBalance(a.id);
  });

  var thisMonth = window.Ledger.monthKeyOf(window.Ledger.todayISO());
  var incomeByCur = {}, expenseByCur = {};
  window.Ledger.DB.transactions.forEach(function(t){
    if(window.Ledger.monthKeyOf(t.date) !== thisMonth) return;
    var cur = null;
    if(t.type === "income" || t.type === "expense"){
      var acc = window.Ledger.findAccount(t.account);
      cur = acc ? acc.currency : "USD";
    }
    if(t.type === "income"){ incomeByCur[cur] = (incomeByCur[cur]||0) + t.amount; }
    if(t.type === "expense"){ expenseByCur[cur] = (expenseByCur[cur]||0) + t.amount; }
  });

  var totalsHtml = Object.keys(byCurrency).length === 0
    ? '<div class="metric"><div class="lbl">Total balance</div><div class="val faint">No accounts yet</div></div>'
    : Object.keys(byCurrency).map(function(cur){
        return '<div class="metric"><div class="lbl">Balance &middot; ' + cur + '</div><div class="val">' + window.Ledger.fmtMoney(byCurrency[cur], cur) + '</div></div>';
      }).join("");

  var allCur = Object.keys(Object.assign({}, incomeByCur, expenseByCur, byCurrency));
  if(allCur.length === 0) allCur = ["USD"];
  var primaryCur = allCur[0];

  var incomeVal = incomeByCur[primaryCur] || 0;
  var expenseVal = expenseByCur[primaryCur] || 0;
  var net = incomeVal - expenseVal;

  // ---- Top spending categories (this month, primary currency) ----
  var catTotals = {};
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "expense") return;
    if(window.Ledger.monthKeyOf(t.date) !== thisMonth) return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(cur !== primaryCur) return;
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){ catTotals[s.categoryId] = (catTotals[s.categoryId]||0) + s.amount; });
    } else if(t.category){
      catTotals[t.category] = (catTotals[t.category]||0) + t.amount;
    }
  });
  var topCats = Object.keys(catTotals).map(function(catId){
    return {catId:catId, name:window.Ledger.categoryName(catId), amt:catTotals[catId]};
  }).sort(function(a,b){ return b.amt - a.amt; }).slice(0, 5);

  var topCatsHtml;
  if(topCats.length === 0){
    topCatsHtml = '<div class="empty-state" style="padding:28px 20px;"><div class="big" style="font-size:14px;">No categorized spending yet</div>Expenses with a category will show up here.</div>';
  } else {
    var maxAmt = topCats[0].amt;
    topCatsHtml = topCats.map(function(c){
      var pct = window.Ledger.clamp(Math.round((c.amt/maxAmt)*100), 4, 100);
      return '<div class="chart-row">'
        + '<div class="cname">' + window.Ledger.escapeHtml(c.name) + '</div>'
        + '<div class="chart-track"><div class="chart-fill" style="width:' + pct + '%; background:' + window.Ledger.categoryColor(c.catId) + ';"></div></div>'
        + '<div class="camt num">' + window.Ledger.fmtMoney(c.amt, primaryCur) + '</div>'
        + '</div>';
    }).join("");
  }

  // ---- Upcoming recurring items (next 7 days) ----
  var today = window.Ledger.todayISO();
  var upcoming = window.Ledger.DB.recurring.map(function(r){
    return {r:r, due: window.Ledger.nextDueDate(r, today)};
  }).filter(function(x){
    var diffDays = Math.round((new Date(x.due+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
    return diffDays <= 7;
  }).sort(function(a,b){ return a.due.localeCompare(b.due); });

  var upcomingHtml;
  if(upcoming.length === 0){
    upcomingHtml = '<div class="empty-state" style="padding:28px 20px;"><div class="big" style="font-size:14px;">Nothing due soon</div>Recurring items due within 7 days will show up here.</div>';
  } else {
    upcomingHtml = upcoming.map(function(x){
      var r = x.r;
      var acc = window.Ledger.findAccount(r.account);
      var diffDays = Math.round((new Date(x.due+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
      var dueDisp = new Date(x.due+"T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric"});
      var whenLabel = diffDays === 0 ? "Today" : diffDays < 0 ? "Overdue" : ("in " + diffDays + "d");
      return '<div class="bill-row">'
        + '<div><div class="nm">' + window.Ledger.escapeHtml(r.name) + '</div><div class="due ' + (diffDays<=3?'soon':'') + '">' + dueDisp + ' &middot; ' + whenLabel + ' &middot; ' + window.Ledger.frequencyLabel(r.frequency) + '</div></div>'
        + '<div class="num" style="font-size:13.5px;">' + window.Ledger.fmtMoney(r.amount, acc?acc.currency:"USD") + '</div>'
        + '</div>';
    }).join("");
  }

  var recentTx = window.Ledger.DB.transactions.slice().sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); }).slice(0,6);
  var recentHtml = recentTx.length === 0
    ? '<div class="empty-state"><div class="big">No entries yet</div>Use "New transaction" above to add your first one.</div>'
    : recentTx.map(window.Ledger.renderTxRow).join("");

  return ''
    + '<div class="grid-3">' + totalsHtml + '</div>'
    + '<div class="section-gap grid-3">'
    + '  <div class="metric"><div class="lbl">Income this month (' + primaryCur + ')</div><div class="val pos">' + window.Ledger.fmtMoney(incomeVal, primaryCur) + '</div></div>'
    + '  <div class="metric"><div class="lbl">Expenses this month (' + primaryCur + ')</div><div class="val neg">' + window.Ledger.fmtMoney(expenseVal, primaryCur) + '</div></div>'
    + '  <div class="metric"><div class="lbl">Net this month (' + primaryCur + ')</div><div class="val ' + (net>=0?'pos':'neg') + '">' + (net>=0?'+':'') + window.Ledger.fmtMoney(net, primaryCur) + '</div></div>'
    + '</div>'
    + '<div class="section-gap" style="display:flex; gap:16px; flex-wrap:wrap;">'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Top spending categories</h2><span class="hint">this month</span></div>'
    + '    <div class="card-pad">' + topCatsHtml + '</div>'
    + '  </div>'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Upcoming</h2><span class="hint">next 7 days</span></div>'
    + '    <div class="card-pad" style="padding-top:6px; padding-bottom:6px;">' + upcomingHtml + '</div>'
    + '    <div style="padding:0 20px 16px;"><button class="btn btn-sm" data-nav-link="recurring">Manage recurring &rarr;</button></div>'
    + '  </div>'
    + '</div>'
    + '<div class="card section-gap">'
    + '  <div class="card-header"><h2>Recent activity</h2><span class="hint">last 6 entries</span></div>'
    + '  <div>' + recentHtml + '</div>'
    + '</div>';
};

/* ============================================================
   RECURRING HELPERS (used by overview + recurring page)
   ============================================================ */
var _overviewPad2 = function(n){ n = String(n); return n.length < 2 ? "0" + n : n; };
var _overviewTodayISOFromDate = function(d){
  return d.getFullYear() + "-" + _overviewPad2(d.getMonth()+1) + "-" + _overviewPad2(d.getDate());
};

/* Computes the next due date (ISO string) for a recurring item on/after `fromDate` (ISO string, defaults to today).
   Supports weekly, biweekly, and monthly frequencies, all anchored to r.startDate. */
window.Ledger.nextDueDate = function(r, fromDate){
  fromDate = fromDate || window.Ledger.todayISO();
  var start = new Date(r.startDate + "T00:00:00");
  var from = new Date(fromDate + "T00:00:00");

  if(r.frequency === "weekly" || r.frequency === "biweekly"){
    var stepDays = r.frequency === "weekly" ? 7 : 14;
    var diffDays = Math.round((from - start) / 86400000);
    if(diffDays < 0) return _overviewTodayISOFromDate(start);
    var cyclesElapsed = Math.floor(diffDays / stepDays);
    var candidate = new Date(start);
    candidate.setDate(candidate.getDate() + cyclesElapsed * stepDays);
    if(candidate < from) candidate.setDate(candidate.getDate() + stepDays);
    return _overviewTodayISOFromDate(candidate);
  }

  // monthly: anchor to the day-of-month from startDate
  var day = start.getDate();
  var candidateMonth = new Date(from.getFullYear(), from.getMonth(), Math.min(day, window.Ledger.daysInMonth(from.getFullYear(), from.getMonth())));
  if(candidateMonth < from){
    var nm = from.getMonth() + 1, ny = from.getFullYear();
    if(nm > 11){ nm = 0; ny++; }
    candidateMonth = new Date(ny, nm, Math.min(day, window.Ledger.daysInMonth(ny, nm)));
  }
  return _overviewTodayISOFromDate(candidateMonth);
};

window.Ledger.daysInMonth = function(year, month){ return new Date(year, month+1, 0).getDate(); };

window.Ledger.frequencyLabel = function(freq){
  if(freq === "weekly") return "Weekly";
  if(freq === "biweekly") return "Every 2 weeks";
  return "Monthly";
};
