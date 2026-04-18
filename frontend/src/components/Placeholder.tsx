interface PlaceholderProps {
  name: string;
}

export default function Placeholder({ name }: PlaceholderProps) {
  return (
    <div className="min-h-full flex items-center justify-center py-16">
      <h1
        className="text-4xl font-sans font-medium tracking-tight"
        style={{ color: 'var(--white)' }}
      >
        {name}
      </h1>
    </div>
  );
}
