/* ============================================================
   BACKUP EXPORT / IMPORT
   ============================================================ */
window.Ledger = window.Ledger || {};

window.Ledger.exportBackup = function(){
  var blob = new Blob([JSON.stringify(window.Ledger.DB, null, 2)], {type:"application/json"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "ledger-backup-" + window.Ledger.todayISO() + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.Ledger.showToast("Backup downloaded");
};

window.Ledger.importBackupFile = function(file){
  var reader = new FileReader();
  reader.onload = function(e){
    try{
      var parsed = JSON.parse(e.target.result);
      if(!parsed.accounts || !parsed.transactions){ window.Ledger.showToast("That doesn't look like a valid backup file"); return; }
      window.Ledger.openConfirmModal("Restore backup?", "This will replace all current data in this browser with the contents of the backup file. This can't be undone. Continue?", function(){
        window.Ledger.DB.accounts = parsed.accounts || [];
        window.Ledger.DB.people = parsed.people || [];
        window.Ledger.DB.transactions = parsed.transactions || [];
        window.Ledger.DB.categories = parsed.categories || window.Ledger.defaultCategories();
        window.Ledger.DB.recurring = parsed.recurring || [];
        window.Ledger.DB.importMappings = parsed.importMappings || {};
        window.Ledger.DB.debtItems = parsed.debtItems || [];
        window.Ledger.DB.categoryLearning = parsed.categoryLearning || {};
        window.Ledger.saveData();
        window.Ledger.showToast("Backup restored");
        window.Ledger.renderPage();
      });
    }catch(err){
      window.Ledger.showToast("Couldn't read that file — is it a valid backup?");
    }
  };
  reader.readAsText(file);
};

window.Ledger.exportCsv = function(){
  var list = window.Ledger.filteredTransactions();
  if(list.length === 0){ window.Ledger.showToast("No transactions to export"); return; }
  var rows = [["Date","Type","Description","Notes","Category","Subcategory","Account/From","To","Amount","Currency"]];
  list.slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).forEach(function(t){
    var cur = "USD", from="", to="";
    if(t.type === "transfer"){
      var fr = window.Ledger.entityRef(t.fromType,t.fromId), toR = window.Ledger.entityRef(t.toType,t.toId);
      from = fr?fr.name:""; to = toR?toR.name:""; cur = fr?fr.currency:"USD";
    } else if(t.linkId){
      // Cross-currency linked transfer pair (stored as expense/income, not "transfer")
      var acc = window.Ledger.findAccount(t.account);
      from = acc?acc.name:""; cur = acc?acc.currency:"USD";
      var otherRow = window.Ledger.DB.transactions.find(function(x){ return x.linkId===t.linkId && x.id!==t.id; });
      var otherAcc = otherRow ? window.Ledger.findAccount(otherRow.account) : null;
      to = otherAcc ? otherAcc.name : "";
    } else {
      var acc2 = window.Ledger.findAccount(t.account);
      from = acc2?acc2.name:""; cur = acc2?acc2.currency:"USD";
    }
    rows.push([t.date, t.linkId ? "transfer (cross-currency)" : t.type, t.desc||"", t.notes||"", t.category?window.Ledger.categoryName(t.category):"", t.subcategory?window.Ledger.subcatName(t.category,t.subcategory):"", from, to, t.amount.toFixed(2), cur]);
  });
  var csv = rows.map(function(r){
    return r.map(function(cell){
      var s = String(cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(",");
  }).join("\n");
  var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "ledger-export-" + window.Ledger.todayISO() + ".csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
