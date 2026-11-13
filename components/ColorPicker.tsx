import { playerColors } from '@/lib/player-colors';
export default function ColorPicker({
  value,
  onChange,
  taken = [],
}: {
  value: string;
  onChange: (color: string) => void;
  taken?: string[];
}) {
  return (
    <fieldset>
      <legend className="field-label">Your card color</legend>
      <div className="color-picker">
        {playerColors.map((color) => (
          <label key={color.value} className="color-choice">
            <input
              type="radio"
              name="color"
              value={color.value}
              checked={value === color.value && !taken.includes(color.value)}
              onChange={() => onChange(color.value)}
              disabled={taken.includes(color.value)}
              required
            />
            <span
              className="color-swatch"
              style={{ background: color.background }}
            />
            <span>{color.label}</span>
            {taken.includes(color.value) && <small>Taken</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
