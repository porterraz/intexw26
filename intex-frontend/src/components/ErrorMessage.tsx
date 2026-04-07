export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent-dark">
      {message}
    </div>
  )
}

