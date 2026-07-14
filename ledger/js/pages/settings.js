window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderSettingsPage = function(){
  function renderCatGroup(forType){
    var cats = window.Ledger.DB.categories.filter(function(c){ return c.type === forType; });
    if(cats.length === 0){
      return '<div class="faint" style="font-size:12.5px; padding:8px 0;">No categories yet.</div>';
    }
    return cats.map(function(c){
      var subsHtml = c.subs.map(function(s){
        return '<div class="subcat-row"><span>' + window.Ledger.escapeHtml(s.name) + '</span>'
          + '<span><button class="icon-btn" data-rename-sub="' + c.id + '|' + s.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
          + '<button class="icon-btn danger" data-del-sub="' + c.id + '|' + s.id + '" title="Delete" aria-label="Delete">&times;</button></span></div>';
      }).join("");
      return '<div class="category-row" style="flex-direction:column; align-items:stretch;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center;">'
        + '  <span style="font-weight:700;">' + window.Ledger.escapeHtml(c.name) + '</span>'
        + '  <span>'
        + '    <button class="icon-btn" data-add-sub="' + c.id + '" title="Add subcategory" aria-label="Add subcategory">+ sub</button>'
        + '    <button class="icon-btn" data-rename-cat="' + c.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
        + '    <button class="icon-btn danger" data-del-cat="' + c.id + '" title="Delete" aria-label="Delete">&times;</button>'
        + '  </span>'
        + '</div>'
        + (subsHtml ? '<div class="subcat-list">' + subsHtml + '</div>' : '')
        + '</div>';
    }).join("");
  }

  return ''
    + '<div class="card card-pad">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Expense categories</h2>'
    + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shown when logging an expense.</p>'
    + '  <div>' + renderCatGroup("expense") + '</div>'
    + '  <div class="inline-add"><input type="text" id="newCatNameExpense" placeholder="New expense category"><button class="btn btn-sm" id="addCatBtnExpense">Add</button></div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Income categories</h2>'
    + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shown when logging income.</p>'
    + '  <div>' + renderCatGroup("income") + '</div>'
    + '  <div class="inline-add"><input type="text" id="newCatNameIncome" placeholder="New income category"><button class="btn btn-sm" id="addCatBtnIncome">Add</button></div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Backup &amp; restore</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Export everything (accounts, people, transactions, categories, recurring items) into one file. Use it to move your data to another device or browser, or just keep a safety copy.</p>'
    + '  <div style="display:flex; gap:10px; flex-wrap:wrap;">'
    + '    <button class="btn btn-primary btn-sm" id="exportBackupBtn">Export full backup</button>'
    + '    <button class="btn btn-sm" id="importBackupBtn">Restore from backup</button>'
    + '    <input type="file" id="importBackupFile" accept="application/json" style="display:none;">'
    + '  </div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Import bank statement (CSV)</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Upload a CSV exported from your bank. You\'ll map which column is which before anything is imported.</p>'
    + '  <button class="btn btn-sm" id="importCsvBtn">Choose CSV file</button>'
    + '  <input type="file" id="importCsvFile" accept=".csv" style="display:none;">'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Import from PDF statement</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Open your PDF statement, select and copy the transaction text, then paste it in. Works across different banks &mdash; you review everything before it\'s imported.</p>'
    + '  <button class="btn btn-sm" id="importStatementBtn">Paste statement text</button>'
    + '</div>'

    + '<div class="card card-pad section-gap" style="border-color:var(--clay-soft);">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px; color:var(--clay);">Reset all data</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Wipes all transactions, accounts, people, categories and recurring items. Use this to start fresh when testing. <strong>Cannot be undone</strong> unless you have a backup.</p>'
    + '  <button class="btn btn-danger btn-sm" id="resetAllBtn">Clear all data</button>'
    + '</div>';
};
