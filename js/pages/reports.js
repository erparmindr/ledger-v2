window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};
window.Ledger.reportState = { month: null, chartMode: "category" };

window.Ledger.getAvailableMonths = function() {
  var set = {};
  window.Ledger.DB.transactions.forEach(function(t){ set[window.Ledger.monthKeyOf(t.date)] = 1; });
  set[window.Ledger.monthKeyOf(window.Ledger.todayISO())] = 1;
  return Object.keys(set).sort().reverse();
};

window.Ledger.monthLabel = function(mk) {
  var parts = mk.split("-");
  var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, 1);
  return d.toLocaleDateString(undefined, {month:"long", year:"numeric"});
};

window.Ledger.pages.renderReportsPage = function() {
  var reportState = window.Ledger.reportState;
  var monthOptions = window.Ledger.getAvailableMonths();
  var monthSel = monthOptions.map(function(m){
    return '<option value="' + m + '" ' + (reportState.month===m?'selected':'') + '>' + window.Ledger.monthLabel(m) + '</option>';
  }).join("");
  if(monthOptions.indexOf(reportState.month) === -1 && monthOptions.length){
    reportState.month = monthOptions[0];
  }

  var totals = {};
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "expense") return;
    if(window.Ledger.monthKeyOf(t.date) !== reportState.month) return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";

    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){
        var key = cur + "||" + s.categoryId + "||";
        totals[key] = (totals[key]||0) + s.amount;
      });
      return;
    }

    var key;
    if(reportState.chartMode === "sub" && t.subcategory){
      key = cur + "||" + t.category + "||" + t.subcategory;
    } else {
      key = cur + "||" + t.category + "||";
    }
    totals[key] = (totals[key]||0) + t.amount;
  });

  var entries = Object.keys(totals).map(function(k){
    var parts = k.split("||");
    var cur = parts[0], catId = parts[1], subId = parts[2];
    var label = window.Ledger.categoryName(catId) + (subId ? " \u203a " + window.Ledger.subcatName(catId, subId) : "");
    return {cur:cur, catId:catId, label:label, amt:totals[k]};
  }).sort(function(a,b){ return b.amt - a.amt; });

  var byCur = {};
  entries.forEach(function(e){ (byCur[e.cur] = byCur[e.cur]||[]).push(e); });

  var chartHtml = "";
  if(entries.length === 0){
    chartHtml = '<div class="empty-state"><div class="big">No expenses this month</div>Try a different month.</div>';
  } else {
    Object.keys(byCur).forEach(function(cur){
      var rows = byCur[cur];
      var max = rows[0].amt;
      chartHtml += '<div style="margin-bottom:14px;"><div class="muted" style="font-size:11.5px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px;">' + cur + '</div>';
      chartHtml += rows.map(function(r){
        var pct = window.Ledger.clamp(Math.round((r.amt/max)*100), 4, 100);
        return '<div class="chart-row">'
          + '<div class="cname" title="' + window.Ledger.escapeHtml(r.label.replace(/&[a-z]+;/g,"")) + '">' + r.label + '</div>'
          + '<div class="chart-track"><div class="chart-fill" style="width:' + pct + '%; background:' + window.Ledger.categoryColor(r.catId) + ';"></div></div>'
          + '<div class="camt num">' + window.Ledger.fmtMoney(r.amt, cur) + '</div>'
          + '</div>';
      }).join("");
      chartHtml += '</div>';
    });
  }

  var monthIncome = {}, monthExpense = {};
  window.Ledger.DB.transactions.forEach(function(t){
    if(window.Ledger.monthKeyOf(t.date) !== reportState.month) return;
    if(t.type!=="income" && t.type!=="expense") return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(t.type==="income") monthIncome[cur]=(monthIncome[cur]||0)+t.amount;
    else monthExpense[cur]=(monthExpense[cur]||0)+t.amount;
  });
  var curUnion = Object.keys(Object.assign({}, monthIncome, monthExpense));
  var summaryHtml = curUnion.length === 0 ? '<span class="faint">No activity this month</span>' : curUnion.map(function(c){
    var inc = monthIncome[c]||0, exp = monthExpense[c]||0;
    return '<div class="metric"><div class="lbl">' + c + ' summary</div>'
      + '<div style="display:flex; align-items:baseline; flex-wrap:wrap;">'
      + '<span class="num pos" style="font-size:16px; margin-right:16px;">+' + window.Ledger.fmtMoney(inc,c) + '</span>'
      + '<span class="num neg" style="font-size:16px; margin-right:16px;">\u2212' + window.Ledger.fmtMoney(exp,c) + '</span>'
      + '<span class="num" style="font-size:16px;">net ' + window.Ledger.fmtMoney(inc-exp,c) + '</span>'
      + '</div></div>';
  }).join("");

  return ''
    + '<div class="card card-pad">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">'
    + '    <select id="monthPicker">' + monthSel + '</select>'
    + '    <button class="btn btn-sm" id="downloadBackupBtn">Export full backup (JSON)</button>'
    + '  </div>'
    + '  <div class="grid-2">' + summaryHtml + '</div>'
    + '</div>'
    + '<div class="card section-gap">'
    + '  <div class="card-header">'
    + '    <h2>Spending by category</h2>'
    + '    <div class="toggle-pair">'
    + '      <button data-chartmode="main" class="' + (reportState.chartMode==="main"?"active":"") + '">By category</button>'
    + '      <button data-chartmode="sub" class="' + (reportState.chartMode==="sub"?"active":"") + '">By subcategory</button>'
    + '    </div>'
    + '  </div>'
    + '  <div class="card-pad">' + chartHtml + '</div>'
    + '</div>';
};
