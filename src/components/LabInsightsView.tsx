import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  FileText,
  FlaskConical,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  LabAiInsightReport,
  LabFileAttachment,
  LabMarkerStatus,
  UserProfile,
} from '../types/nutrition';
import {
  ALLOWED_LAB_MIME_TYPES,
  formatLabChecklistText,
  getRecommendedLabPanel,
  MAX_LAB_FILE_BYTES,
} from '../utils/labInsights';

interface LabInsightsViewProps {
  profile: UserProfile;
  savedReport: LabAiInsightReport | null;
  onReportGenerated: (report: LabAiInsightReport) => void;
  onJumpToNextWeek: () => void;
  onNotify?: (message: string) => void;
}

type LabSubScreen = 'upload' | 'tests' | 'insights';

const SAMPLE_LAB_TEXT =
  'Vitamin D (25-OH): 19 ng/mL (Low)\nSerum Ferritin: 29 ng/mL (Borderline low)\nHbA1c: 5.7%\nVitamin B12: 310 pg/mL\nFasting Triglycerides: 158 mg/dL\nHDL Cholesterol: 44 mg/dL';

const STATUS_STYLE: Record<LabMarkerStatus, { label: string; className: string }> = {
  optimal: { label: 'Optimal', className: 'text-teal-700 font-semibold' },
  borderline: { label: 'Borderline', className: 'text-amber-700 font-semibold' },
  attention: { label: 'Needs Review', className: 'text-red-700 font-semibold' },
  info: { label: 'Logged', className: 'text-slate-600 font-medium' },
};

export function LabInsightsView({
  profile,
  savedReport,
  onReportGenerated,
  onJumpToNextWeek,
  onNotify,
}: LabInsightsViewProps) {
  const [subScreen, setSubScreen] = useState<LabSubScreen>(savedReport ? 'insights' : 'upload');
  const [pastedResults, setPastedResults] = useState('');
  const [symptomsOrGoals, setSymptomsOrGoals] = useState('');
  const [fileAttachment, setFileAttachment] = useState<LabFileAttachment | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Record<string, boolean>>({});
  const [loadingMode, setLoadingMode] = useState<'analyze_results' | 'suggest_tests' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiServerUnavailable, setAiServerUnavailable] = useState(false);
  const [copiedChecklist, setCopiedChecklist] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;

  const baselineTests = useMemo(
    () => getRecommendedLabPanel(profile, symptomsOrGoals),
    [profile, symptomsOrGoals]
  );

  const displayedTests =
    savedReport && savedReport.recommendedTests.length > 0
      ? savedReport.recommendedTests
      : baselineTests;

  const selectedCount = displayedTests.filter((t) => selectedTestIds[t.id]).length;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_LAB_MIME_TYPES.has(file.type)) {
      setErrorMsg('Please upload a PNG, JPG, WEBP photo or PDF lab report.');
      return;
    }
    if (file.size > MAX_LAB_FILE_BYTES) {
      setErrorMsg('File exceeds 4 MB limit. Please upload a smaller image or PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFileAttachment({
        fileName: file.name,
        mimeType: file.type,
        dataBase64: base64,
      });
    };
    reader.onerror = () => {
      setErrorMsg('Could not read the selected file. Please try another file or paste values.');
    };
    reader.readAsDataURL(file);
  };

  const runGeminiLabRequest = async (mode: 'analyze_results' | 'suggest_tests') => {
    setErrorMsg(null);
    if (mode === 'analyze_results' && !pastedResults.trim() && !fileAttachment) {
      setErrorMsg('Upload a lab photo/PDF or paste your test values first — or click "Suggest Tests for Me".');
      return;
    }

    setLoadingMode(mode);
    try {
      const res = await fetch('/api/ai/lab-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          pastedResults: pastedResults.trim(),
          symptomsOrGoals: symptomsOrGoals.trim(),
          fileAttachment,
          profile: {
            sex: profile.sex ?? 'neutral',
            age: profile.age,
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
            diet: profile.diet ?? 'non-veg',
            goal: profile.goal,
            locationLabel: region.label,
            excludedAllergens: profile.excludedAllergens ?? [],
          },
        }),
      });

      const data = (await res.json()) as { report?: LabAiInsightReport; error?: string };
      if (!res.ok || !data.report) {
        const msg = data.error ?? 'Could not generate Gemini lab insights right now.';
        setErrorMsg(msg);
        if (msg.includes('GEMINI_API_KEY') || msg.includes('not configured')) {
          setAiServerUnavailable(true);
        }
        return;
      }

      onReportGenerated(data.report);
      setSubScreen(mode === 'suggest_tests' ? 'tests' : 'insights');
      onNotify?.(
        mode === 'suggest_tests'
          ? 'Gemini personalized your recommended lab tests'
          : 'Gemini analyzed your lab results and food priorities'
      );
    } catch {
      setErrorMsg('Network error reaching the Gemini AI lab advisor. Please try again.');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleCopyChecklist = async () => {
    const text = formatLabChecklistText(displayedTests, selectedTestIds, profile);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopiedChecklist(true);
      window.setTimeout(() => setCopiedChecklist(false), 2000);
      onNotify?.('Copied lab test checklist for your doctor or diagnostic center');
    }
  };

  return (
    <div className="space-y-5">
      {aiServerUnavailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="text-sm sm:text-base text-amber-800">
            <strong className="font-semibold">AI features unavailable:</strong>
            Gemini AI is not configured on this server (missing GEMINI_API_KEY). Upload and manual entry still work — AI analysis will be available once the server key is set.
          </div>
          <button
            type="button"
            onClick={() => setAiServerUnavailable(false)}
            className="text-xs sm:text-sm text-amber-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Header + 3-Screen Non-Scrolling Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">
              Gemini AI Nutrition & Biomarker Guide · {profile.age} yrs · {region.shortLabel}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 text-balance">
              Lab Test Analyzer & Smart Test Advisor
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Educational nutrition guidance · Not medical diagnosis
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Lab test advisor screens"
          className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200/80 rounded-xl gap-1"
        >
          {[
            { id: 'upload' as const, label: '1. Upload Results' },
            { id: 'tests' as const, label: `2. Suggested Tests (${displayedTests.length})` },
            { id: 'insights' as const, label: '3. AI Food Plan' },
          ].map((tab) => {
            const active = subScreen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubScreen(tab.id)}
                className={`py-2 px-2 min-h-[42px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Screen 1: Upload Results or Paste Values */}
      {subScreen === 'upload' && (
        <section
          aria-label="Upload or paste lab test results"
          className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* File Upload Box */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Upload Blood / Lab Report Photo or PDF (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="sr-only"
                id="lab-report-upload"
              />
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/70 space-y-2.5">
                <Upload className="w-6 h-6 text-teal-700 mx-auto" />
                {fileAttachment ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {fileAttachment.fileName}
                    </p>
                    <p className="text-xs text-teal-700 font-medium">
                      Ready to analyze with Gemini AI ({fileAttachment.mimeType})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFileAttachment(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove File</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-800">
                      Attach PNG, JPG, WEBP, or PDF (max 4 MB)
                    </p>
                    <p className="text-xs text-slate-500">
                      Files are analyzed in memory on the server and never written to disk.
                    </p>
                    <label
                      htmlFor="lab-report-upload"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Choose Lab Report</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Paste Values & Focus */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="lab-pasted-text"
                  className="text-xs font-semibold text-slate-700"
                >
                  Or Paste Key Lab Numbers
                </label>
                <button
                  type="button"
                  onClick={() => setPastedResults(SAMPLE_LAB_TEXT)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
                >
                  Try Sample Lab Values
                </button>
              </div>
              <textarea
                id="lab-pasted-text"
                rows={4}
                value={pastedResults}
                onChange={(e) => setPastedResults(e.target.value)}
                placeholder="Example: Vitamin D 19 ng/mL, Ferritin 28 ng/mL, HbA1c 5.7%, Vitamin B12 310 pg/mL..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />

              <label className="block">
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Symptoms or Goals (Optional)
                </span>
                <input
                  type="text"
                  value={symptomsOrGoals}
                  onChange={(e) => setSymptomsOrGoals(e.target.value)}
                  placeholder="e.g., afternoon fatigue, slow workout recovery, hair thinning, energy"
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSubScreen('tests')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[46px] text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap"
            >
              <ClipboardList className="w-4 h-4 text-teal-700" />
              <span>Don’t Have Results? View Suggested Tests</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={loadingMode !== null}
              onClick={() => runGeminiLabRequest('analyze_results')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[46px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {loadingMode === 'analyze_results' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Results with Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Screen 2: Suggested Diagnostic Tests to Get a Clearer Picture */}
      {subScreen === 'tests' && (
        <section
          aria-label="Recommended lab tests"
          className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Suggested Blood & Nutrient Tests for Your Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calibrated for {profile.sex ?? 'neutral'} · {profile.age} yrs · {profile.diet ?? 'non-veg'}.
                Tap tests to build a checklist for your physician or diagnostic lab.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loadingMode !== null}
                onClick={() => runGeminiLabRequest('suggest_tests')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg disabled:opacity-60 whitespace-nowrap"
              >
                {loadingMode === 'suggest_tests' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Personalize with Gemini AI</span>
              </button>

              <button
                type="button"
                onClick={handleCopyChecklist}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap"
              >
                {copiedChecklist ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copiedChecklist
                    ? 'Copied Checklist'
                    : `Copy Checklist (${selectedCount > 0 ? selectedCount : displayedTests.length})`}
                </span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
            {displayedTests.map((test) => {
              const checked = Boolean(selectedTestIds[test.id]);
              return (
                <button
                  key={test.id}
                  type="button"
                  onClick={() =>
                    setSelectedTestIds((prev) => ({ ...prev, [test.id]: !prev[test.id] }))
                  }
                  className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                    checked ? 'bg-teal-50/50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      checked
                        ? 'bg-teal-700 border-teal-700 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className={
                          test.priority === 'Core'
                            ? 'text-teal-700 font-semibold'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {test.priority}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{test.category}</span>
                      {test.fastingRequired && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium">Fasting Draw</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{test.testName}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {test.whyRecommended}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSubScreen('upload')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 min-h-[44px] px-2"
            >
              Back to Upload
            </button>
            <button
              type="button"
              onClick={() => setSubScreen('insights')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl whitespace-nowrap"
            >
              <span>Next: AI Food Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Screen 3: Gemini AI Action Plan & Food Adjustments */}
      {subScreen === 'insights' && (
        <section
          aria-label="Gemini AI lab nutrition action plan"
          className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {!savedReport ? (
            <div className="py-8 text-center space-y-3 max-w-md mx-auto">
              <FlaskConical className="w-8 h-8 text-teal-700 mx-auto" />
              <h3 className="text-base font-semibold text-slate-900">
                No Gemini Lab Report Generated Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Upload a blood test photo/PDF, paste your numbers, or ask Gemini AI to suggest a
                personalized baseline panel for your profile.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubScreen('upload')}
                  className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
                >
                  Upload or Paste Results
                </button>
                <button
                  type="button"
                  disabled={loadingMode !== null}
                  onClick={() => runGeminiLabRequest('suggest_tests')}
                  className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl"
                >
                  {loadingMode === 'suggest_tests' ? 'Generating...' : 'Suggest Tests via Gemini AI'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-teal-700">
                  Gemini AI Educational Summary
                </span>
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
                  {savedReport.summary}
                </p>
              </div>

              {savedReport.extractedMarkers.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-700">Extracted Lab Markers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedReport.extractedMarkers.map((marker, idx) => {
                      const st = STATUS_STYLE[marker.status] ?? STATUS_STYLE.info;
                      return (
                        <div
                          key={`${marker.name}-${idx}`}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900">{marker.name}</span>
                            <span className={st.className}>{st.label}</span>
                          </div>
                          <div className="font-mono tabular-nums text-base font-semibold text-slate-900">
                            {marker.value} {marker.unit}
                          </div>
                          <p className="text-xs text-slate-600 leading-snug">{marker.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {savedReport.priorityFoodFocus.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-700">
                    Whole-Food Priorities ({region.shortLabel})
                  </h4>
                  <div className="space-y-2.5">
                    {savedReport.priorityFoodFocus.map((focus, idx) => (
                      <div
                        key={`${focus.foodOrNutrient}-${idx}`}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900 text-sm">
                            {focus.foodOrNutrient}
                          </span>
                          <span className="text-teal-700 font-medium capitalize">
                            Best at {focus.suggestedMealSlot}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{focus.whyItHelps}</p>
                        {focus.localFoodExamples.length > 0 && (
                          <p className="text-xs text-slate-700 font-medium pt-0.5">
                            Local foods: {focus.localFoodExamples.join(' · ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedReport.nextWeekAdjustments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700">
                    Recommended Tweaks for Next Week
                  </h4>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 list-disc pl-5">
                    {savedReport.nextWeekAdjustments.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
                {savedReport.medicalDisclaimer}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSubScreen('upload')}
                  className="px-3.5 py-2 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
                >
                  Analyze Another Report
                </button>
                <button
                  type="button"
                  onClick={onJumpToNextWeek}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl whitespace-nowrap"
                >
                  <span>Apply to Next Week Prep</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
