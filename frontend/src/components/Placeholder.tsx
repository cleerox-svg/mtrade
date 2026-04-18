interface PlaceholderProps {
  name: string;
}

export default function Placeholder({ name }: PlaceholderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f]">
      <h1 className="text-white text-4xl font-sans font-medium tracking-tight">{name}</h1>
    </div>
  );
}
