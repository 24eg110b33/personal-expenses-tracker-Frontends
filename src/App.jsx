import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, Wallet, Plus, Trash2, RefreshCw,
  CircleDollarSign, Utensils, CarFront, ShoppingBag, GraduationCap, Receipt,
  Clapperboard, HeartPulse, Shapes, CalendarDays, Search, CheckCircle2,
  AlertCircle, LoaderCircle, TrendingUp, PiggyBank, Menu, X
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Entertainment', 'Health', 'Other'];
const CATEGORY_ICONS = {
  Food: Utensils, Travel: CarFront, Shopping: ShoppingBag, Education: GraduationCap,
  Bills: Receipt, Entertainment: Clapperboard, Health: HeartPulse, Other: Shapes
};
const CATEGORY_COLORS = {
  Food: 'orange', Travel: 'blue', Shopping: 'pink', Education: 'purple',
  Bills: 'yellow', Entertainment: 'violet', Health: 'green', Other: 'slate'
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function dateLabel(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, transactionCount: 0 });
  const [health, setHealth] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [form, setForm] = useState({
    type: 'expense', amount: '', date: today(), category: 'Food', description: ''
  });

  const request = useCallback(async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
    } catch {
      throw new Error('Cannot connect to the backend. Check that the API server is running and VITE_API_URL is correct.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, totals, status] = await Promise.all([
        request('/transactions'),
        request('/summary'),
        request('/health')
      ]);
      setTransactions(items.transactions || []);
      setSummary(totals);
      setHealth(status.status === 'ok' ? 'online' : 'offline');
    } catch (error) {
      setHealth('offline');
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { refreshData(); }, [refreshData]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const visibleTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesType = filter === 'All' || item.type === filter.toLowerCase();
      const matchesSearch = !term || `${item.description} ${item.category} ${item.type}`.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [transactions, filter, search]);

  async function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: 'error', text: 'Enter an amount greater than zero.' });
      return;
    }
    if (!form.date) {
      setNotice({ type: 'error', text: 'Please select a date.' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await request('/transactions', {
        method: 'POST',
        body: JSON.stringify({ ...form, amount })
      });
      setTransactions((current) => [result.transaction, ...current]);
      const totals = await request('/summary');
      setSummary(totals);
      setForm((current) => ({ ...current, amount: '', description: '' }));
      setNotice({ type: 'success', text: `${form.type === 'income' ? 'Income' : 'Expense'} added successfully.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction? This action cannot be undone.')) return;
    try {
      await request(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setTransactions((current) => current.filter((item) => item.id !== id));
      setSummary(await request('/summary'));
      setNotice({ type: 'success', text: 'Transaction deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    }
  }

  const categorySummary = useMemo(() => {
    const totals = {};
    transactions.filter((item) => item.type === 'expense').forEach((item) => {
      totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [transactions]);
  const expenseMax = Math.max(1, ...categorySummary.map((entry) => entry[1]));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Wallet size={23} strokeWidth={2.4} /></div>
          <div><strong>Pennywise</strong><span>PERSONAL FINANCE</span></div>
          <button className="mobile-close icon-button" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={20} /></button>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          <a className="nav-link active" href="#dashboard" onClick={() => setMobileNav(false)}><Activity size={18} /> Dashboard</a>
          <a className="nav-link" href="#transactions" onClick={() => setMobileNav(false)}><Receipt size={18} /> Transactions</a>
          <a className="nav-link" href="#insights" onClick={() => setMobileNav(false)}><TrendingUp size={18} /> Spending insights</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card">
            <div className="tip-icon"><PiggyBank size={20} /></div>
            <strong>Small steps add up.</strong>
            <p>Track every rupee today to make smarter choices tomorrow.</p>
          </div>
          <div className="api-status">
            <span className={`status-dot ${health === 'online' ? 'is-online' : health === 'checking' ? 'is-checking' : 'is-offline'}`} />
            <span>Backend {health === 'online' ? 'connected' : health === 'checking' ? 'connecting…' : 'unavailable'}</span>
            <button className="icon-button status-refresh" onClick={refreshData} title="Reconnect to backend" aria-label="Reconnect to backend"><RefreshCw size={14} /></button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-content" id="dashboard">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={22} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Dashboard</strong></div>
          <div className="topbar-right"><div className="today-chip"><CalendarDays size={15} /> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div><div className="avatar">R</div></div>
        </header>

        <section className="page-heading">
          <div><div className="eyebrow">YOUR MONEY, IN FOCUS</div><h1>Good money habits start here<span>.</span></h1><p>A clear picture of your income, spending, and what you have left.</p></div>
          <button className="primary-button heading-action" onClick={() => document.getElementById('add-transaction')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Plus size={18} /> Add transaction</button>
        </section>

        {notice && <div className={`notice ${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{notice.text}</span><button className="notice-close" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16} /></button></div>}

        <section className="stats-grid" aria-label="Financial summary">
          <article className="stat-card balance-card"><div className="stat-top"><span className="stat-label">Available balance</span><span className="stat-icon balance-icon"><Wallet size={19} /></span></div><div className="stat-value">{money(summary.balance)}</div><div className="stat-foot"><span className="trend-pill"><TrendingUp size={13} /> Your money snapshot</span><span className="muted">All time</span></div><div className="balance-decoration" /></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">Total income</span><span className="stat-icon income-icon"><ArrowDownLeft size={19} /></span></div><div className="stat-value">{money(summary.income)}</div><div className="stat-foot"><span className="positive-text">Money in</span><span className="muted">All time</span></div></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">Total expenses</span><span className="stat-icon expense-icon"><ArrowUpRight size={19} /></span></div><div className="stat-value">{money(summary.expenses)}</div><div className="stat-foot"><span className="negative-text">Money out</span><span className="muted">All time</span></div></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">Transactions</span><span className="stat-icon count-icon"><CircleDollarSign size={19} /></span></div><div className="stat-value">{summary.transactionCount ?? transactions.length}</div><div className="stat-foot"><span className="positive-text">Activity tracked</span><span className="muted">All time</span></div></article>
        </section>

        <section className="content-grid">
          <article className="panel add-panel" id="add-transaction">
            <div className="panel-heading"><div><span className="section-kicker">RECORD ACTIVITY</span><h2>Add a transaction</h2></div><span className="heading-icon"><Plus size={18} /></span></div>
            <div className="type-switch" role="group" aria-label="Transaction type">
              <button className={form.type === 'expense' ? 'selected expense-selected' : ''} onClick={() => setForm({ ...form, type: 'expense' })}><ArrowUpRight size={16} /> Expense</button>
              <button className={form.type === 'income' ? 'selected income-selected' : ''} onClick={() => setForm({ ...form, type: 'income' })}><ArrowDownLeft size={16} /> Income</button>
            </div>
            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="amount">Amount <span>*</span></label>
              <div className="amount-input"><span>₹</span><input id="amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="form-row">
                <div className="field"><label className="field-label" htmlFor="date">Date <span>*</span></label><input id="date" type="date" value={form.date} max="2100-12-31" onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                <div className="field"><label className="field-label" htmlFor="category">Category <span>*</span></label><select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
              </div>
              <div className="field description-field"><label className="field-label" htmlFor="description">Description <span className="optional">(optional)</span></label><input id="description" type="text" maxLength="120" placeholder="e.g. Lunch with friends" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <button className="primary-button submit-button" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{submitting ? 'Saving transaction…' : `Add ${form.type}`}</button>
            </form>
            <p className="form-footnote"><span>*</span> Required fields. Data is saved by your backend.</p>
          </article>

          <article className="panel insights-panel" id="insights">
            <div className="panel-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>Spending insights</h2></div><span className="heading-icon insight-heading-icon"><TrendingUp size={18} /></span></div>
            {categorySummary.length ? <div className="category-list">{categorySummary.map(([category, amount]) => {
              const Icon = CATEGORY_ICONS[category] || Shapes;
              return <div className="category-row" key={category}><div className={`category-icon ${CATEGORY_COLORS[category] || 'slate'}`}><Icon size={17} /></div><div className="category-detail"><div className="category-name-row"><span>{category}</span><strong>{money(amount)}</strong></div><div className="progress-track"><div className={`progress-fill ${CATEGORY_COLORS[category] || 'slate'}`} style={{ width: `${Math.max(4, amount / expenseMax * 100)}%` }} /></div></div></div>;
            })}<p className="insight-note">Top categories based on all recorded expenses.</p></div> : <div className="insights-empty"><div className="empty-illustration"><TrendingUp size={28} /></div><strong>Your insights will appear here</strong><p>Add an expense to see which categories take the biggest share.</p></div>}
            <div className="insight-footer"><div className="insight-footer-icon"><CircleDollarSign size={18} /></div><div><strong>Every entry counts</strong><p>Keep your records up to date for a clearer picture.</p></div></div>
          </article>
        </section>

        <section className="panel transactions-panel" id="transactions">
          <div className="transactions-heading"><div><span className="section-kicker">YOUR RECORDS</span><h2>Recent transactions <span className="count-badge">{transactions.length}</span></h2></div><div className="transaction-controls"><div className="search-box"><Search size={16} /><input aria-label="Search transactions" placeholder="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select aria-label="Filter transaction type" className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All</option><option value="income">Income</option><option value="expense">Expense</option></select></div></div>
          <div className="transaction-table-wrap">
            <table className="transaction-table"><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th aria-label="Actions" /></tr></thead>
              <tbody>{loading ? <tr><td colSpan="5"><div className="table-message"><LoaderCircle className="spin" size={22} /> Loading transactions…</div></td></tr> : visibleTransactions.length ? visibleTransactions.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || Shapes;
                return <tr key={item.id}><td><div className="transaction-name"><div className={`transaction-icon ${item.type === 'income' ? 'income-icon' : CATEGORY_COLORS[item.category] || 'slate'}`}>{item.type === 'income' ? <ArrowDownLeft size={18} /> : <Icon size={18} />}</div><div><strong>{item.description || item.category}</strong><span>{item.type === 'income' ? 'Income' : 'Expense'}</span></div></div></td><td><span className={`category-tag ${CATEGORY_COLORS[item.category] || 'slate'}`}>{item.category}</span></td><td className="date-cell">{dateLabel(item.date)}</td><td className={`amount-cell ${item.type === 'income' ? 'income-amount' : 'expense-amount'}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</td><td><button className="delete-button" title="Delete transaction" aria-label={`Delete ${item.description || item.category}`} onClick={() => deleteTransaction(item.id)}><Trash2 size={16} /></button></td></tr>;
              }) : <tr><td colSpan="5"><div className="empty-state"><div className="empty-illustration"><Receipt size={27} /></div><strong>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</strong><p>{transactions.length ? 'Try another search term or filter.' : 'Your money story starts with your first entry. Add an income or expense above.'}</p>{!transactions.length && <button className="text-button" onClick={() => document.getElementById('amount')?.focus()}>Add your first transaction <ArrowUpRight size={15} /></button>}</div></td></tr>}</tbody>
            </table>
          </div>
          <div className="table-footer"><span>Showing {visibleTransactions.length} of {transactions.length} transactions</span><button className="refresh-link" onClick={refreshData}><RefreshCw size={14} /> Refresh data</button></div>
        </section>
        <footer className="app-footer"><span>© {new Date().getFullYear()} Pennywise</span><span>Built for better money habits <span className="footer-heart">♥</span></span></footer>
      </main>
    </div>
  );
}
