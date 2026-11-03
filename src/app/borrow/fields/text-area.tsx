import type { TextareaHTMLAttributes } from 'react';
import { FIELD_CLASS } from './field-class';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement {
  return <textarea {...props} className={`${FIELD_CLASS} min-h-28 ${props.className ?? ''}`} />;
}
