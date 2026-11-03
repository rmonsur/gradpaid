import type { SelectHTMLAttributes } from 'react';
import { FIELD_CLASS } from './field-class';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  return <select {...props} className={`${FIELD_CLASS} ${props.className ?? ''}`} />;
}
