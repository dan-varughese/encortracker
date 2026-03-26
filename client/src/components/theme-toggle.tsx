import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Returns true if it's currently "nighttime" (between sunset and sunrise).
 * Uses a simple solar approximation — sunrise ~6:30am, sunset ~7:00pm local time,
 * adjusted slightly by month for seasonal variation.
 */
function isNightTime(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeDecimal = hours + minutes / 60;

  // Approximate sunrise/sunset for mid-latitudes (US East Coast)
  // Summer: sunrise ~6:00, sunset ~20:30
  // Winter: sunrise ~7:15, sunset ~17:00
  // Spring/Fall: sunrise ~6:30, sunset ~19:00
  const seasonalData: Record<number, { sunrise: number; sunset: number }> = {
    0:  { sunrise: 7.25, sunset: 17.25 }, // Jan
    1:  { sunrise: 7.0,  sunset: 18.0  }, // Feb
    2:  { sunrise: 6.5,  sunset: 19.0  }, // Mar
    3:  { sunrise: 6.25, sunset: 19.5  }, // Apr
    4:  { sunrise: 6.0,  sunset: 20.0  }, // May
    5:  { sunrise: 5.75, sunset: 20.5  }, // Jun
    6:  { sunrise: 5.75, sunset: 20.5  }, // Jul
    7:  { sunrise: 6.0,  sunset: 20.0  }, // Aug
    8:  { sunrise: 6.5,  sunset: 19.25 }, // Sep
    9:  { sunrise: 7.0,  sunset: 18.5  }, // Oct
    10: { sunrise: 6.75, sunset: 17.25 }, // Nov
    11: { sunrise: 7.25, sunset: 17.0  }, // Dec
  };

  const { sunrise, sunset } = seasonalData[month];
  return timeDecimal < sunrise || timeDecimal >= sunset;
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => isNightTime());

  // Apply theme on mount and when isDark changes
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  // Check every minute if we should auto-switch
  useEffect(() => {
    const interval = setInterval(() => {
      const shouldBeDark = isNightTime();
      setIsDark(shouldBeDark);
    }, 60_000); // check every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual toggle (overrides auto for this render cycle,
  // but the interval will re-sync on next sunrise/sunset boundary)
  const toggle = useCallback(() => {
    setIsDark((prev) => {
      applyTheme(!prev);
      return !prev;
    });
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      data-testid="button-theme-toggle"
      className="h-8 w-8"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
