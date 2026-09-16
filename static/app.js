const { useState, useEffect, useMemo } = React;

// Utility functions
const getRiskColor = (score) => {
  if (score >= 0.65) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500' };
  if (score >= 0.40) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' };
};

const getTypologyBadge = (typology) => {
  if (typology.includes('Hesitancy')) return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'AlertCircle' };
  if (typology.includes('Barrier')) return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'CreditCard' };
  if (typology.includes('Friction')) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'Clock' };
  if (typology.includes('Transition') || typology.includes('Lag')) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'ShieldCheck' };
  if (typology.includes('Sustained')) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'CheckCircle' };
  return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'Info' };
};

function App() {
  const [activeTab, setActiveTab] = useState('cohort'); // 'cohort', 'dossier', 'simulator', 'fhir'
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [patientDossier, setPatientDossier] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch patient list
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient dossier and live analysis when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) return;
    loadPatientDetails(selectedPatientId);
  }, [selectedPatientId]);

  const loadPatientDetails = async (id) => {
    try {
      const [dossierRes, analysisRes] = await Promise.all([
        fetch(`/api/patients/${id}`),
        fetch(`/api/patients/${id}/analysis`)
      ]);
      const dossier = await dossierRes.json();
      const analysis = await analysisRes.json();
      setPatientDossier(dossier);
      setAnalysisData(analysis);
    } catch (err) {
      console.error('Error loading patient details:', err);
    }
  };

  // Filtered patients for cohort view
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesCondition = conditionFilter === 'ALL' || p.primary_condition.toLowerCase().includes(conditionFilter.toLowerCase());
      const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.mrn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCondition && matchesSearch;
    });
  }, [patients, conditionFilter, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Clinical Navigation Bar */}
      <header className="bg-white border-b border-clinical-border sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              ℞
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base text-slate-900 tracking-tight">AdherePulse</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">v1.2 FHIR R4</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Uncertainty-Aware Latent Adherence Inference</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 border-l border-slate-200 pl-6">
            <button
              onClick={() => setActiveTab('cohort')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'cohort'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Cohort Population
            </button>
            <button
              onClick={() => setActiveTab('dossier')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'dossier'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Patient Dossier & Timeline
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'simulator'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              What-If Counterfactuals
            </button>
            <button
              onClick={() => setActiveTab('fhir')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'fhir'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              FHIR R4 Interop
            </button>
          </nav>
        </div>

        {/* Quick Patient Switcher & Clinical Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[11px]">XGBoost Calibrated</span>
          </div>

          <div className="relative">
            <select
              value={selectedPatientId || ''}
              onChange={(e) => {
                setSelectedPatientId(Number(e.target.value));
                if (activeTab === 'cohort') setActiveTab('dossier');
              }}
              className="text-xs bg-slate-50 border border-clinical-border rounded-md px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.mrn}) — {p.primary_condition}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            Loading clinical records and calculating adherence tensors...
          </div>
        ) : (
          <div>
            {activeTab === 'cohort' && (
              <CohortView
                patients={filteredPatients}
                allPatientsCount={patients.length}
                conditionFilter={conditionFilter}
                setConditionFilter={setConditionFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectPatient={(id) => {
                  setSelectedPatientId(id);
                  setActiveTab('dossier');
                }}
              />
            )}

            {activeTab === 'dossier' && (
              <PatientDossierView
                dossier={patientDossier}
                analysis={analysisData}
                onOpenSimulator={() => setActiveTab('simulator')}
                onOpenFHIR={() => setActiveTab('fhir')}
                onReload={() => loadPatientDetails(selectedPatientId)}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulatorView
                patient={patientDossier?.patient}
                analysis={analysisData}
                onInterventionLogged={() => {
                  loadPatientDetails(selectedPatientId);
                  setActiveTab('dossier');
                }}
              />
            )}

            {activeTab === 'fhir' && (
              <FHIRView
                patientId={selectedPatientId}
                patient={patientDossier?.patient}
                onPatientImported={(newId) => {
                  fetchPatients();
                  setSelectedPatientId(newId);
                  setActiveTab('dossier');
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-clinical-border px-6 py-3 bg-white text-[11px] text-slate-500 flex items-center justify-between">
        <div>
          AdherePulse Healthcare Decision Support • Built for Manipal Hackathon 2026 • Signal, Not Verdict Paradigm
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Engine: Latent Multi-Source Fusion • FHIR R4 Compliant
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// 1. COHORT VIEW COMPONENT
// -------------------------------------------------------------
function CohortView({ patients, allPatientsCount, conditionFilter, setConditionFilter, searchQuery, setSearchQuery, onSelectPatient }) {
  // Aggregate metrics
  const highRiskCount = patients.filter(p => (p.risk_score || 0) >= 0.65).length;
  const intermittentCount = patients.filter(p => (p.pattern_type || '').includes('Friction') || (p.pattern_type || '').includes('Hesitancy')).length;
  const suppressedCount = patients.filter(p => (p.pattern_type || '').includes('Transition') || (p.pattern_type || '').includes('Lag')).length;
  const iotCount = patients.filter(p => p.iot_device_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Clinical Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="clinical-card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Monitored Cohort</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{allPatientsCount} <span className="text-xs font-normal text-slate-400">patients</span></div>
          <div className="text-xs text-slate-500 mt-1">Multi-source routine signals fused</div>
        </div>
        <div className="clinical-card p-4">
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">High Adherence Risk</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{highRiskCount} <span className="text-xs font-normal text-slate-400">patients</span></div>
          <div className="text-xs text-rose-600/80 mt-1">Requiring care team attention</div>
        </div>
        <div className="clinical-card p-4">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Intermittent Latent Gaps</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{intermittentCount} <span className="text-xs font-normal text-slate-400">patients</span></div>
          <div className="text-xs text-amber-600/80 mt-1">Distinguished from total abandonment</div>
        </div>
        <div className="clinical-card p-4">
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">False Alarms Suppressed</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{suppressedCount} <span className="text-xs font-normal text-slate-400">patients</span></div>
          <div className="text-xs text-emerald-600/80 mt-1">Prescription titrations recognized</div>
        </div>
      </div>

      {/* Cohort Search & Filter Controls */}
      <div className="clinical-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1">
          <input
            type="text"
            placeholder="Search patient name, MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-clinical-border rounded-md w-72 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-400 mr-1">Condition:</span>
            {['ALL', 'Heart Failure', 'Diabetes', 'Hypertension'].map(cond => (
              <button
                key={cond}
                onClick={() => setConditionFilter(cond)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  conditionFilter === cond
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing {patients.length} matching patients
        </div>
      </div>

      {/* Patient Table */}
      <div className="clinical-card overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-clinical-border text-slate-500 font-medium uppercase tracking-wider">
              <th className="py-3 px-4">Patient & MRN</th>
              <th className="py-3 px-4">Primary Condition</th>
              <th className="py-3 px-4">Latent Risk Score (95% CI)</th>
              <th className="py-3 px-4">Inferred Typology</th>
              <th className="py-3 px-4">180d PDC</th>
              <th className="py-3 px-4">IoT / Telemetry</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map(p => {
              const riskStyles = getRiskColor(p.risk_score || 0.2);
              const typology = getTypologyBadge(p.pattern_type || '');
              const ciLower = Math.round((p.confidence_lower || (p.risk_score - 0.1)) * 100);
              const ciUpper = Math.round((p.confidence_upper || (p.risk_score + 0.1)) * 100);
              const riskPct = Math.round((p.risk_score || 0) * 100);

              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{p.full_name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{p.mrn} • {p.age}y {p.gender}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="font-medium">{p.primary_condition}</span>
                    <div className="text-[11px] text-slate-400">{p.cohort_group}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-48">
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className={`font-semibold ${riskStyles.text}`}>{riskPct}%</span>
                        <span className="font-mono text-slate-400 text-[10px]">CI: [{ciLower}% - {ciUpper}%]</span>
                      </div>
                      <div className="ci-bar-bg w-full">
                        <div
                          className={`h-full ${riskStyles.bar} rounded-full`}
                          style={{ width: `${riskPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`badge-pill border ${typology.bg}`}>
                      {p.pattern_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {Math.round((p.pdc_score || 1) * 100)}%
                  </td>
                  <td className="py-3.5 px-4">
                    {p.iot_device_active ? (
                      <span className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.iot_device_active}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Passive EHR only</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectPatient(p.id)}
                      className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 rounded text-xs font-medium transition"
                    >
                      Dossier →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. PATIENT DOSSIER & LONGITUDINAL TIMELINE
// -------------------------------------------------------------
function PatientDossierView({ dossier, analysis, onOpenSimulator, onOpenFHIR, onReload }) {
  if (!dossier || !analysis) {
    return <div className="text-center py-12 text-slate-500">Loading patient dossier...</div>;
  }

  const { patient, prescriptions, dispenses, vitals, clinical_notes, prediction, interventions } = dossier;
  const { features, inference } = analysis;
  const riskStyles = getRiskColor(inference.risk_score);
  const typology = getTypologyBadge(inference.pattern_type);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Patient Bio & Adherence Banner */}
      <div className="clinical-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-clinical-border">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-slate-900">{patient.full_name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{patient.mrn}</span>
              <span className="badge-pill bg-slate-100 text-slate-700 border border-slate-200">{patient.age}y / {patient.gender}</span>
              {patient.iot_device_active && (
                <span className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {patient.iot_device_active}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Primary Diagnosis: <span className="font-semibold text-slate-700">{patient.primary_condition}</span> • Care Coordinator: {patient.care_coordinator}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSimulator}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
            >
              <span>Test Counterfactual Intervention</span>
            </button>
            <button
              onClick={onOpenFHIR}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition"
            >
              Export FHIR R4
            </button>
          </div>
        </div>

        {/* Inference Signal Banner */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="p-4 rounded-lg bg-slate-50 border border-clinical-border">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Inferred Adherence Risk</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-3xl font-extrabold ${riskStyles.text}`}>
                {Math.round(inference.risk_score * 100)}%
              </span>
              <span className="text-xs font-mono text-slate-500">
                [95% CI: {Math.round(inference.confidence_lower * 100)}% – {Math.round(inference.confidence_upper * 100)}%]
              </span>
            </div>
            <div className="ci-bar-bg w-full mt-2.5">
              <div
                className={`h-full ${riskStyles.bar} rounded-full transition-all duration-500`}
                style={{ width: `${Math.round(inference.risk_score * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0% (Sustained)</span>
              <span>50%</span>
              <span>100% (Critical)</span>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500">Pattern Typology:</span>
              <span className={`badge-pill border text-xs font-semibold ${typology.bg}`}>
                {inference.pattern_type}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">Clinical Signal Rationale: </span>
              {inference.primary_driver}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Multi-Source Triangulation Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pillar 1: Pharmacy Refill Cadence */}
        <div className="clinical-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">1. Refill Gap Cadence</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Claims Data</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">PDC (180 Days):</span>
              <span className="font-mono font-semibold text-slate-800">{Math.round(features.pdc_score * 100)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Mean Refill Delay:</span>
              <span className="font-mono font-semibold text-slate-800">+{features.refill_gap_mean} days</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Gap Variance:</span>
              <span className="font-mono text-slate-800">{features.gap_variance}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Cadence Burstiness:</span>
              <span className="font-mono text-slate-800">{features.burstiness_index}</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Biomarker Volatility */}
        <div className="clinical-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">2. Biomarker Coupling</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">EHR Vitals</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">BP Systolic SD:</span>
              <span className="font-mono font-semibold text-slate-800">{features.vital_volatility_sbp} mmHg</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Gap-Surge Correlation:</span>
              <span className="font-mono font-semibold text-slate-800">{features.vital_gap_correlation}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Recorded Vitals:</span>
              <span className="font-mono text-slate-800">{vitals.length} measurements</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Clinical Notes NLP */}
        <div className="clinical-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">3. Encounter Notes NLP</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Unstructured</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Side Effects Found:</span>
              <span className="font-mono font-semibold text-slate-800">{int(features.side_effect_count)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Access / Copay Barrier:</span>
              <span className="font-semibold text-slate-800">{features.barrier_flag ? 'Flagged' : 'None'}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              {clinical_notes.length > 0 ? `Last noted: ${clinical_notes[0].note_date}` : 'No notes'}
            </div>
          </div>
        </div>

        {/* Pillar 4: IoT / Connected Telemetry */}
        <div className="clinical-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">4. IoT Device Signal</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Sensor Layer</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Hardware Layer:</span>
              <span className="font-medium text-slate-800">{patient.iot_device_active || 'Not Connected'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Bandwidth Precision:</span>
              <span className="font-semibold text-slate-800">{patient.iot_device_active ? 'Tight (±5%)' : 'Standard (±12%)'}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              {patient.iot_device_active ? 'Cap timestamp events synced' : 'Optional tier available'}
            </div>
          </div>
        </div>
      </div>

      {/* SHAP-Style Explainability Waterfall */}
      <div className="clinical-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-clinical-border">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Explainable Feature Attribution (SHAP-Style Decomposition)</h3>
            <p className="text-xs text-slate-500">Deconstructs precisely which clinical factors elevated or protected the adherence score.</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Baseline Prior: 35%</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {inference.explainability.map((item, idx) => {
            const isRisk = item.impact > 0;
            const impactPct = Math.abs(Math.round(item.impact * 100));
            const barWidth = Math.min(100, impactPct * 3.5);

            return (
              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50">
                <div className="w-1/3">
                  <div className="font-semibold text-slate-800">{item.feature}</div>
                  <div className="text-[11px] text-slate-400">{item.description}</div>
                </div>

                <div className="w-24 font-mono text-slate-700 font-medium">
                  {item.value}
                </div>

                <div className="flex-1 px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-36 bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      {isRisk ? (
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      ) : (
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      )}
                    </div>
                    <span className={`font-mono text-[11px] font-semibold ${isRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isRisk ? `+${impactPct}% Risk` : `-${impactPct}% Protective`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Longitudinal Visual Timeline: Refills vs Vitals vs Notes */}
      <div className="clinical-card p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Longitudinal Adherence & Biomarker Timeline (180 Days)</h3>
        <p className="text-xs text-slate-500 mb-4">Visual alignment of pharmacy refills, coverage gaps, and clinical biomarker surges.</p>

        <div className="overflow-x-auto pb-2">
          <svg className="w-full h-48 border border-slate-100 rounded-md bg-slate-50/50" viewBox="0 0 800 180">
            {/* Background Grid Lines */}
            <line x1="40" y1="30" x2="760" y2="30" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="40" y1="80" x2="760" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="40" y1="130" x2="760" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Time labels */}
            <text x="50" y="148" fontSize="10" fill="#94a3b8" fontFamily="monospace">-180 Days</text>
            <text x="220" y="148" fontSize="10" fill="#94a3b8" fontFamily="monospace">-120 Days</text>
            <text x="400" y="148" fontSize="10" fill="#94a3b8" fontFamily="monospace">-60 Days</text>
            <text x="580" y="148" fontSize="10" fill="#94a3b8" fontFamily="monospace">-30 Days</text>
            <text x="730" y="148" fontSize="10" fill="#94a3b8" fontFamily="monospace">Today</text>

            {/* Track Labels */}
            <text x="10" y="34" fontSize="9" fontWeight="600" fill="#64748b">Vitals</text>
            <text x="10" y="84" fontSize="9" fontWeight="600" fill="#64748b">Dispense</text>
            <text x="10" y="124" fontSize="9" fontWeight="600" fill="#64748b">Events</text>

            {/* Render Dispense Bars (Green blocks for 30d coverage, red gap indicators) */}
            {dispenses.map((d, i) => {
              const dDate = new Date(d.dispense_date);
              const daysAgo = Math.max(0, (new Date() - dDate) / (1000 * 60 * 60 * 24));
              const xPos = 740 - (daysAgo / 180) * 680;
              const width = Math.min(100, (d.days_supply / 180) * 680);

              return (
                <g key={i}>
                  <rect
                    x={xPos}
                    y="70"
                    width={width}
                    height="18"
                    rx="3"
                    fill="#10b981"
                    opacity="0.8"
                  />
                  <text x={xPos + 4} y="83" fontSize="9" fill="#ffffff" fontWeight="600">
                    Fill #{i+1}
                  </text>
                </g>
              );
            })}

            {/* Render Vitals Line & Dots */}
            {vitals.map((v, i) => {
              const vDate = new Date(v.recorded_date);
              const daysAgo = Math.max(0, (new Date() - vDate) / (1000 * 60 * 60 * 24));
              const xPos = 740 - (daysAgo / 180) * 680;
              // Map SBP 110-160 to y 50 to 15
              const yPos = Math.max(15, Math.min(55, 60 - ((v.value - 110) / 60) * 45));
              const isSpike = v.value >= 140;

              return (
                <g key={i}>
                  <circle
                    cx={xPos}
                    cy={yPos}
                    r={isSpike ? "5" : "3.5"}
                    fill={isSpike ? "#e11d48" : "#3b82f6"}
                  />
                  <text x={xPos - 8} y={yPos - 6} fontSize="8" fontWeight="600" fill={isSpike ? "#e11d48" : "#475569"}>
                    {v.value}
                  </text>
                </g>
              );
            })}

            {/* Render Clinical Notes Markers */}
            {clinical_notes.map((n, i) => {
              const nDate = new Date(n.note_date);
              const daysAgo = Math.max(0, (new Date() - nDate) / (1000 * 60 * 60 * 24));
              const xPos = 740 - (daysAgo / 180) * 680;

              return (
                <g key={i}>
                  <rect x={xPos - 6} y="105" width="12" height="12" rx="2" fill="#8b5cf6" />
                  <text x={xPos - 2} y="114" fontSize="8" fill="#ffffff" fontWeight="bold">N</text>
                </g>
              );
            })}
          </svg>

          <div className="flex items-center space-x-6 text-[11px] text-slate-500 mt-2 px-2">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>Covered Pharmacy Supply (30d)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
              <span>Elevated Biomarker Spike (&gt;140 SBP)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span>Normal Biomarker Reading</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span>Clinical Encounter Note Pin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Longitudinal Prescriptions & Clinical Notes Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Regimen & Dispense History */}
        <div className="clinical-card p-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Active Regimen & Pharmacy Dispenses</h4>
          <div className="space-y-3">
            {prescriptions.map(rx => (
              <div key={rx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-900">{rx.medication_name} ({rx.dose})</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Active</span>
                </div>
                <div className="text-slate-600 mt-1">{rx.instructions}</div>
                <div className="text-[11px] text-slate-400 mt-1">Prescribed: {rx.start_date} • {rx.days_supply}-day supply</div>
              </div>
            ))}

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">Recent Dispense Events:</div>
              <div className="space-y-1">
                {dispenses.map(d => (
                  <div key={d.id} className="flex justify-between text-xs py-1 border-b border-slate-100 text-slate-700">
                    <span>{d.dispense_date} — {d.medication_name}</span>
                    <span className="font-mono text-slate-500">{d.pharmacy_name} ({d.days_supply}d)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Encounter Notes & Past Interventions */}
        <div className="clinical-card p-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Encounter Notes & Extracted Symptoms</h4>
            <div className="space-y-2">
              {clinical_notes.map(note => (
                <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>{note.encounter_type}</span>
                    <span className="font-mono text-slate-400">{note.note_date}</span>
                  </div>
                  <p className="text-slate-600 mt-1 italic">"{note.text_content}"</p>
                  
                  {(note.side_effects_detected.length > 0 || note.barriers_detected.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.side_effects_detected.map((se, i) => (
                        <span key={i} className="badge-pill bg-rose-50 text-rose-700 border border-rose-200">
                          Side Effect: {se}
                        </span>
                      ))}
                      {note.barriers_detected.map((b, i) => (
                        <span key={i} className="badge-pill bg-orange-50 text-orange-700 border border-orange-200">
                          Barrier: {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {interventions.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Logged Clinician Actions</h4>
              <div className="space-y-2">
                {interventions.map(act => (
                  <div key={act.id} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-xs">
                    <div className="flex justify-between font-semibold text-emerald-900">
                      <span>{act.title}</span>
                      <span className="font-mono text-[10px] text-emerald-700">{act.status}</span>
                    </div>
                    <div className="text-emerald-800 mt-0.5">{act.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. WHAT-IF COUNTERFACTUAL SIMULATOR
// -------------------------------------------------------------
function SimulatorView({ patient, analysis, onInterventionLogged }) {
  if (!patient || !analysis) {
    return <div className="text-center py-12 text-slate-500">Select a patient to simulate interventions.</div>;
  }

  const [selectedIntervention, setSelectedIntervention] = useState('SWITCH_90_DAY_SUPPLY');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [clinicianNote, setClinicianNote] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);

  const interventionsList = [
    {
      id: 'SWITCH_90_DAY_SUPPLY',
      name: 'Switch to 90-Day Mail-Order Supply',
      badge: 'Access & Refill Friction',
      description: 'Converts 30-day fills into 90-day mail delivery, drastically removing monthly pharmacy transit and timing friction.'
    },
    {
      id: 'RESOLVE_SIDE_EFFECT',
      name: 'Titrate Dose / Manage Adverse Effects',
      badge: 'Hesitancy Resolution',
      description: 'Addresses documented adverse reactions (e.g. GI distress, dizziness) via ER formulation or modified schedule.'
    },
    {
      id: 'DEPLOY_IOT_SMART_CAP',
      name: 'Pair Connected Smart Pillbox (IoT)',
      badge: 'Sensor Verification',
      description: 'Introduces passive timestamp sensor layer to verify dose taking and provide gentle ambient chime nudges.'
    },
    {
      id: 'NURSE_NAVIGATOR_CARE_CALL',
      name: 'Care Coordinator Empathetic Outreach',
      badge: 'Human-in-the-Loop',
      description: 'Nurse navigator outreach to conduct social determinants screening, refill synchronization, and pillbox organizing.'
    }
  ];

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setLogSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patient.id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervention: selectedIntervention })
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAcceptIntervention = async () => {
    if (!simulationResult) return;
    try {
      const currentInt = interventionsList.find(i => i.id === selectedIntervention);
      await fetch(`/api/patients/${patient.id}/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: selectedIntervention,
          title: currentInt.name,
          description: simulationResult.narrative,
          clinician_notes: clinicianNote || "Validated via Counterfactual Adherence Engine."
        })
      });
      setLogSuccess(true);
      setTimeout(() => {
        onInterventionLogged();
      }, 1200);
    } catch (err) {
      console.error('Failed to log intervention:', err);
    }
  };

  const currentRiskPct = Math.round(analysis.inference.risk_score * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="clinical-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-clinical-border">
          <div>
            <h2 className="text-lg font-bold text-slate-900">What-If Counterfactual Sandbox</h2>
            <p className="text-xs text-slate-500">
              Evaluate simulated adherence recovery trajectories for <span className="font-semibold text-slate-800">{patient.full_name}</span> before executing clinical orders.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            Current Risk: {currentRiskPct}%
          </span>
        </div>

        {/* Intervention Selector Grid */}
        <div className="mt-5 space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">Select Candidate Intervention:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {interventionsList.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedIntervention(item.id)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition ${
                  selectedIntervention === item.id
                    ? 'border-slate-900 bg-slate-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">{item.name}</span>
                  <span className="badge-pill bg-slate-100 text-slate-600 text-[10px]">{item.badge}</span>
                </div>
                <p className="text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-3">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-sm transition"
            >
              {isSimulating ? 'Simulating Latent Dynamics...' : 'Run Counterfactual Simulation'}
            </button>
          </div>
        </div>

        {/* Simulation Output Card */}
        {simulationResult && (
          <div className="mt-6 p-5 bg-emerald-50/40 border border-emerald-200 rounded-lg space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Projected Adherence Trajectory</span>
              <span className="badge-pill bg-emerald-100 text-emerald-800 font-mono text-xs">
                Risk Delta: {Math.round(simulationResult.projected_risk_score * 100) - currentRiskPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white p-3 rounded border border-emerald-100">
                <div className="text-[11px] text-slate-500">Baseline Risk</div>
                <div className="text-xl font-bold text-slate-800 mt-0.5">{currentRiskPct}%</div>
              </div>
              <div className="bg-white p-3 rounded border border-emerald-100">
                <div className="text-[11px] text-emerald-600 font-medium">Projected Risk After Intervention</div>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">
                  {Math.round(simulationResult.projected_risk_score * 100)}%
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  [CI: {Math.round(simulationResult.projected_confidence_lower * 100)}% - {Math.round(simulationResult.projected_confidence_upper * 100)}%]
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-emerald-100">
                <div className="text-[11px] text-slate-500">Projected PDC Coverage</div>
                <div className="text-xl font-bold text-slate-800 mt-0.5">
                  {Math.round(simulationResult.projected_pdc * 100)}%
                </div>
              </div>
            </div>

            <p className="text-xs text-emerald-900 bg-white p-3 rounded border border-emerald-100 leading-relaxed">
              <span className="font-bold">Mechanism: </span>
              {simulationResult.narrative}
            </p>

            {/* Clinician Action Acceptance */}
            <div className="pt-2 border-t border-emerald-200/70 space-y-2">
              <label className="text-xs font-semibold text-emerald-900 block">Clinician Order / Care Plan Note:</label>
              <textarea
                rows="2"
                placeholder="Add instructions for pharmacy or care coordinator (e.g. 'Transmit 90-day script to OptumRx; nurse to confirm delivery next Friday')..."
                value={clinicianNote}
                onChange={(e) => setClinicianNote(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              ></textarea>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleAcceptIntervention}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-sm transition"
                >
                  Accept & Deploy to EHR Care Plan
                </button>
                {logSuccess && (
                  <span className="text-xs text-emerald-700 font-semibold animate-pulse">
                    ✓ Logged to Electronic Health Record! Returning to dossier...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. HL7 FHIR R4 INTEROPERABILITY VIEW
// -------------------------------------------------------------
function FHIRView({ patientId, patient, onPatientImported }) {
  const [bundleData, setBundleData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    if (patientId) {
      fetch(`/api/patients/${patientId}/fhir`)
        .then(res => res.json())
        .then(data => setBundleData(data))
        .catch(err => console.error('FHIR export error:', err));
    }
  }, [patientId]);

  const handleCopy = () => {
    if (!bundleData) return;
    navigator.clipboard.writeText(JSON.stringify(bundleData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    try {
      setImportMsg('Parsing and ingesting FHIR R4 Bundle...');
      const parsed = JSON.parse(importJson);
      const res = await fetch('/api/fhir/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setImportMsg(`Successfully ingested patient ${data.patient_mrn}!`);
        setTimeout(() => onPatientImported(data.patient_id), 1000);
      } else {
        setImportMsg('Import failed. Invalid bundle structure.');
      }
    } catch (err) {
      setImportMsg('JSON Syntax Error: Please ensure valid FHIR R4 JSON.');
    }
  };

  const sampleFHIR = {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          identifier: [{ value: "MRN-FHIR-9902" }],
          name: [{ text: "Gabriel Sterling" }],
          gender: "male"
        }
      },
      {
        resource: {
          resourceType: "MedicationRequest",
          medicationCodeableConcept: { text: "Atorvastatin 20mg" },
          status: "active",
          dispenseRequest: { expectedSupplyDuration: { value: 30 } }
        }
      },
      {
        resource: {
          resourceType: "MedicationDispense",
          medicationCodeableConcept: { text: "Atorvastatin 20mg" },
          daysSupply: { value: 30 },
          quantity: { value: 30 }
        }
      },
      {
        resource: {
          resourceType: "Observation",
          code: { text: "SBP" },
          valueQuantity: { value: 138, unit: "mmHg" }
        }
      }
    ]
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="clinical-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-clinical-border">
          <div>
            <h2 className="text-lg font-bold text-slate-900">HL7 FHIR R4 Interoperability Gateway</h2>
            <p className="text-xs text-slate-500">
              Native FHIR R4 export of MedicationRequest, MedicationDispense, Observation, and Patient resources.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold shadow-sm transition"
            >
              {copied ? '✓ Copied to Clipboard' : 'Copy FHIR JSON'}
            </button>
            <a
              href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(bundleData, null, 2))}`}
              download={`fhir_patient_${patientId}.json`}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-sm transition"
            >
              Download .json
            </a>
          </div>
        </div>

        {/* JSON Display */}
        <div className="mt-4">
          <div className="text-xs font-mono font-medium text-slate-500 mb-1.5 flex justify-between">
            <span>Bundle Resource for {patient?.full_name} ({patient?.mrn}):</span>
            <span>HL7 FHIR Release 4</span>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-[11px] overflow-auto max-h-96 leading-relaxed border border-slate-800">
            {bundleData ? JSON.stringify(bundleData, null, 2) : 'Loading FHIR bundle...'}
          </pre>
        </div>

        {/* Ingest External FHIR Bundle Section */}
        <div className="mt-8 pt-6 border-t border-clinical-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Ingest External FHIR R4 Bundle</h3>
            <button
              onClick={() => setImportJson(JSON.stringify(sampleFHIR, null, 2))}
              className="text-xs text-emerald-700 hover:underline font-medium"
            >
              Load Sample Patient Bundle
            </button>
          </div>
          <textarea
            rows="5"
            placeholder="Paste raw FHIR R4 JSON Bundle here..."
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-clinical-border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800"
          ></textarea>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-sm transition"
            >
              Ingest & Run Latent Adherence Inference
            </button>
            {importMsg && (
              <span className="text-xs font-medium text-slate-700">{importMsg}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper int formatting
function int(val) {
  return Math.round(Number(val) || 0);
}

// Mount React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
