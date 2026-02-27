import type { ColumnType } from "../hooks/useDataStore";
import { SwapIcon } from "./icons";

interface Props {
  type: ColumnType;
  variant?: "full" | "short";
  onClick?: () => void;
}

export function ColumnTypeBadge({ type, variant = "full", onClick }: Props) {
  const isNum = type === "numeric";
  const baseClass = `inline-flex items-center gap-1 rounded text-xs font-medium px-1.5 py-0.5 select-none
    ${isNum ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}
    ${onClick ? "cursor-pointer hover:opacity-80 group" : ""}`;

  const label =
    variant === "short"
      ? isNum
        ? "Num"
        : "Cat"
      : isNum
        ? "Numeric"
        : "Categorical";

  const content = (
    <>
      <span
        className={variant === "short" ? "inline-block w-7 text-center" : ""}
      >
        {label}
      </span>
      {onClick && <SwapIcon size={12} className="hidden group-hover:block" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={baseClass}
        onClick={onClick}
        title="Click to toggle type"
      >
        {content}
      </button>
    );
  }
  return <span className={baseClass}>{content}</span>;
}
