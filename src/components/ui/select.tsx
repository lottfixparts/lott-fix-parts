import * as React from "react";

type OnChange = (v: string) => void;

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> & { __isItem?: boolean } = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};
(SelectItem as any).__isItem = true;

function flattenItems(children: React.ReactNode): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  React.Children.forEach(children as any, (child: any) => {
    if (!child) return;
    if (child.type && (child.type.__isItem || child.type.displayName === "SelectItem")) {
      out.push(child);
    } else if (child.props && child.props.children) {
      out.push(...flattenItems(child.props.children));
    }
  });
  return out;
}

export const Select: React.FC<{ value?: string; onValueChange?: OnChange; children?: React.ReactNode }> = ({ value, onValueChange, children }) => {
  const items = flattenItems(children);
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm"
    >
      {items}
    </select>
  );
};

export const SelectTrigger: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const SelectContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => <span>{placeholder ?? ""}</span>;
