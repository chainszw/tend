import type { Role } from "@/lib/types";

const OPTIONS: { value: Role; title: string; detail: string }[] = [
  { value: "elder", title: "It is for me", detail: "I am managing my own medicines" },
  { value: "family", title: "I am family", detail: "A parent, partner or relative" },
  { value: "caretaker", title: "I am a caretaker", detail: "A nurse, aide or helper" },
];

interface RolePickerProps {
  legend: string;
  value: Role;
  onChange: (role: Role) => void;
}

/** Radio group for choosing how the person relates to the care circle. */
export function RolePicker({ legend, value, onChange }: RolePickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-input bg-card p-4 has-checked:border-primary has-checked:bg-leaf-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring"
          >
            <span className="flex items-center gap-2 font-bold">
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="size-5 accent-primary"
              />
              {option.title}
            </span>
            <span className="text-[0.95rem] text-muted-foreground">{option.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
