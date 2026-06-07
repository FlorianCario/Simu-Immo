import { useEffect, useMemo, useState } from 'react';
import './index.css';

const STORAGE_KEY = 'simu-immo-data';

const STATUS_ORDER = ['todo', 'doing', 'done'];
const STATUS_LABEL = { todo: 'À faire', doing: 'En cours', done: 'Fait' };
const STATUS_CLASS = { todo: 'status-todo', doing: 'status-doing', done: 'status-done' };

const DEFAULT_SCENARIO = (id, label) => ({
  id,
  label,
  prix: 250000,
  apport: 25000,
  taux: 3.5,
  duree: 20,
  assurance: 0.34,
});

const DEFAULT_STEPS = [
  { id: 'epargne', name: 'Épargne cible atteinte', status: 'doing' },
  { id: 'notaire', name: 'Simulation notaire', status: 'todo' },
  { id: 'recherche', name: 'Recherche du bien', status: 'todo' },
  { id: 'offre', name: 'Offre d\'achat', status: 'todo' },
  { id: 'compromis', name: 'Compromis de vente', status: 'todo' },
  { id: 'financement', name: 'Financement / prêt bancaire', status: 'todo' },
  { id: 'signature', name: 'Signature acte authentique', status: 'todo' },
];

const DEFAULT_DATA = {
  scenarios: [
    DEFAULT_SCENARIO('a', 'Scénario A'),
    { ...DEFAULT_SCENARIO('b', 'Scénario B'), apport: 40000, duree: 25 },
    { ...DEFAULT_SCENARIO('c', 'Scénario C'), taux: 4.1, duree: 15 },
  ],
  loyerActuel: 850,
  tracker: {
    steps: DEFAULT_STEPS,
    budgetCible: 275000,
    epargneActuelle: 25000,
    epargneMensuelle: 600,
  },
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DATA,
      ...parsed,
      tracker: { ...DEFAULT_DATA.tracker, ...(parsed.tracker || {}) },
    };
  } catch {
    return DEFAULT_DATA;
  }
}

function formatEUR(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatEUR2(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
}

// Calcule la mensualité, le coût total et le tableau d'amortissement d'un prêt amortissable classique.
function computeLoan({ prix, apport, taux, duree, assurance }) {
  const capital = Math.max(prix - apport, 0);
  const months = Math.round(duree * 12);
  const monthlyRate = taux / 100 / 12;
  const insuranceMonthly = (capital * (assurance / 100)) / 12;

  let principalMonthly;
  if (months <= 0) {
    principalMonthly = 0;
  } else if (monthlyRate === 0) {
    principalMonthly = capital / months;
  } else {
    principalMonthly = (capital * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  const monthlyPayment = principalMonthly + insuranceMonthly;
  const totalPaid = monthlyPayment * months;
  const totalCost = totalPaid - capital;
  const totalInterest = principalMonthly * months - capital;
  const totalInsurance = insuranceMonthly * months;

  const schedule = [];
  let remaining = capital;
  for (let m = 1; m <= months && remaining > 0.01; m += 1) {
    const interest = remaining * monthlyRate;
    let principalPaid = principalMonthly - interest;
    if (principalPaid > remaining) principalPaid = remaining;
    remaining = Math.max(remaining - principalPaid, 0);
    schedule.push({
      month: m,
      payment: principalPaid + interest + insuranceMonthly,
      principal: principalPaid,
      interest,
      insurance: insuranceMonthly,
      remaining,
    });
  }

  return {
    capital,
    months,
    monthlyPayment,
    principalMonthly,
    insuranceMonthly,
    totalPaid,
    totalCost,
    totalInterest,
    totalInsurance,
    schedule,
  };
}

function NumberField({ label, value, onChange, step = 1, min = 0, suffix }) {
  return (
    <div className="field">
      <label>{label}{suffix ? ` (${suffix})` : ''}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

function ScenarioCard({ scenario, onChange, loyerActuel }) {
  const result = useMemo(() => computeLoan(scenario), [scenario]);
  const diffLoyer = result.monthlyPayment - loyerActuel;

  const update = (key) => (value) => onChange({ ...scenario, [key]: value });

  return (
    <div className="card">
      <h2>{scenario.label}</h2>
      <NumberField label="Prix du bien" value={scenario.prix} onChange={update('prix')} step={1000} suffix="€" />
      <NumberField label="Apport personnel" value={scenario.apport} onChange={update('apport')} step={1000} suffix="€" />
      <NumberField label="Taux d'intérêt" value={scenario.taux} onChange={update('taux')} step={0.05} suffix="% / an" />
      <NumberField label="Durée" value={scenario.duree} onChange={update('duree')} step={1} suffix="années" />
      <NumberField label="Assurance emprunteur" value={scenario.assurance} onChange={update('assurance')} step={0.01} suffix="% / an du capital" />

      <h3 style={{ marginTop: 16 }}>Résultats</h3>
      <div className="stat-row">
        <span className="label">Capital emprunté</span>
        <span className="value">{formatEUR(result.capital)}</span>
      </div>
      <div className="stat-row">
        <span className="label">Mensualité (avec assurance)</span>
        <span className="value accent">{formatEUR2(result.monthlyPayment)}</span>
      </div>
      <div className="stat-row">
        <span className="label">Coût total du crédit</span>
        <span className="value orange">{formatEUR(result.totalCost)}</span>
      </div>
      <div className="stat-row">
        <span className="label">— dont intérêts</span>
        <span className="value">{formatEUR(result.totalInterest)}</span>
      </div>
      <div className="stat-row">
        <span className="label">— dont assurance</span>
        <span className="value">{formatEUR(result.totalInsurance)}</span>
      </div>
      <div className="stat-row">
        <span className="label">Coût total (achat)</span>
        <span className="value">{formatEUR(scenario.prix + result.totalCost)}</span>
      </div>
      <div className="stat-row">
        <span className="label">Vs loyer actuel ({formatEUR(loyerActuel)})</span>
        <span className={`value ${diffLoyer > 0 ? 'red' : 'green'}`}>
          {diffLoyer > 0 ? '+' : ''}{formatEUR2(diffLoyer)} / mois
        </span>
      </div>
    </div>
  );
}

function AmortizationTable({ schedule }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? schedule : schedule.slice(0, 12);

  return (
    <div className="card">
      <h2>Tableau d'amortissement — {schedule.length} mensualités</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>Mensualité</th>
              <th>Capital</th>
              <th>Intérêts</th>
              <th>Assurance</th>
              <th>Capital restant dû</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{formatEUR2(row.payment)}</td>
                <td>{formatEUR2(row.principal)}</td>
                <td>{formatEUR2(row.interest)}</td>
                <td>{formatEUR2(row.insurance)}</td>
                <td>{formatEUR2(row.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.length > 12 && (
        <button type="button" className="tab-btn" style={{ marginTop: 12 }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Réduire' : `Afficher les ${schedule.length} mensualités`}
        </button>
      )}
    </div>
  );
}

function SimulateurModule({ scenarios, setScenarios, loyerActuel, setLoyerActuel }) {
  const [focusId, setFocusId] = useState(scenarios[0].id);
  const focusScenario = scenarios.find((s) => s.id === focusId) ?? scenarios[0];
  const focusResult = useMemo(() => computeLoan(focusScenario), [focusScenario]);

  const updateScenario = (updated) => {
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>Comparaison avec un loyer équivalent</h2>
        <div style={{ maxWidth: 280 }}>
          <NumberField label="Loyer mensuel actuel" value={loyerActuel} onChange={setLoyerActuel} step={10} suffix="€" />
        </div>
        <p className="muted">
          La mensualité de chaque scénario est comparée à ce loyer pour évaluer l'écart d'effort financier mensuel.
        </p>
      </div>

      <h3 style={{ margin: '4px 0' }}>Scénarios comparables</h3>
      <div className="scenarios-grid">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} onChange={updateScenario} loyerActuel={loyerActuel} />
        ))}
      </div>

      <div className="card">
        <h2>Tableau d'amortissement détaillé</h2>
        <div className="field" style={{ maxWidth: 280 }}>
          <label>Scénario à détailler</label>
          <select value={focusId} onChange={(e) => setFocusId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <AmortizationTable schedule={focusResult.schedule} />
    </div>
  );
}

function StatusPill({ status, onClick }) {
  return (
    <button type="button" className={`status-pill ${STATUS_CLASS[status]}`} onClick={onClick}>
      {STATUS_LABEL[status]}
    </button>
  );
}

function TrackerModule({ tracker, setTracker }) {
  const { steps, budgetCible, epargneActuelle, epargneMensuelle } = tracker;

  const cycleStatus = (id) => {
    setTracker((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => {
        if (step.id !== id) return step;
        const idx = STATUS_ORDER.indexOf(step.status);
        const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
        return { ...step, status: next };
      }),
    }));
  };

  const updateField = (key) => (value) => setTracker((prev) => ({ ...prev, [key]: value }));

  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    const score = steps.reduce((acc, s) => acc + (s.status === 'done' ? 1 : s.status === 'doing' ? 0.5 : 0), 0);
    return Math.round((score / steps.length) * 100);
  }, [steps]);

  const projection = useMemo(() => {
    const remaining = budgetCible - epargneActuelle;
    if (remaining <= 0) {
      return { reached: true, months: 0, date: new Date() };
    }
    if (epargneMensuelle <= 0) {
      return { reached: false, months: Infinity, date: null };
    }
    const months = Math.ceil(remaining / epargneMensuelle);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return { reached: false, months, date };
  }, [budgetCible, epargneActuelle, epargneMensuelle]);

  const epargnePct = budgetCible > 0 ? Math.min((epargneActuelle / budgetCible) * 100, 100) : 0;

  return (
    <div className="grid">
      <div className="card">
        <h2>Avancement global du projet</h2>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="muted" style={{ marginTop: 8 }}>{progress}% des étapes complétées</p>

        <h3 style={{ marginTop: 18 }}>Étapes du projet</h3>
        <p className="muted" style={{ marginTop: -4, marginBottom: 10 }}>Cliquez sur le statut pour le faire évoluer (à faire → en cours → fait).</p>
        <div className="steps-list">
          {steps.map((step) => (
            <div className="step-row" key={step.id}>
              <span className="step-name">{step.name}</span>
              <StatusPill status={step.status} onClick={() => cycleStatus(step.id)} />
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Budget & épargne</h2>
          <NumberField label="Budget cible (prix + frais)" value={budgetCible} onChange={updateField('budgetCible')} step={1000} suffix="€" />
          <NumberField label="Épargne actuelle" value={epargneActuelle} onChange={updateField('epargneActuelle')} step={500} suffix="€" />
          <NumberField label="Épargne mensuelle prévue" value={epargneMensuelle} onChange={updateField('epargneMensuelle')} step={50} suffix="€ / mois" />

          <div className="progress-bar" style={{ marginTop: 6 }}>
            <div className="progress-bar-fill" style={{ width: `${epargnePct}%` }} />
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {formatEUR(epargneActuelle)} / {formatEUR(budgetCible)} ({epargnePct.toFixed(0)}%)
          </p>
        </div>

        <div className="card">
          <h2>Projection d'atteinte du budget</h2>
          {projection.reached ? (
            <div className="stat-row">
              <span className="label">Statut</span>
              <span className="value green">Budget cible déjà atteint 🎉</span>
            </div>
          ) : projection.months === Infinity ? (
            <div className="stat-row">
              <span className="label">Statut</span>
              <span className="value red">Renseignez une épargne mensuelle pour estimer la date</span>
            </div>
          ) : (
            <>
              <div className="stat-row">
                <span className="label">Montant restant à épargner</span>
                <span className="value">{formatEUR(Math.max(budgetCible - epargneActuelle, 0))}</span>
              </div>
              <div className="stat-row">
                <span className="label">Durée estimée</span>
                <span className="value accent">{projection.months} mois</span>
              </div>
              <div className="stat-row">
                <span className="label">Date d'atteinte estimée</span>
                <span className="value green">
                  {projection.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState('simulateur');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const setScenarios = (updater) => {
    setData((prev) => ({ ...prev, scenarios: typeof updater === 'function' ? updater(prev.scenarios) : updater }));
  };
  const setLoyerActuel = (value) => setData((prev) => ({ ...prev, loyerActuel: value }));
  const setTracker = (updater) => {
    setData((prev) => ({ ...prev, tracker: typeof updater === 'function' ? updater(prev.tracker) : updater }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">🏠 Simu Immo</span>
        <nav className="tabs">
          <button
            type="button"
            className={`tab-btn ${tab === 'simulateur' ? 'active' : ''}`}
            onClick={() => setTab('simulateur')}
          >
            Simulateur d'emprunt
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'tracker' ? 'active' : ''}`}
            onClick={() => setTab('tracker')}
          >
            Tracker de projet
          </button>
        </nav>
      </header>
      <main className="app-body">
        {tab === 'simulateur' ? (
          <SimulateurModule
            scenarios={data.scenarios}
            setScenarios={setScenarios}
            loyerActuel={data.loyerActuel}
            setLoyerActuel={setLoyerActuel}
          />
        ) : (
          <TrackerModule tracker={data.tracker} setTracker={setTracker} />
        )}
      </main>
    </div>
  );
}

export default App;
