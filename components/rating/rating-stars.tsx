import React, { useState } from "react";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  displayOnly?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  disabled,
  displayOnly,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onChange || disabled || displayOnly) return;
    if (e.key === "ArrowLeft" && value > 1) onChange(value - 1);
    if (e.key === "ArrowRight" && value < 5) onChange(value + 1);
  };

  return (
    <div
      tabIndex={displayOnly ? -1 : 0}
      role={displayOnly ? "img" : "slider"}
      aria-valuenow={value}
      aria-valuemin={1}
      aria-valuemax={5}
      onKeyDown={handleKeyDown}
      className={
        displayOnly
          ? "flex items-center gap-1 outline-none"
          : "flex items-center gap-1 cursor-pointer outline-none"
      }
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onMouseEnter={() => !displayOnly && setHovered(star)}
          onMouseLeave={() => !displayOnly && setHovered(null)}
          onClick={() =>
            onChange && !disabled && !displayOnly && onChange(star)
          }
          className={
            displayOnly
              ? "select-none text-2xl text-muted-foreground"
              : "select-none text-2xl transition-colors duration-200 " +
                ((hovered ?? value) >= star
                  ? "text-yellow-400"
                  : "text-muted-foreground")
          }
          aria-label={star + " star"}
        >
          ★
        </span>
      ))}
    </div>
  );
};
