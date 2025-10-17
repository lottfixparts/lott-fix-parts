import * as React from "react";

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, defaultValue, onValueChange, className = "", children }) => {
  const name = React.useId();
  const [val, setVal] = React.useState(value ?? defaultValue ?? "");
  React.useEffect(() => { if (value !== undefined) setVal(value); }, [value]);

  const clone = (child: any, idx: number) => {
    if (!child || typeof child !== "object") return child;
    if (child.type && child.type.displayName === "RadioGroupItem") {
      const checked = (value ?? val) === child.props.value;
      return React.cloneElement(child, {
        name,
        checked,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setVal(child.props.value);
          onValueChange?.(child.props.value);
          child.props.onChange?.(e);
        }
      });
    }
    return child;
  };

  return <div className={className}>{React.Children.map(children, clone)}</div>;
};

interface RadioItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  id?: string;
}
export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioItemProps>(({ className = "", ...props }, ref) => (
  <input ref={ref} type="radio" className={"h-4 w-4 border-gray-300 " + className} {...props} />
));
RadioGroupItem.displayName = "RadioGroupItem";
