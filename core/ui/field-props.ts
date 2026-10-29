import type { FieldProxyNode } from "palistor";

/**
 * Props binding a HeroUI TextField to a palistor field. `isInvalid` is always a
 * boolean: a controlled state overrides React Aria's own checks, so the store
 * config is the only validator (forms use validationBehavior="aria"). Render
 * the message as <FieldError>{field.errorMessage}</FieldError>.
 */
export function textFieldProps(field: FieldProxyNode<string>) {
  return {
    value: field.value,
    onChange: field.onValueChange,
    isInvalid: Boolean(field.isInvalid),
    isRequired: field.isRequired,
    isDisabled: field.isDisabled,
    isReadOnly: field.isReadOnly,
  };
}
