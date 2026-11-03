'use client';

import { useState } from 'react';
import { Stepper } from './form-fields';
import { UploadStep } from './upload-step';
import { ReviewStep } from './review-step';
import { PublishStep } from './publish-step';
import type { IntakeResult, ReviewFields, UploadFields } from './types';

type WizardState =
  | { readonly step: 1 }
  | { readonly step: 2; readonly upload: UploadFields; readonly intake: IntakeResult }
  | {
      readonly step: 3;
      readonly upload: UploadFields;
      readonly intake: IntakeResult;
      readonly review: ReviewFields;
    };

export function IntakeClient(): React.ReactElement {
  const [state, setState] = useState<WizardState>({ step: 1 });

  return (
    <div>
      <Stepper step={state.step} />
      {state.step === 1 ? (
        <UploadStep onComplete={(upload, intake) => setState({ step: 2, upload, intake })} />
      ) : null}
      {state.step === 2 ? (
        <ReviewStep
          intake={state.intake}
          onBack={() => setState({ step: 1 })}
          onContinue={(review) =>
            setState({ step: 3, upload: state.upload, intake: state.intake, review })
          }
        />
      ) : null}
      {state.step === 3 ? (
        <PublishStep
          upload={state.upload}
          intake={state.intake}
          review={state.review}
          onBack={() => setState({ step: 2, upload: state.upload, intake: state.intake })}
        />
      ) : null}
    </div>
  );
}
