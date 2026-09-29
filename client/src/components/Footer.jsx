export default function Footer({ className = "" }) {
  return (
    <footer className={`mx-auto w-full max-w-xs text-center ${className}`}>
      <div className="receipt-edge h-[2px] w-full" aria-hidden="true" />

      <div className="pt-5">
        <p className="text-[11px] font-medium text-kape-700/60">Developed by</p>

        <p className="font-display text-lg font-extrabold leading-tight text-ube-700 mt-0.5">
          Kyle Roma
        </p>

        <p className="text-xs text-kape-700 mt-1">
          with{" "}
          <span className="font-semibold text-kape-900">Charle Carillo</span>{" "}
          and <span className="font-semibold text-kape-900">Ryan Sarino</span>
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-calamansi-100 bg-calamansi-50 px-3 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-calamansi-500"
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold text-kape-700">
            CSC 107 · Caraga State University
          </span>
        </div>
      </div>
    </footer>
  );
}
