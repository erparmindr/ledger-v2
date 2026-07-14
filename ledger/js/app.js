window.Ledger = window.Ledger || {};

/* ============================================================
   NAVIGATION
   ============================================================ */
window.Ledger.NAV_ITEMS = [
  {id:"overview", label:"Overview", ic:"layout-dashboard"},
  {id:"register", label:"Register", ic:"list"},
  {id:"accounts", label:"Accounts", ic:"wallet"},
  {id:"people", label:"People", ic:"users"},
  {id:"reports", label:"Reports", ic:"pie-chart"},
  {id:"recurring", label:"Recurring", ic:"repeat"},
  {id:"settings", label:"Settings", ic:"settings"}
];

window.Ledger.renderNav = function(){
  var nav = document.getElementById("navList");
  nav.innerHTML = window.Ledger.NAV_ITEMS.map(function(item){
    return '<button class="nav-item ' + (window.Ledger.currentPage===item.id?'active':'') + '" data-nav="' + item.id + '">' +
      '<span class="ic"><i data-lucide="' + item.ic + '"></i></span>' + item.label + '</button>';
  }).join("");
  window.Ledger.refreshIcons();
  Array.prototype.forEach.call(nav.querySelectorAll("[data-nav]"), function(btn){
    btn.addEventListener("click", function(){
      window.Ledger.navigateTo(btn.getAttribute("data-nav"));
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("sidebarBackdrop").classList.remove("show");
    });
  });
  window.Ledger.renderSidebarBalance();
};

window.Ledger.renderSidebarBalance = function(){
  var el = document.getElementById("sidebarBalance");
  if(!el) return;
  var accs = window.Ledger.activeAccounts();
  if(accs.length === 0){
    el.innerHTML = '<div class="sb-lbl">Total balance</div><div class="sb-val faint" style="font-size:14px;">No accounts yet</div>';
    return;
  }
  var byCurrency = {};
  accs.forEach(function(a){
    byCurrency[a.currency] = (byCurrency[a.currency] || 0) + window.Ledger.accountBalance(a.id);
  });
  var primaryCur = Object.keys(byCurrency)[0];
  var total = byCurrency[primaryCur];

  var thisMonth = window.Ledger.monthKeyOf(window.Ledger.todayISO());
  var income = 0, expense = 0;
  window.Ledger.DB.transactions.forEach(function(t){
    if(window.Ledger.monthKeyOf(t.date) !== thisMonth) return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(cur !== primaryCur) return;
    if(t.type === "income") income += t.amount;
    if(t.type === "expense") expense += t.amount;
  });
  var net = income - expense;
  var extraCurCount = Object.keys(byCurrency).length - 1;

  el.innerHTML = ''
    + '<div class="sb-lbl">Total balance</div>'
    + '<div class="sb-val">' + window.Ledger.fmtMoney(total, primaryCur) + '</div>'
    + (extraCurCount > 0 ? '<div class="faint" style="font-size:10.5px; margin-top:3px;">+' + extraCurCount + ' other currenc' + (extraCurCount===1?'y':'ies') + '</div>' : '')
    + '<div class="sb-sub"><span>Net this month</span><span class="sb-net-val ' + (net>=0?'pos':'neg') + '">' + (net>=0?'+':'') + window.Ledger.fmtMoney(net, primaryCur) + '</span></div>';
};

window.Ledger.navigateTo = function(page){
  window.Ledger.currentPage = page;
  document.getElementById("pageTitle").textContent = window.Ledger.NAV_ITEMS.find(function(n){ return n.id===page; }).label;
  document.getElementById("globalSearchWrap").style.display = (page === "register") ? "flex" : "none";
  window.Ledger.renderNav();
  window.Ledger.renderPage();
};

/* ============================================================
   PAGE ROUTER
   ============================================================ */
window.Ledger.renderPage = function(){
  var c = document.getElementById("pageContent");
  if(window.Ledger.currentPage === "overview") c.innerHTML = window.Ledger.pages.renderOverviewPage();
  else if(window.Ledger.currentPage === "register") c.innerHTML = window.Ledger.pages.renderRegisterPage();
  else if(window.Ledger.currentPage === "accounts") c.innerHTML = window.Ledger.pages.renderAccountsPage();
  else if(window.Ledger.currentPage === "people") c.innerHTML = window.Ledger.pages.renderPeoplePage();
  else if(window.Ledger.currentPage === "reports") c.innerHTML = window.Ledger.pages.renderReportsPage();
  else if(window.Ledger.currentPage === "recurring") c.innerHTML = window.Ledger.pages.renderRecurringPage();
  else if(window.Ledger.currentPage === "settings") c.innerHTML = window.Ledger.pages.renderSettingsPage();
  window.Ledger.wirePageEvents();
  window.Ledger.refreshIcons();
};

/* ============================================================
   EVENT WIRING (per-page, called after every render)
   ============================================================ */
window.Ledger.wirePageEvents = function(){
  document.getElementById("newTxBtn").onclick = function(){ window.Ledger.openTxModal(null); };

  if(window.Ledger.currentPage === "overview"){
    var navLink = document.querySelector("[data-nav-link]");
    if(navLink) navLink.addEventListener("click", function(){ window.Ledger.navigateTo(navLink.getAttribute("data-nav-link")); });
    window.Ledger.wireTxRowActions();
  }

  if(window.Ledger.currentPage === "register"){
    window.Ledger.wireTxRowActions();
    ["fAccount","fCurrency","fCategory","fSubcategory","fType","fDatePreset"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("change", function(){
        window.Ledger.registerFilters.account = document.getElementById("fAccount").value;
        window.Ledger.registerFilters.currency = document.getElementById("fCurrency").value;
        window.Ledger.registerFilters.category = document.getElementById("fCategory").value;
        window.Ledger.registerFilters.subcategory = document.getElementById("fSubcategory").value;
        window.Ledger.registerFilters.type = document.getElementById("fType").value;
        window.Ledger.registerFilters.datePreset = document.getElementById("fDatePreset").value;
        if(id === "fCategory") window.Ledger.registerFilters.subcategory = "all";
        window.Ledger.renderPage();
      });
    });
    var dFrom = document.getElementById("fDateFrom"), dTo = document.getElementById("fDateTo");
    if(dFrom) dFrom.addEventListener("change", function(){ window.Ledger.registerFilters.dateFrom = dFrom.value; window.Ledger.renderPage(); });
    if(dTo) dTo.addEventListener("change", function(){ window.Ledger.registerFilters.dateTo = dTo.value; window.Ledger.renderPage(); });
    var exportBtn = document.getElementById("exportCsvBtn");
    if(exportBtn) exportBtn.addEventListener("click", window.Ledger.exportCsv);
  }

  if(window.Ledger.currentPage === "accounts"){
    document.getElementById("addAcctBtn").addEventListener("click", function(){ window.Ledger.openAccountModal(null); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-edit-acct]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.openAccountModal(window.Ledger.findAccount(b.getAttribute("data-edit-acct"))); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-acct]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-acct");
        var used = window.Ledger.DB.transactions.some(function(t){ return t.account===id || (t.fromType==="account"&&t.fromId===id) || (t.toType==="account"&&t.toId===id); });
        if(used){
          window.Ledger.openConfirmModal("Delete account?", "This account has transactions linked to it. Deleting it will not delete those transactions, but they'll show as referencing a missing account. Continue?", function(){
            window.Ledger.DB.accounts = window.Ledger.DB.accounts.filter(function(a){ return a.id!==id; }); window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Account deleted");
          });
        } else {
          window.Ledger.DB.accounts = window.Ledger.DB.accounts.filter(function(a){ return a.id!==id; }); window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Account deleted");
        }
      });
    });
  }

  if(window.Ledger.currentPage === "people"){
    document.getElementById("addPersonBtn").addEventListener("click", function(){ window.Ledger.openPersonModal(null); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-edit-person]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.openPersonModal(window.Ledger.findPerson(b.getAttribute("data-edit-person"))); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-person]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-person");
        window.Ledger.openConfirmModal("Delete person?", "Existing transfers referencing them will remain but show as a missing person. Continue?", function(){
          window.Ledger.DB.people = window.Ledger.DB.people.filter(function(p){ return p.id!==id; }); window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Person deleted");
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-mark-paid]"), function(b){
      b.addEventListener("click", function(){
        var debtId = b.getAttribute("data-mark-paid");
        var d = window.Ledger.DB.debtItems.find(function(x){ return x.id === debtId; });
        if(!d) return;
        window.Ledger.openMarkPaidModal(d);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".assign-pending-sel"), function(sel){
      sel.addEventListener("change", function(){
        var debtId = sel.getAttribute("data-debt-id");
        var personId = sel.value;
        if(!personId) return;
        var d = window.Ledger.DB.debtItems.find(function(x){ return x.id === debtId; });
        if(d){
          d.personId = personId;
          d.status = "open";
          window.Ledger.saveData();
          window.Ledger.renderPage();
          window.Ledger.showToast("Assigned to " + ((window.Ledger.findPerson(personId)||{}).name||"person"));
        }
      });
    });
  }

  if(window.Ledger.currentPage === "reports"){
    var mp = document.getElementById("monthPicker");
    if(mp) mp.addEventListener("change", function(){ window.Ledger.reportState.month = mp.value; window.Ledger.renderPage(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-chartmode]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.reportState.chartMode = b.getAttribute("data-chartmode"); window.Ledger.renderPage(); });
    });
    var dlBackup = document.getElementById("downloadBackupBtn");
    if(dlBackup) dlBackup.addEventListener("click", window.Ledger.exportBackup);
  }

  if(window.Ledger.currentPage === "recurring"){
    document.getElementById("addRecurringBtn").addEventListener("click", function(){
      var name = document.getElementById("rName").value.trim();
      var amount = parseFloat(document.getElementById("rAmount").value);
      var frequency = document.getElementById("rFrequency").value;
      var startDate = document.getElementById("rStartDate").value;
      var type = document.getElementById("rType").value;
      var account = document.getElementById("rAccount").value;
      if(!name || !amount || amount<=0 || !startDate || !account){ window.Ledger.showToast("Fill in all fields"); return; }
      window.Ledger.DB.recurring.push({ id:window.Ledger.uid(), name:name, amount:amount, frequency:frequency, startDate:startDate, type:type, account:account });
      window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Recurring item added");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-confirm-recurring]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-confirm-recurring");
        var r = window.Ledger.DB.recurring.find(function(x){ return x.id===id; });
        if(!r) return;
        var acc = window.Ledger.findAccount(r.account);
        window.Ledger.DB.transactions.push({
          id:window.Ledger.uid(), type:r.type, date:window.Ledger.todayISO(), amount:r.amount, desc:r.name,
          notes:"Posted from recurring item", account:r.account, category:"", subcategory:"", created:Date.now()
        });
        if(r.frequency === "weekly" || r.frequency === "biweekly"){
          var step = r.frequency === "weekly" ? 7 : 14;
          var d = new Date(r.startDate + "T00:00:00");
          while(d <= new Date(window.Ledger.todayISO()+"T00:00:00")){ d.setDate(d.getDate() + step); }
          r.startDate = window.Ledger.todayISOFromDate(d);
        } else {
          var d2 = new Date(r.startDate + "T00:00:00");
          d2.setMonth(d2.getMonth() + 1);
          r.startDate = window.Ledger.todayISOFromDate(d2);
        }
        window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast(r.name + " posted to " + (acc?acc.name:"account"));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-recurring]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-recurring");
        window.Ledger.DB.recurring = window.Ledger.DB.recurring.filter(function(r){ return r.id!==id; }); window.Ledger.saveData(); window.Ledger.renderPage();
      });
    });
  }

  if(window.Ledger.currentPage === "settings"){
    document.getElementById("addCatBtnExpense").addEventListener("click", function(){
      var input = document.getElementById("newCatNameExpense");
      var name = input.value.trim();
      if(!name){ window.Ledger.showToast("Enter a category name"); return; }
      window.Ledger.DB.categories.push({ id:window.Ledger.uid(), name:name, type:"expense", subs:[] });
      window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Expense category added");
    });
    document.getElementById("addCatBtnIncome").addEventListener("click", function(){
      var input = document.getElementById("newCatNameIncome");
      var name = input.value.trim();
      if(!name){ window.Ledger.showToast("Enter a category name"); return; }
      window.Ledger.DB.categories.push({ id:window.Ledger.uid(), name:name, type:"income", subs:[] });
      window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast("Income category added");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-rename-cat]"), function(b){
      b.addEventListener("click", function(){
        var c = window.Ledger.findCategory(b.getAttribute("data-rename-cat"));
        window.Ledger.openTextPromptModal("Rename category", "Category name", c.name, function(v){ c.name=v; window.Ledger.saveData(); window.Ledger.renderPage(); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-cat]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-cat");
        window.Ledger.openConfirmModal("Delete category?", "Transactions using this category will keep their data but show as uncategorized. Continue?", function(){
          window.Ledger.DB.categories = window.Ledger.DB.categories.filter(function(c){ return c.id!==id; }); window.Ledger.saveData(); window.Ledger.renderPage();
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-add-sub]"), function(b){
      b.addEventListener("click", function(){
        var c = window.Ledger.findCategory(b.getAttribute("data-add-sub"));
        window.Ledger.openTextPromptModal("Add subcategory to " + c.name, "Subcategory name", "", function(v){
          c.subs.push({ id:window.Ledger.uid(), name:v }); window.Ledger.saveData(); window.Ledger.renderPage();
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-rename-sub]"), function(b){
      b.addEventListener("click", function(){
        var parts = b.getAttribute("data-rename-sub").split("|");
        var c = window.Ledger.findCategory(parts[0]); var s = c.subs.find(function(x){return x.id===parts[1];});
        window.Ledger.openTextPromptModal("Rename subcategory", "Subcategory name", s.name, function(v){ s.name=v; window.Ledger.saveData(); window.Ledger.renderPage(); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-sub]"), function(b){
      b.addEventListener("click", function(){
        var parts = b.getAttribute("data-del-sub").split("|");
        var c = window.Ledger.findCategory(parts[0]);
        c.subs = c.subs.filter(function(x){ return x.id!==parts[1]; });
        window.Ledger.saveData(); window.Ledger.renderPage();
      });
    });

    document.getElementById("exportBackupBtn").addEventListener("click", window.Ledger.exportBackup);
    document.getElementById("importBackupBtn").addEventListener("click", function(){ document.getElementById("importBackupFile").click(); });
    document.getElementById("importBackupFile").addEventListener("change", function(e){
      if(e.target.files[0]) window.Ledger.importBackupFile(e.target.files[0]);
      e.target.value = "";
    });
    document.getElementById("importCsvBtn").addEventListener("click", function(){ document.getElementById("importCsvFile").click(); });
    document.getElementById("importCsvFile").addEventListener("change", function(e){
      if(e.target.files[0]) window.Ledger.openCsvImportModal(e.target.files[0]);
      e.target.value = "";
    });
    document.getElementById("importStatementBtn").addEventListener("click", function(){ window.Ledger.openStatementPasteModal(); });
    document.getElementById("resetAllBtn").addEventListener("click", function(){
      window.Ledger.openConfirmModal(
        "Reset all data?",
        "This will permanently delete all accounts, transactions, people, categories and recurring items from this browser. Export a backup first if you want to keep anything. This cannot be undone.",
        function(){
          var fresh = window.Ledger.defaultData();
          window.Ledger.DB.accounts = fresh.accounts;
          window.Ledger.DB.people = fresh.people;
          window.Ledger.DB.transactions = fresh.transactions;
          window.Ledger.DB.categories = fresh.categories;
          window.Ledger.DB.recurring = fresh.recurring;
          window.Ledger.DB.importMappings = fresh.importMappings;
          window.Ledger.saveData();
          window.Ledger.navigateTo("overview");
          window.Ledger.showToast("All data cleared — fresh start");
        }
      );
    });
  }
};

window.Ledger.wireTxRowActions = function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-tx]"), function(b){
    b.addEventListener("click", function(){
      var t = window.Ledger.DB.transactions.find(function(x){ return x.id === b.getAttribute("data-edit-tx"); });
      if(t) window.Ledger.openTxModal(t);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-tx]"), function(b){
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-del-tx");
      var t = window.Ledger.DB.transactions.find(function(x){ return x.id === id; });
      var isLinked = t && t.linkId;
      var msg = isLinked
        ? "This is one half of a cross-currency transfer. Deleting it will remove both linked entries. This can't be undone."
        : "This can't be undone.";
      window.Ledger.openConfirmModal("Delete transaction?", msg, function(){
        if(isLinked){
          window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.linkId !== t.linkId; });
        } else {
          window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.id!==id; });
        }
        window.Ledger.saveData(); window.Ledger.renderPage(); window.Ledger.showToast(isLinked ? "Both linked entries deleted" : "Transaction deleted");
      });
    });
  });
};

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
document.getElementById("globalSearch") && document.getElementById("globalSearch").addEventListener("input", function(e){
  window.Ledger.registerFilters.search = e.target.value;
  window.Ledger.renderPage();
});

/* ============================================================
   INIT
   ============================================================ */
window.Ledger.__LEDGER_INIT__ = function(){
  window.Ledger.applyTheme(window.Ledger.currentTheme);
  window.Ledger.renderNav();
  window.Ledger.renderPage();
};

window.Ledger.applyTheme = function(t){
  window.Ledger.currentTheme = t;
  document.body.setAttribute("data-theme", t);
  Array.prototype.forEach.call(document.querySelectorAll("[data-theme-btn]"), function(b){
    b.classList.toggle("active", b.getAttribute("data-theme-btn") === t);
  });
};

document.addEventListener("DOMContentLoaded", function(){
  document.getElementById("hamburgerBtn").addEventListener("click", function(){
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarBackdrop").classList.add("show");
  });
  document.getElementById("sidebarBackdrop").addEventListener("click", function(){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarBackdrop").classList.remove("show");
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-theme-btn]"), function(b){
    b.addEventListener("click", function(){ window.Ledger.applyTheme(b.getAttribute("data-theme-btn")); });
  });

  window.Ledger.__LEDGER_INIT__();

  if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("./sw.js").catch(function(err){
        console.warn("Service worker registration failed:", err);
      });
    });
  }
});
