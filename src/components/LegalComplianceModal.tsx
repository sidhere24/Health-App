import { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegalComplianceModal({ isOpen, onClose }: LegalComplianceModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[86vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <h2
              id="legal-modal-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              Privacy, Health Disclaimer & Disclosures
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy and disclosures dialog"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 text-xs text-slate-600 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              1. Educational Wellness Disclaimer
            </h3>
            <p>
              HydraPrep provides whole-food meal planning, macronutrient calculations, and micronutrient reference data for general fitness and nutritional education only. It is not medical advice, clinical diagnosis, or a substitute for consultation with a qualified physician or registered dietitian.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              2. Privacy Policy (On-Device Storage)
            </h3>
            <p>
              Your age, weight, height, dietary preferences, meal checkmarks, and grocery lists are stored strictly locally on your device using browser storage (<code className="font-mono text-slate-800">localStorage</code>). HydraPrep does not require an account, does not sell personal health metrics, and does not upload biometric data to external servers.
            </p>
            <p>
              When you tap an external storefront button, HydraPrep opens the store in your native browser or shopping app. Third-party stores operate under their own privacy policies.
            </p>
          </section>

          <section className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              3. Affiliate & Partner Disclosure
            </h3>
            <p className="font-medium text-slate-800">
              As an Amazon Associate I earn from qualifying purchases.
            </p>
            <p>
              Whole foods in HydraPrep are selected strictly on micronutrient density and regional cost efficiency. Storefront links help keep HydraPrep free with zero subscription paywalls and carry no extra cost to you.
            </p>
          </section>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
