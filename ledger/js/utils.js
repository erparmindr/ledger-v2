window.Ledger = window.Ledger || {};

/* ============================================================
   UTILITIES
   ============================================================ */
window.Ledger.uid = function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,9);
};
window.Ledger.pad2 = function pad2(n){ n = String(n); return n.length < 2 ? "0" + n : n; };
window.Ledger.escapeHtml = function escapeHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
};
window.Ledger.fmtMoney = function fmtMoney(n, currency){
  currency = currency || "USD";
  var neg = n < 0;
  var abs = Math.abs(n);
  var str = abs.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  var symbols = {USD:"$",CAD:"$",EUR:"\u20AC",GBP:"\u00A3",INR:"\u20B9",AUD:"$",JPY:"\u00A5"};
  var sym = symbols[currency] || (currency + " ");
  return (neg ? "\u2212" : "") + sym + str;
};
window.Ledger.todayISO = function todayISO(){
  var d = new Date();
  return d.getFullYear() + "-" + window.Ledger.pad2(d.getMonth()+1) + "-" + window.Ledger.pad2(d.getDate());
};
window.Ledger.monthKeyOf = function monthKeyOf(dateStr){ return dateStr.slice(0,7); };
window.Ledger.clamp = function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); };

/* Entity lookup */
window.Ledger.findAccount = function findAccount(id){ return Ledger.DB.accounts.find(function(a){ return a.id === id; }); };
window.Ledger.findPerson = function findPerson(id){ return Ledger.DB.people.find(function(p){ return p.id === id; }); };
window.Ledger.findCategory = function findCategory(id){ return Ledger.DB.categories.find(function(c){ return c.id === id; }); };
window.Ledger.activeAccounts = function activeAccounts(){ return Ledger.DB.accounts.filter(function(a){ return !a.archived; }); };

window.Ledger.entityRef = function entityRef(type, id){
  if(type === "account"){ var a = window.Ledger.findAccount(id); return a ? {name:a.name, currency:a.currency, kind:"account", obj:a} : null; }
  if(type === "person"){ var p = window.Ledger.findPerson(id); return p ? {name:p.name, currency:null, kind:"person", obj:p} : null; }
  return null;
};

/* Balance computation */
window.Ledger.accountBalance = function accountBalance(accountId){
  var acc = window.Ledger.findAccount(accountId);
  if(!acc) return 0;
  var bal = acc.openingBalance || 0;
  Ledger.DB.transactions.forEach(function(t){
    if(t.type === "expense" && t.account === accountId) bal -= t.amount;
    else if(t.type === "income" && t.account === accountId) bal += t.amount;
    else if(t.type === "transfer"){
      if(t.fromType === "account" && t.fromId === accountId) bal -= t.amount;
      if(t.toType === "account" && t.toId === accountId) bal += t.amount;
    }
  });
  return bal;
};

window.Ledger.personBalanceByCurrency = function personBalanceByCurrency(personId){
  var p = window.Ledger.findPerson(personId);
  if(!p) return {};
  var byCur = {};
  function add(cur, amt){
    if(!cur) cur = "USD";
    byCur[cur] = (byCur[cur]||0) + amt;
  }
  Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "transfer") return;
    if(t.debtItemId) return;
    if(t.toType === "person" && t.toId === personId){
      var fromRef = window.Ledger.entityRef(t.fromType, t.fromId);
      add(fromRef ? fromRef.currency : "USD", t.amount);
    }
    if(t.fromType === "person" && t.fromId === personId){
      var toRef = window.Ledger.entityRef(t.toType, t.toId);
      add(toRef ? toRef.currency : "USD", -t.amount);
    }
  });
  Ledger.DB.debtItems.forEach(function(d){
    if(d.personId === personId && d.status === "open"){
      add(d.currency || "USD", d.amount);
    }
  });
  Object.keys(byCur).forEach(function(cur){
    if(Math.abs(byCur[cur]) < 0.005) delete byCur[cur];
  });
  return byCur;
};

window.Ledger.personBalance = function personBalance(personId){
  var byCur = window.Ledger.personBalanceByCurrency(personId);
  return Object.keys(byCur).reduce(function(sum, cur){ return sum + byCur[cur]; }, 0);
};

/* Debt/Loan helpers */
window.Ledger.openDebtItemsForPerson = function openDebtItemsForPerson(personId){
  return Ledger.DB.debtItems.filter(function(d){ return d.personId === personId && d.status === "open"; })
    .sort(function(a,b){ return b.date.localeCompare(a.date); });
};

window.Ledger.pendingDebtItems = function pendingDebtItems(){
  return Ledger.DB.debtItems.filter(function(d){ return d.status === "pending" && !d.personId; })
    .sort(function(a,b){ return b.date.localeCompare(a.date); });
};

/* Category helpers */
window.Ledger.categoryHasSubs = function categoryHasSubs(catId){
  var c = window.Ledger.findCategory(catId);
  return !!(c && c.subs && c.subs.length > 0);
};

window.Ledger.categoryName = function categoryName(catId){
  var c = window.Ledger.findCategory(catId);
  return c ? c.name : "Uncategorized";
};
window.Ledger.subcatName = function subcatName(catId, subId){
  var c = window.Ledger.findCategory(catId);
  if(!c) return "";
  var s = c.subs.find(function(s){ return s.id === subId; });
  return s ? s.name : "";
};

window.Ledger.CAT_PALETTE = ["#E8B33C","#1F9D6E","#E2502F","#8B6FE8","#2E78D2","#E0599C","#7FBF4D","#E8884C","#5B8FE6","#C99A2E","#3FB89E","#D9669A"];
window.Ledger.categoryColor = function categoryColor(catId){
  var idx = Ledger.DB.categories.findIndex(function(c){ return c.id === catId; });
  if(idx < 0) idx = 0;
  return Ledger.CAT_PALETTE[idx % Ledger.CAT_PALETTE.length];
};

/* UI utilities */
window.Ledger.refreshIcons = function refreshIcons(){
  if(window.lucide && typeof window.lucide.createIcons === "function"){
    try{ window.lucide.createIcons(); }catch(e){}
  }
};

window.Ledger.showToast = function showToast(msg){
  var root = document.getElementById("toastRoot");
  var el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  root.innerHTML = "";
  root.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2600);
};
