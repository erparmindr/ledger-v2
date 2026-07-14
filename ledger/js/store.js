window.Ledger = window.Ledger || {};

window.Ledger.STORAGE_KEY = "ledger_app_v1";
window.Ledger.DB = null;
window.Ledger.currentPage = "overview";
window.Ledger.currentTheme = "dark";

window.Ledger.defaultCategories = function() {
  var uid = window.Ledger.uid;
  return [
    {id:uid(), name:"Food", type:"expense", subs:[]},
    {id:uid(), name:"Groceries", type:"expense", subs:[]},
    {id:uid(), name:"Car", type:"expense", subs:[{id:uid(), name:"Gas"},{id:uid(), name:"Auto insurance"},{id:uid(), name:"Maintenance"}]},
    {id:uid(), name:"Housing", type:"expense", subs:[]},
    {id:uid(), name:"Utilities", type:"expense", subs:[]},
    {id:uid(), name:"Health", type:"expense", subs:[]},
    {id:uid(), name:"Shopping", type:"expense", subs:[]},
    {id:uid(), name:"Entertainment", type:"expense", subs:[]},
    {id:uid(), name:"Travel", type:"expense", subs:[]},
    {id:uid(), name:"Loaned Out", type:"expense", subs:[]},
    {id:uid(), name:"Other", type:"expense", subs:[]},
    {id:uid(), name:"Salary", type:"income", subs:[]},
    {id:uid(), name:"Interest", type:"income", subs:[]},
    {id:uid(), name:"Cashback / Rewards", type:"income", subs:[]},
    {id:uid(), name:"Gift", type:"income", subs:[]},
    {id:uid(), name:"Loan Repayment", type:"income", subs:[]},
    {id:uid(), name:"Other Income", type:"income", subs:[]}
  ];
};

window.Ledger.defaultData = function() {
  var uid = window.Ledger.uid;
  return {
    accounts:[
      {id:uid(), name:"Checking", type:"checking", currency:"USD", openingBalance:0, archived:false, created:Date.now()},
      {id:uid(), name:"Cash", type:"cash", currency:"USD", openingBalance:0, archived:false, created:Date.now()}
    ],
    people:[],
    transactions:[],
    categories:window.Ledger.defaultCategories(),
    recurring:[],
    importMappings:{},
    debtItems:[],
    categoryLearning:{}
  };
};

window.Ledger.loadData = function() {
  var uid = window.Ledger.uid;
  var pad2 = window.Ledger.pad2;
  try{
    var raw = localStorage.getItem(window.Ledger.STORAGE_KEY);
    if(!raw) return window.Ledger.defaultData();
    var parsed = JSON.parse(raw);
    var d = window.Ledger.defaultData();
    var categories = parsed.categories || d.categories;
    categories = categories.map(function(c){
      if(!c.type) c.type = "expense";
      return c;
    });

    var recurring = parsed.recurring || [];
    recurring = recurring.map(function(r){
      if(!r.frequency){
        r.frequency = "monthly";
        var now = new Date();
        var day = r.day || 1;
        var y = now.getFullYear(), m = now.getMonth();
        var candidateDay = Math.min(day, new Date(y, m+1, 0).getDate());
        r.startDate = y + "-" + pad2(m+1) + "-" + pad2(candidateDay);
      }
      return r;
    });

    return {
      accounts: parsed.accounts || d.accounts,
      people: parsed.people || [],
      transactions: parsed.transactions || [],
      categories: categories,
      recurring: recurring,
      importMappings: parsed.importMappings || {},
      debtItems: parsed.debtItems || [],
      categoryLearning: parsed.categoryLearning || {}
    };
  }catch(e){
    console.error("Load failed, using defaults", e);
    return window.Ledger.defaultData();
  }
};

window.Ledger.saveData = function() {
  try{
    localStorage.setItem(window.Ledger.STORAGE_KEY, JSON.stringify(window.Ledger.DB));
  }catch(e){
    console.error("Save failed", e);
    window.Ledger.showToast("Could not save — storage may be full");
  }
};

window.Ledger.DB = window.Ledger.loadData();
