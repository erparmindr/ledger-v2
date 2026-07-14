/* ============================================================
   TRANSACTION ROW RENDERING (shared by overview + register)
   ============================================================ */
window.Ledger = window.Ledger || {};

window.Ledger.renderTxRow = function(t, opts){
  opts = opts || {};
  var bubbleBg, bubbleColor, symbol, currency;
  var isLinkedTransfer = !!t.linkId;
  if(t.type === "expense"){
    var acc = window.Ledger.findAccount(t.account);
    currency = acc ? acc.currency : "USD";
    if(isLinkedTransfer){
      bubbleBg = "var(--brass-soft)"; bubbleColor = "var(--brass)"; symbol = "&#8644;";
    } else {
      bubbleBg = "var(--clay-soft)"; bubbleColor = "var(--clay)"; symbol = "&minus;";
    }
  } else if(t.type === "income"){
    var acc2 = window.Ledger.findAccount(t.account);
    currency = acc2 ? acc2.currency : "USD";
    if(isLinkedTransfer){
      bubbleBg = "var(--brass-soft)"; bubbleColor = "var(--brass)"; symbol = "&#8644;";
    } else {
      bubbleBg = "var(--sage-soft)"; bubbleColor = "var(--sage)"; symbol = "+";
    }
  } else {
    bubbleBg = "var(--brass-soft)"; bubbleColor = "var(--brass)"; symbol = "&#8644;";
    var fromRef = window.Ledger.entityRef(t.fromType, t.fromId);
    currency = fromRef ? fromRef.currency : "USD";
  }

  var dateDisp = new Date(t.date + "T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
  var catLabel = "";
  if(t.categorySplits && t.categorySplits.length){
    catLabel = "split: " + t.categorySplits.map(function(s){ return window.Ledger.categoryName(s.categoryId); }).join(", ");
  } else if(t.category){
    catLabel = window.Ledger.categoryName(t.category);
    if(t.subcategory) catLabel += " &rsaquo; " + window.Ledger.subcatName(t.category, t.subcategory);
  }

  var amtDisp, mainLabel, subLabel;
  if(t.type === "transfer"){
    var fr = window.Ledger.entityRef(t.fromType, t.fromId);
    var to = window.Ledger.entityRef(t.toType, t.toId);
    mainLabel = (t.desc && t.desc.trim()) ? t.desc : "Transfer";
    subLabel = (fr?fr.name:"?") + " &rarr; " + (to?to.name:"?");
    amtDisp = '<span style="color:var(--brass);">' + window.Ledger.fmtMoney(t.amount, currency) + '</span>';
  } else if(isLinkedTransfer){
    mainLabel = t.desc;
    var accName2 = (window.Ledger.findAccount(t.account)||{}).name || "?";
    subLabel = accName2 + ' &middot; <span class="faint">cross-currency transfer</span>';
    amtDisp = '<span style="color:var(--brass);">' + (t.type==="income"?"+":"\u2212") + window.Ledger.fmtMoney(t.amount, currency) + '</span>';
  } else {
    mainLabel = t.desc;
    var accName = (window.Ledger.findAccount(t.account)||{}).name || "?";
    subLabel = accName + (catLabel ? " &middot; " + catLabel : "");
    amtDisp = '<span class="' + (t.type==="income"?"pos":"neg") + '">' + (t.type==="income"?"+":"\u2212") + window.Ledger.fmtMoney(t.amount, currency) + '</span>';
  }

  var runBalHtml = "";
  if(opts.showRunningBalance && opts.runningBalance != null){
    runBalHtml = '<div class="runbal">' + window.Ledger.fmtMoney(opts.runningBalance, currency) + '</div>';
  } else if(opts.showRunningBalance){
    runBalHtml = '<div class="runbal">&mdash;</div>';
  }

  return '<div class="tx-row">'
    + '<div class="tx-tab" style="background:' + bubbleBg + '; color:' + bubbleColor + ';">' + symbol + '</div>'
    + '<div class="main">'
    + '  <div class="desc">' + window.Ledger.escapeHtml(mainLabel) + (t.notes ? '<span class="notes-ic" title="' + window.Ledger.escapeHtml(t.notes) + '"><i data-lucide="sticky-note" style="width:11px;height:11px;vertical-align:-1px;"></i></span>' : '') + '</div>'
    + '  <div class="meta">' + dateDisp + ' &middot; ' + subLabel + '</div>'
    + '</div>'
    + '<div class="amt num">' + amtDisp + '</div>'
    + runBalHtml
    + '<div class="rowactions">'
    + '  <button class="icon-btn" data-edit-tx="' + t.id + '" title="Edit" aria-label="Edit"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
    + '  <button class="icon-btn danger" data-del-tx="' + t.id + '" title="Delete" aria-label="Delete">&times;</button>'
    + '</div>'
    + '</div>';
};
