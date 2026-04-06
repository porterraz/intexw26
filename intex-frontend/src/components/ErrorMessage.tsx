export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
      {message}
    </div>
  )
}

