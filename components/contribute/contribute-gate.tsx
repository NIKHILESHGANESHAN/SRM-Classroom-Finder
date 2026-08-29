"use client";

import { ContributeAfterHours } from "@/components/contribute/contribute-after-hours";
import { ContributeNight } from "@/components/contribute/contribute-night";
import { ContributeWizard } from "@/components/contribute/contribute-wizard";
import type { ContributePageData } from "@/lib/contribute-data";
import { isContributeEasterEggGateActive } from "@/lib/easter-egg";

type ContributeGateProps = {
  data: ContributePageData;
};

/**
 * Client shell: evening/night Easter Egg gates block the wizard entirely.
 * Morning and normal phases render the contributor wizard.
 */
export function ContributeGate({ data }: ContributeGateProps) {
  if (isContributeEasterEggGateActive(data.easterEggPhase)) {
    return data.easterEggPhase === "evening" ? (
      <ContributeAfterHours />
    ) : (
      <ContributeNight />
    );
  }

  return (
    <ContributeWizard
      data={data}
      reportingBlocked={data.reportingBlocked}
    />
  );
}
