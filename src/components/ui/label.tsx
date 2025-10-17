import * as React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
export const Label = ({ className = "", ...props }: LabelProps) => (
  <label className={"text-sm font-medium text-gray-800 " + className} {...props} />
);
export default Label;
