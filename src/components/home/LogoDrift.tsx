"use client";

import { useEffect, useState } from "react";
import { OrgLogo } from "@/components/data/OrgLogo";
import { Drift } from "@/components/site/Drift";

/**
 * A drifting row of organisation logos, drawn once the page is idle. The row is
 * decoration, so leaving it out of the first HTML makes the page smaller and the
 * headline paint sooner. The empty row keeps its height, so nothing moves when it fills.
 */
export function LogoDrift({
  logos,
  seconds,
  reverse = false,
}: {
  /** [name, logo URL] pairs. */
  logos: readonly (readonly [string, string])[];
  seconds: number;
  reverse?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = (
      window as {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    const show = () => setReady(true);
    if (idle) idle(show, { timeout: 2500 });
    else setTimeout(show, 600);
  }, []);

  if (!ready) return <div className="logo-wall h-[52px]" aria-hidden="true" />;
  return (
    <Drift
      seconds={seconds}
      reverse={reverse}
      items={logos.map(([name, logo]) => (
        <OrgLogo key={name} src={logo} name={name} size={52} />
      ))}
    />
  );
}
