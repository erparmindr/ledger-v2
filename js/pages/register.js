/* ============================================================
   REGISTER PAGE
   ============================================================ */
window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.registerFilters = { account:"all", currency:"all", category:"all", subcategory:"all", type:"all", datePreset:"all", dateFrom:"", dateTo:"", search:"" };

window.Ledger.matchesDatePreset = function(dateStr, preset, from, to){
  if(preset === "all") return true;
  var d = new Date(dateStr + "T00:00:00");
  var now = new Date();
  if(preset === "today"){ return dateStr === window.Ledger.todayISO(); }
  if(preset === "week"){
    var weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
    return d >= weekAgo && d <= now;
  }
  if(preset === "month"){ return window.Ledger.monthKeyOf(dateStr) === window.Ledger.monthKeyOf(window.Ledger.todayISO()); }
  if(preset === "year"){ return d.getFullYear() === now.getFullYear(); }
  if(preset === "custom"){
    if(from && dateStr < from) return false;
    if(to && dateStr > to) return false;
    return true;
  }
  return true;
};

window.Ledger.filteredTransactions = function(){
  var f = window.Ledger.registerFilters;
  return window.Ledger.DB.transactions.filter(function(t){
    if(f.type !== "all" && t.type !== f.type) return false;
    if(f.account !== "all"){
      var touchesAccount = (t.account === f.account) ||
        (t.fromType==="account" && t.fromId===f.account) ||
        (t.toType==="account" && t.toId===f.account);
      if(!touchesAccount) return false;
    }
    if(f.currency !== "all"){
      var cur = null;
      if(t.account){ var a = window.Ledger.findAccount(t.account); cur = a ? a.currency : null; }
      else if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); cur = a2?a2.currency:null; }
      else if(t.toType==="account"){ var a3=window.Ledger.findAccount(t.toId); cur = a3?a3.currency:null; }
      if(cur !== f.currency) return false;
    }
    if(f.category !== "all" && t.category !== f.category) return false;
    if(f.subcategory !== "all" && t.subcategory !== f.subcategory) return false;
    if(!window.Ledger.matchesDatePreset(t.date, f.datePreset, f.dateFrom, f.dateTo)) return false;
    if(f.search && f.search.trim()){
      var q = f.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

window.Ledger.pages.renderRegisterPage = function(){
  var list = window.Ledger.filteredTransactions().sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); });
  var showRunning = window.Ledger.registerFilters.account !== "all";
  var runBalMap = {};
  if(showRunning){
    var acc = window.Ledger.findAccount(window.Ledger.registerFilters.account);
    if(acc){
      var chrono = window.Ledger.DB.transactions.filter(function(t){
        return (t.account === acc.id) || (t.fromType==="account"&&t.fromId===acc.id) || (t.toType==="account"&&t.toId===acc.id);
      }).sort(function(a,b){ return (a.date+a.id).localeCompare(b.date+b.id); });
      var running = acc.openingBalance || 0;
      chrono.forEach(function(t){
        if(t.type==="expense" && t.account===acc.id) running -= t.amount;
        else if(t.type==="income" && t.account===acc.id) running += t.amount;
        else if(t.type==="transfer"){
          if(t.fromType==="account" && t.fromId===acc.id) running -= t.amount;
          if(t.toType==="account" && t.toId===acc.id) running += t.amount;
        }
        runBalMap[t.id] = running;
      });
    }
  }

  var accOpts = '<option value="all">All accounts</option>' + window.Ledger.DB.accounts.map(function(a){
    return '<option value="' + a.id + '" ' + (window.Ledger.registerFilters.account===a.id?'selected':'') + '>' + window.Ledger.escapeHtml(a.name) + '</option>';
  }).join("");
  var curSet = {}; window.Ledger.DB.accounts.forEach(function(a){ curSet[a.currency]=1; });
  var curOpts = '<option value="all">All currencies</option>' + Object.keys(curSet).map(function(c){
    return '<option value="' + c + '" ' + (window.Ledger.registerFilters.currency===c?'selected':'') + '>' + c + '</option>';
  }).join("");
  var catOpts = '<option value="all">All categories</option>' + window.Ledger.DB.categories.map(function(c){
    return '<option value="' + c.id + '" ' + (window.Ledger.registerFilters.category===c.id?'selected':'') + '>' + window.Ledger.escapeHtml(c.name) + '</option>';
  }).join("");
  var subOpts = '<option value="all">All subcategories</option>';
  if(window.Ledger.registerFilters.category !== "all"){
    var cat = window.Ledger.findCategory(window.Ledger.registerFilters.category);
    if(cat && cat.subs.length){
      subOpts += cat.subs.map(function(s){
        return '<option value="' + s.id + '" ' + (window.Ledger.registerFilters.subcategory===s.id?'selected':'') + '>' + window.Ledger.escapeHtml(s.name) + '</option>';
      }).join("");
    }
  }

  var listHtml = list.length === 0
    ? '<div class="empty-state"><div class="big">No matching entries</div>Try adjusting your filters, or add a new transaction.</div>'
    : list.map(function(t){ return window.Ledger.renderTxRow(t, {showRunningBalance:showRunning, runningBalance:runBalMap[t.id]}); }).join("");

  return ''
    + '<div class="card">'
    + '  <div class="filters-bar">'
    + '    <select id="fAccount">' + accOpts + '</select>'
    + '    <select id="fCurrency">' + curOpts + '</select>'
    + '    <select id="fCategory">' + catOpts + '</select>'
    + '    <select id="fSubcategory">' + subOpts + '</select>'
    + '    <select id="fType">'
    + '      <option value="all" ' + (window.Ledger.registerFilters.type==="all"?"selected":"") + '>All types</option>'
    + '      <option value="expense" ' + (window.Ledger.registerFilters.type==="expense"?"selected":"") + '>Expense</option>'
    + '      <option value="income" ' + (window.Ledger.registerFilters.type==="income"?"selected":"") + '>Income</option>'
    + '      <option value="transfer" ' + (window.Ledger.registerFilters.type==="transfer"?"selected":"") + '>Transfer</option>'
    + '    </select>'
    + '    <select id="fDatePreset">' + window.Ledger.DATE_PRESETS.map(function(p){
          return '<option value="'+p.id+'" '+(window.Ledger.registerFilters.datePreset===p.id?"selected":"")+'>'+p.label+'</option>';
        }).join("") + '</select>'
    + (window.Ledger.registerFilters.datePreset === "custom" ? (
        '<input type="date" id="fDateFrom" value="' + window.Ledger.registerFilters.dateFrom + '">'
        + '<input type="date" id="fDateTo" value="' + window.Ledger.registerFilters.dateTo + '">'
      ) : "")
    + '    <button class="btn btn-sm" id="exportCsvBtn" style="margin-left:auto;">Export CSV</button>'
    + '  </div>'
    + '  <div class="card-header"><h2>Register</h2><span class="hint">' + list.length + ' entr' + (list.length===1?'y':'ies') + (showRunning ? ' &middot; running balance shown' : '') + '</span></div>'
    + '  <div>' + listHtml + '</div>'
    + '</div>';
};
