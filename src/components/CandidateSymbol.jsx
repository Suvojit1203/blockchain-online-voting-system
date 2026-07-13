export default function CandidateSymbol({ candidate, size = "md" }) {
  const dimensions = size === "lg" ? "h-14 w-14 text-base" : "h-11 w-11 text-sm";
  const symbol = candidate.symbol || candidate.name?.slice(0, 2).toUpperCase() || "EC";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-white font-black text-white shadow-sm ${dimensions}`}
      style={{ backgroundColor: candidate.symbolBg || "#0f766e" }}
      title={`${candidate.name} party symbol`}
    >
      {candidate.symbolURI ? (
        <img
          alt={`${candidate.name} symbol`}
          className="h-full w-full rounded-full object-cover"
          src={candidate.symbolURI}
        />
      ) : (
        symbol
      )}
    </span>
  );
}
