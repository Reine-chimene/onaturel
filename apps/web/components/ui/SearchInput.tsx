type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

export function SearchInput({
  id = "on-search",
  value,
  onChange,
  placeholder = "Rechercher",
  label = "Recherche",
}: Props) {
  return (
    <div className="on-search">
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
