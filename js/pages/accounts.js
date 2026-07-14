window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderAccountsPage = function(){
  var DB = window.Ledger.DB;
  var ACCOUNT_TYPES = window.Ledger.ACCOUNT_TYPES;
  var accountBalance = window.Ledger.accountBalance;
  var fmtMoney = window.Ledger.fmtMoney;
  var escapeHtml = window.Ledger.escapeHtml;

  var cards = DB.accounts.map(function(a){
    var bal = accountBalance(a.id);
    var isCredit = a.type === "credit_card";
    var tone = isCredit ? "tone-clay" : "tone-sage";
    var typeLabel = ACCOUNT_TYPES.find(function(t){ return t.id===a.type; }).label;
    return '<div class="acct-card ' + (isCredit?'kind-credit':'') + ' ' + tone + (a.archived?'" style="opacity:.55;':'"') + '>'
      + '<div class="info">'
      + '  <div class="nm">' + escapeHtml(a.name) + ' &middot; ' + a.currency + (a.archived?' &middot; archived':'') + '</div>'
      + '  <div class="bal num ' + (isCredit && bal<0 ? 'neg' : '') + '">' + fmtMoney(bal, a.currency) + '</div>'
      + '</div>'
      + '<div style="text-align:right;">'
      + '  <div class="tag">' + typeLabel + '</div>'
      + '  <div class="acct-ops">'
      + '    <button class="icon-btn" data-edit-acct="' + a.id + '" title="Edit" aria-label="Edit"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
      + '    <button class="icon-btn danger" data-del-acct="' + a.id + '" title="Delete" aria-label="Delete">&times;</button>'
      + '  </div>'
      + '</div>'
      + '</div>';
  }).join("");

  if(DB.accounts.length === 0){
    cards = '<div class="empty-state"><div class="big">No accounts yet</div>Add your first account to get started.</div>';
  }

  return ''
    + '<div class="card card-pad">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
    + '    <h2 style="font-size:16px; font-weight:800; margin:0;">Accounts</h2>'
    + '    <button class="btn btn-primary btn-sm" id="addAcctBtn">+ Add account</button>'
    + '  </div>'
    + '  <div style="display:flex; flex-direction:column; gap:10px;">' + cards + '</div>'
    + '</div>';
};
