import type { InputHTMLAttributes } from 'react';
import { FIELD_CLASS } from './field-class';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  return <input {...props} className={`${FIELD_CLASS} ${props.className ?? ''}`} />;
}
